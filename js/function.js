import { dom, store } from './state.js'

export const noResultsLayout = document.createElement('li')
noResultsLayout.classList.add('no-results-layout')
noResultsLayout.textContent = 'No Results...'
noResultsLayout.style.display = 'none'

const {
    searchTrackBar,
    userPlaylist,
    audioFromTrack,
    playPauseTrackButton,
    volumeBar,
    seekBar,
} = dom

export function loadPlaylist() {
    store.isPlaylistLoaded = false
    store.userInteractedEarly = false
    searchTrackBar.value = ''

    store.loadToken++
    store.preloadToken++

    store.tracks = []
    store.trackMetadata = []

    userPlaylist.innerHTML = ''
    userPlaylist.appendChild(noResultsLayout)

    const tx = store.playlistDB.transaction('tracks', 'readonly')
    const trackStore = tx.objectStore('tracks')

    trackStore.openCursor().onsuccess = event => {
        const cursor = event.target.result
        if (cursor) {
            const track = cursor.value
            store.tracks.push({
                id: track.id,
                name: track.name.replace(/\.(mp3|mp4)$/i, ''),
                type: track.type,
            })

            const li = document.createElement('li')
            li.textContent = track.name.replace(/\.(mp3|mp4)$/i, '')
            li.onclick = () => playSongById(track.id)

            const wrap = document.createElement('div')
            wrap.className = 'delete-button-wrapper'

            const deleteButton = document.createElement('button')
            deleteButton.textContent = '✖'
            deleteButton.className = 'delete-button'
            deleteButton.onclick = event => deleteSong(event, track.id)

            wrap.appendChild(deleteButton)
            li.appendChild(wrap)

            userPlaylist.appendChild(li)
            store.trackMetadata.push(li)
            cursor.continue()
        } else {
            restoreLastSong()
            store.isPlaylistLoaded = true

            if (searchTrackBar.value.length > 0) {
                const inputEvent = new Event('input')
                searchTrackBar.dispatchEvent(inputEvent)
            }
        }
    }
}

export function saveSong(file) {
    return new Promise(resolve => {
        const tx = store.playlistDB.transaction('tracks', 'readwrite')
        const trackStore = tx.objectStore('tracks')
        const checkRequest = trackStore.getAll()

        checkRequest.onsuccess = () => {
            if (checkRequest.result.some(s => s.name === file.name))
                return resolve()

            trackStore.add({
                name: file.name,
                data: file,
                type: file.type,
            })

            tx.oncomplete = resolve
        }
    })
}

export function getSongData(id) {
    return new Promise(resolve => {
        const tx = store.playlistDB.transaction('tracks', 'readonly')
        const trackStore = tx.objectStore('tracks')
        const request = trackStore.get(id)

        request.onsuccess = event => resolve(event.target.result)
        request.onerror = () => resolve(null)
    })
}

export function playSongById(id) {
    store.userInteractedEarly = true
    const index = store.tracks.findIndex(t => t.id === id)
    if (index !== -1) {
        playSong(index)
        console.log('Playing:', store.tracks[index].name)
    }
}

export function restoreLastSong() {
    if (store.userInteractedEarly) return
    const savedIndex = Number(localStorage.getItem('lastSongIndex'))
    if (!Number.isNaN(savedIndex) && savedIndex >= 0 && savedIndex < store.tracks.length)
        playSong(savedIndex)
}

export async function playSong(index) {
    const token = ++store.loadToken
    const meta = store.tracks[index]
    if (!meta) return

    audioFromTrack.pause()
    audioFromTrack.removeAttribute('src')
    audioFromTrack.load()

    if (token !== store.loadToken) return

    const track = await getSongData(meta.id)
    if (!track?.data) {
        console.log('Invalid Audio Data')
        return
    }

    if (store.currentTrackURL) URL.revokeObjectURL(store.currentTrackURL)

    const blob = track.data instanceof Blob ? track.data : new Blob([track.data], { type: meta.type })
    const savedSeek = Number(localStorage.getItem('seek_track_' + meta.id))
    if (!Number.isNaN(savedSeek)) audioFromTrack.currentTime = savedSeek

    store.currentTrackURL = URL.createObjectURL(blob)
    audioFromTrack.src = store.currentTrackURL
    audioFromTrack.play().catch(() => {})

    store.currentTrackIndex = index
    playPauseTrackButton.textContent = '❚❚'

    const savedVolumeStr = localStorage.getItem('volume_track_' + meta.id)
    if (savedVolumeStr === null) {
        const globalVolume = Number(localStorage.getItem('volumeLevel')) || 0.5
        audioFromTrack.volume = globalVolume
        volumeBar.value = globalVolume * 10
    } else {
        const savedSongVolume = Number(savedVolumeStr)
        audioFromTrack.volume = savedSongVolume
        volumeBar.value = savedSongVolume * 10
    }

    const name = meta.name.replace(/\.(mp3|mp4)$/i, '')
    document.title = name
    document.getElementById('trackNameWrapper').textContent = name
    localStorage.setItem('lastSongIndex', index)

    store.trackMetadata.forEach(item => item.classList.remove('active-track'))
    if (store.trackMetadata[index]) store.trackMetadata[index].classList.add('active-track')

    preloadNext()
    updateUI()
}

export function preloadNext() {
    const token = ++store.preloadToken
    if (store.tracks.length < 2) return

    const nextIndex = (store.currentTrackIndex + 1) % store.tracks.length
    const nextMeta = store.tracks[nextIndex]

    getSongData(nextMeta.id).then(track => {
        if (token !== store.preloadToken || !track?.data) return

        if (store.nextTrackURL) URL.revokeObjectURL(store.nextTrackURL)

        try {
            const blob = track.data instanceof Blob ? track.data : new Blob([track.data], { type: nextMeta.type })
            store.nextTrackURL = URL.createObjectURL(blob)
        } catch (error) {
            console.error('Preload Error:', error)
            store.nextTrackURL = null
        }
    })
}

export function deleteSong(event, id) {
    event.stopPropagation()

    const indexToDelete = store.tracks.findIndex(t => t.id === id)
    if (indexToDelete === -1) return

    const isCurrent = indexToDelete === store.currentTrackIndex
    if (!confirm('Delete This Song?')) return

    const tx = store.playlistDB.transaction('tracks', 'readwrite')
    tx.objectStore('tracks').delete(id)

    tx.oncomplete = () => {
        if (store.currentTrackURL) {
            URL.revokeObjectURL(store.currentTrackURL)
            store.currentTrackURL = null
        }

        if (store.nextTrackURL) {
            URL.revokeObjectURL(store.nextTrackURL)
            store.nextTrackURL = null
        }

        if (isCurrent && store.tracks.length > 1) {
            const nextIndex = indexToDelete >= store.tracks.length - 1 ? 0 : indexToDelete
            loadPlaylist()
            setTimeout(() => playSong(nextIndex), 50)
        } else {
            audioFromTrack.pause()
            audioFromTrack.src = ''
            store.currentTrackIndex = -1
            loadPlaylist()
        }
    }
}

export function updateUI() {
    const meta = store.tracks[store.currentTrackIndex]
    if (!meta) return

    const name = meta.name.replace(/\.(mp3|mp4)$/i, '')
    document.title = name
    document.getElementById('trackNameWrapper').textContent = name

    store.trackMetadata.forEach(item => item.classList.remove('active-track'))
    if (store.trackMetadata[store.currentTrackIndex]) store.trackMetadata[store.currentTrackIndex].classList.add('active-track')

    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            dom.playPreviousTrackButton.click()
            console.log('Playing Previous Track:', store.tracks[(store.currentTrackIndex - 1 + store.tracks.length) % store.tracks.length].name)
        })

        navigator.mediaSession.setActionHandler('play', () => {
            audioFromTrack.play()
            playPauseTrackButton.textContent = '❚❚'
            console.log('Playing Track:', store.tracks[store.currentTrackIndex]?.name || 'Unknown')
        })

        navigator.mediaSession.setActionHandler('pause', () => {
            audioFromTrack.pause()
            playPauseTrackButton.textContent = '▶︎'
            console.log('Pausing Track:', store.tracks[store.currentTrackIndex]?.name || 'Unknown')
        })

        navigator.mediaSession.setActionHandler('nexttrack', () => {
            dom.playNextTrackButton.click()
            console.log('Playing Next Track:', store.tracks[(store.currentTrackIndex + 1) % store.tracks.length].name)
        })
    }
}
import { dom, store } from './stateExport.js'

export const noResultsLayout = document.createElement('li')
noResultsLayout.classList.add('no-results-layout')
noResultsLayout.textContent = 'No Results...'
noResultsLayout.style.display = 'none'

const 
{
    searchTrackBar,
    userPlaylistLayout,
    audioFromTrack,
    playPauseTrackButton,
    volumeBar,
} = dom

export function loadPlaylist() 
{
    searchTrackBar.value = ''

    store.tracks = []
    store.trackMetadata = []

    store.loadToken++
    store.preloadToken++

    store.isPlaylistLoaded = false
    store.userInteractedEarly = false

    userPlaylistLayout.innerHTML = ''
    userPlaylistLayout.appendChild(noResultsLayout)

    const transaction = store.playlistDB.transaction('tracks', 'readonly')
    const trackStore = transaction.objectStore('tracks')

    trackStore.openCursor().onsuccess = event => 
    {
        const cursor = event.target.result
        if (cursor) 
        {
            const track = cursor.value
            store.tracks.push ({
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

            userPlaylistLayout.appendChild(li)
            store.trackMetadata.push(li)

            cursor.continue()  
        } 
        
        else 
        {
            restoreLastSong()
            store.isPlaylistLoaded = true

            if (searchTrackBar.value.length > 0) 
            {
                const inputEvent = new Event('input')
                searchTrackBar.dispatchEvent(inputEvent)
            }
        }
    }
}

export function saveSong(file) 
{
    return new Promise(resolve => 
    {
        const transaction = store.playlistDB.transaction('tracks', 'readwrite')
        const trackStore = transaction.objectStore('tracks')
        const checkRequest = trackStore.getAll()

        checkRequest.onsuccess = () => 
        {
            if (checkRequest.result.some(t => t.name === file.name))
                return resolve()

            trackStore.add ({
                name: file.name,
                data: file,
                type: file.type,
            })

            transaction.oncomplete = resolve
        }
    })
}

export function getSongData(id) 
{
    return new Promise(resolve => 
    {
        const transaction = store.playlistDB.transaction('tracks', 'readonly')
        const trackStore = transaction.objectStore('tracks')
        const request = trackStore.get(id)

        request.onsuccess = event => resolve(event.target.result)
        request.onerror = () => resolve(null)
    })
}

export function playSongById(id) 
{
    store.userInteractedEarly = true

    const index = store.tracks.findIndex(t => t.id === id)
    if (index !== -1) 
    {
        playSong(index)
        console.log('Playing:', store.tracks[index].name)
    }
}

export function restoreLastSong() 
{
    if (store.userInteractedEarly) 
        return

    const savedIndex = Number(localStorage.getItem('lastSongIndex'))
    if (!Number.isNaN(savedIndex) && savedIndex >= 0 && savedIndex < store.tracks.length)
    {
        playSong(savedIndex)
        console.log('Restoring Last Played Song:', store.tracks[savedIndex].name)
    }
}

export async function playSong(index) 
{
    const token = ++store.loadToken
    const meta = store.tracks[index]

    if (!meta) 
        return

    audioFromTrack.pause()
    audioFromTrack.removeAttribute('src')
    audioFromTrack.load()

    if (token !== store.loadToken) 
        return

    const track = await getSongData(meta.id)
    if (!track?.data) 
    {
        console.log('Invalid Audio Data!')
        return
    }

    if (store.currentTrackURL) 
        URL.revokeObjectURL(store.currentTrackURL)

    const blob = track.data instanceof Blob 
        ? track.data 
        : new Blob([track.data], { type: meta.type })

    const savedSeek = Number(localStorage.getItem('seek_track_' + meta.id))
    if (!Number.isNaN(savedSeek)) 
        audioFromTrack.currentTime = savedSeek

    store.currentTrackURL = URL.createObjectURL(blob)
    audioFromTrack.src = store.currentTrackURL
    audioFromTrack.play().catch(() => {})

    store.currentTrackIndex = index
    playPauseTrackButton.textContent = '❚❚'

    const savedVolumeStr = localStorage.getItem('volume_track_' + meta.id)
    if (savedVolumeStr === null) 
    {
        const globalVolume = Number(localStorage.getItem('volumeLevel')) || 0.5
        audioFromTrack.volume = globalVolume
        volumeBar.value = globalVolume * 10
    } 
    
    else 
    {
        const savedSongVolume = Number(savedVolumeStr)
        audioFromTrack.volume = savedSongVolume
        volumeBar.value = savedSongVolume * 10
    }

    const name = meta.name.replace(/\.(mp3|mp4)$/i, '')
    document.title = name
    document.getElementById('trackNameWrapper').textContent = name
    localStorage.setItem('lastSongIndex', index)

    store.trackMetadata.forEach(item => item.classList.remove('active-track'))
    if (store.trackMetadata[index]) 
        store.trackMetadata[index].classList.add('active-track')

    preloadNext()
    updateUI()
}

export function preloadNext() 
{
    if (store.tracks.length < 2) 
        return

    const token = ++store.preloadToken
    const nextIndex = (store.currentTrackIndex + 1) % store.tracks.length
    const nextMeta = store.tracks[nextIndex]

    getSongData(nextMeta.id).then(track => 
    {
        if (token !== store.preloadToken || !track?.data) 
            return

        if (store.nextTrackURL) 
            URL.revokeObjectURL(store.nextTrackURL)

        try 
        {
            const blob = track.data instanceof Blob 
                ? track.data 
                : new Blob([track.data], { type: nextMeta.type })

            store.nextTrackURL = URL.createObjectURL(blob)
        } 
        
        catch (error) 
        {
            store.nextTrackURL = null
            console.error('Preload Error:', error)
        }
    })
}

export function deleteSong(event, id) 
{
    event.stopPropagation()

    const indexToDelete = store.tracks.findIndex(t => t.id === id)
    if (indexToDelete === -1) 
        return

    const isCurrent = indexToDelete === store.currentTrackIndex
    if (!confirm('Delete This Song?'))
        return

    const transaction = store.playlistDB.transaction('tracks', 'readwrite')
    transaction.objectStore('tracks').delete(id)
    transaction.oncomplete = () => 
    {
        if (store.currentTrackURL) 
        {
            URL.revokeObjectURL(store.currentTrackURL)
            store.currentTrackURL = null
        }

        if (store.nextTrackURL) 
        {
            URL.revokeObjectURL(store.nextTrackURL)
            store.nextTrackURL = null
        }

        if (isCurrent && store.tracks.length > 1) 
        {
            const nextIndex = indexToDelete >= store.tracks.length - 1 
                ? 0 
                : indexToDelete

            loadPlaylist()
            setTimeout(() => playSong(nextIndex), 50)
        } 
        
        else 
        {
            audioFromTrack.pause()
            audioFromTrack.src = ''

            store.currentTrackIndex = -1
            loadPlaylist()
        }
    }
}

function clampCardToScreen() 
{
    const controls = document.querySelector('.user-controls-layout');
    const rect = controls.getBoundingClientRect();

    let newLeft = rect.left;
    let newTop = rect.top;

    if (rect.left < 0) 
        newLeft = 0;

    if (rect.top < 0) 
        newTop = 0;

    if (rect.right > window.innerWidth) 
        newLeft = window.innerWidth - rect.width;

    if (rect.bottom > window.innerHeight) 
        newTop = window.innerHeight - rect.height;

    controls.style.left = newLeft + "px";
    controls.style.top = newTop + "px";

    localStorage.setItem("controlsPos", JSON.stringify ({
        left: controls.style.left,
        top: controls.style.top
    }))
}

window.addEventListener('resize', clampCardToScreen)
window.addEventListener('load', clampCardToScreen)

store.volumeBeforeMute = store.volumeBeforeMute ?? audioFromTrack.volume
document.addEventListener('keydown', event =>
{
    if (event.target.matches('input, textarea, [contenteditable="true"]')) 
        return

    if (event.key === 'ArrowUp') 
    {
        event.preventDefault()

        let newSeek = audioFromTrack.currentTime + 5
        if (newSeek > audioFromTrack.duration) 
            newSeek = audioFromTrack.duration

        audioFromTrack.currentTime = newSeek
        seekBar.value = newSeek

        console.log('Seek Forward (Keyboard):', Math.round(newSeek) + 's')
    } 
    
    else if (event.key === 'ArrowDown') 
    {
        event.preventDefault()

        let newSeek = audioFromTrack.currentTime - 5
        if (newSeek < 0) 
            newSeek = 0
        
        audioFromTrack.currentTime = newSeek
        seekBar.value = newSeek

        console.log('Seek Backward (Keyboard):', Math.round(newSeek) + 's')
    }

    else if (event.key === 'ArrowLeft')
    {
        event.preventDefault()
        dom.playPreviousTrackButton.click()

        console.log('Playing Previous Track:', store.tracks[(store.currentTrackIndex - 1 + store.tracks.length) % store.tracks.length].name)
    }

    else if (event.key === 'ArrowRight')
    {
        event.preventDefault()
        dom.playNextTrackButton.click()

        console.log('Playing Next Track:', store.tracks[(store.currentTrackIndex + 1) % store.tracks.length].name)
    }

    else if (event.code === 'Space')
    {
        event.preventDefault()

        if (audioFromTrack.paused)
        {
            audioFromTrack.play()
            playPauseTrackButton.textContent = '❚❚'

            console.log('Playing Track:', store.tracks[store.currentTrackIndex]?.name || 'Unknown')
        }

        else
        {
            audioFromTrack.pause()
            playPauseTrackButton.textContent = '▶︎'

            console.log('Pausing Track:', store.tracks[store.currentTrackIndex]?.name || 'Unknown')
        }
    }

    else if (event.key === 'M' || event.key === 'm')
    {
        event.preventDefault()

        if (audioFromTrack.volume > 0)
        {
            store.volumeBeforeMute = audioFromTrack.volume

            audioFromTrack.volume = 0
            volumeBar.value = 0

            console.log('Muted')
        }
        else
        {
            const restored = store.volumeBeforeMute ?? 
            Number(localStorage.getItem('volume_track_' + store.tracks[store.currentTrackIndex]?.id))

            audioFromTrack.volume = restored
            volumeBar.value = restored * 10

            console.log('Unmuted, Volume Restored to:', restored)
        }
    }
})

export function updateUI() 
{
    const meta = store.tracks[store.currentTrackIndex]
    if (!meta) 
        return

    const name = meta.name.replace(/\.(mp3|mp4)$/i, '')
    document.title = name
    document.getElementById('trackNameWrapper').textContent = name

    store.trackMetadata.forEach(item => item.classList.remove('active-track'))
    if (store.trackMetadata[store.currentTrackIndex]) 
        store.trackMetadata[store.currentTrackIndex].classList.add('active-track')

    if ('mediaSession' in navigator) 
    {
        navigator.mediaSession.setActionHandler('previoustrack', () => 
        {
            dom.playPreviousTrackButton.click()
            console.log('Playing Previous Track:', store.tracks[(store.currentTrackIndex - 1 + store.tracks.length) % store.tracks.length].name)
        })

        navigator.mediaSession.setActionHandler('play', () => 
        {
            audioFromTrack.play()
            playPauseTrackButton.textContent = '❚❚'
            console.log('Playing Track:', store.tracks[store.currentTrackIndex]?.name || 'Unknown')
        })

        navigator.mediaSession.setActionHandler('pause', () => 
        {
            audioFromTrack.pause()
            playPauseTrackButton.textContent = '▶︎'
            console.log('Pausing Track:', store.tracks[store.currentTrackIndex]?.name || 'Unknown')
        })

        navigator.mediaSession.setActionHandler('nexttrack', () => 
        {
            dom.playNextTrackButton.click()
            console.log('Playing Next Track:', store.tracks[(store.currentTrackIndex + 1) % store.tracks.length].name)
        })
    }
}
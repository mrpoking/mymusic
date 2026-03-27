const requestDB = indexedDB.open('playlistDB', 2)
requestDB.onerror = event => 
    console.log('IndexedDB Error:', event.target.error)

requestDB.onupgradeneeded = event => 
{
    playlistDB = event.target.result
    if (!playlistDB.objectStoreNames.contains('tracks'))
        playlistDB.createObjectStore('tracks', { keyPath: 'id', autoIncrement: true })
}

requestDB.onsuccess = event => 
{
    playlistDB = event.target.result
    if (!playlistDB.objectStoreNames.contains('tracks'))
    {
        console.error('Tracks Object Store Not Found!')
        return
    }

    loadPlaylist()
}

const noResultsLayout = document.createElement('li')
noResultsLayout.classList.add('no-results-layout')
noResultsLayout.textContent = 'No Results...'
noResultsLayout.style.display = 'none'

searchTrackBar.addEventListener('input', () => 
{
    if (!isPlaylistLoaded) return;

    clearTimeout(searchTrackTimeout)
    
    const searchValue = searchTrackBar.value.toLowerCase()
    searchTrackTimeout = setTimeout(() =>
    {
        if (!isPlaylistLoaded)
        {
            noResultsLayout.style.display = 
            (searchValue.length > 0) ? '' : 'none'
            return
        }

        if (searchValue.length < 2)
        {
            trackMetadata.forEach(item => item.style.display = '')
            noResultsLayout.style.display = 'none'
            return
        }

        trackMetadata.forEach((item, index) => 
        {
            const trackName = tracks[index].name.toLowerCase()
            const trackMatch = trackName.includes(searchValue)

            item.style.display = trackMatch ? '' : 'none'
            if (trackMatch) 
                isTrackFound = true
        })

        noResultsLayout.style.display = isTrackFound ? 'none' : ''
    }, 200)
})

const validFileTypes = new Set(['audio/mpeg', 'audio/mp4'])
uploadTrack.addEventListener('change', async event => 
{
    const files = Array.from(event.target.files)
    for (let file of files) 
    {
        if (!validFileTypes.has(file.type))
        {
            console.log(`Unsupported File Type: ${file.type} (${file.name})`)
            alert(`Invalid File Type: ${file.type}, (${file.name})`)
            continue
        }

        await saveSong(file)
    }

    loadPlaylist()
})

function loadPlaylist() 
{
    isPlaylistLoaded = false
    userInteractedEarly = false
    searchTrackBar.value = ''

    loadToken++
    preloadToken++

    tracks = []
    trackMetadata = []

    userPlaylist.innerHTML = ''
    userPlaylist.appendChild(noResultsLayout)

    const tx = playlistDB.transaction('tracks', 'readonly')
    const store = tx.objectStore('tracks')

    store.openCursor().onsuccess = event => 
    {
        const cursor = event.target.result
        if (cursor)
        {
            const track = cursor.value
            tracks.push ({
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
            trackMetadata.push(li)

            cursor.continue()
        }

        else 
        {
            restoreLastSong()
            isPlaylistLoaded = true

            if (searchTrackBar.value.length > 0) 
            {
                const event = new Event('input')
                searchTrackBar.dispatchEvent(event)
            }
        }
    }
}

function saveSong(file) 
{
    return new Promise(resolve => 
    {
        const tx = playlistDB.transaction('tracks', 'readwrite')
        const store = tx.objectStore('tracks')
        const checkRequest = store.getAll()

        checkRequest.onsuccess = () =>
        {
            if (checkRequest.result.some(s => s.name === file.name))
                return resolve()

            store.add ({
                name: file.name,
                data: file,
                type: file.type,
            })

            tx.oncomplete = resolve
        }
    })
}

function getSongData(id)
{
    return new Promise(resolve => 
    {
        const tx = playlistDB.transaction('tracks', 'readonly')
        const store = tx.objectStore('tracks')
        const requests = store.get(id)

        requests.onsuccess = event => resolve(event.target.result)
        requests.onerror = () => resolve(null)
    })
}

function playSongById(id)
{
    userInteractedEarly = true

    const index = tracks.findIndex(t => t.id === id)
    if (index !== -1)
    {
        playSong(index)
        console.log('Playing:', tracks[index].name)
    }
}

function restoreLastSong()
{
    if (userInteractedEarly) 
        return

    const savedIndex = Number(localStorage.getItem('lastSongIndex'))
    if (!Number.isNaN(savedIndex) && savedIndex >= 0 && savedIndex < tracks.length)
        playSong(savedIndex)
}

async function playSong(index) 
{
    const token = ++loadToken
    const meta = tracks[index]

    if (!meta) 
        return

    audioFromTrack.pause()
    audioFromTrack.removeAttribute('src')
    audioFromTrack.load()

    if (token !== loadToken) 
        return

    const track = await getSongData(meta.id)
    if (!track?.data)
    {
        console.log('Invalid Audio Data')
        return
    }

    if (currentTrackURL)
        URL.revokeObjectURL(currentTrackURL)

    const blob = track.data instanceof Blob
        ? track.data
        : new Blob([track.data], { type: meta.type })

    const savedSeek = 
    Number(localStorage.getItem('seek_track_' + meta.id))
    if (!Number.isNaN(savedSeek))
        audioFromTrack.currentTime = savedSeek

    currentTrackURL = URL.createObjectURL(blob)

    audioFromTrack.src = currentTrackURL
    audioFromTrack.play().catch(() => {})

    currentTrackIndex = index
    playPauseTrackButton.textContent = '❚❚'

    const savedVolumeStr = localStorage.getItem('volume_track_' + meta.id);
    if (savedVolumeStr === null) 
    {
        const globalVolume = Number(localStorage.getItem('volumeLevel')) || 0.5;
        audioFromTrack.volume = globalVolume;
        volumeBar.value = globalVolume * 10;
    } 
    
    else 
    {
        const savedSongVolume = Number(savedVolumeStr);
        audioFromTrack.volume = savedSongVolume;
        volumeBar.value = savedSongVolume * 10;
    }

    const name = meta.name.replace(/\.(mp3|mp4)$/i, '')
    document.title = name
    document.getElementById('trackNameWrapper').textContent = name

    localStorage.setItem('lastSongIndex', index)

    trackMetadata.forEach(item => item.classList.remove('blue-border'))
    if(trackMetadata[index]) 
        trackMetadata[index].classList.add('blue-border')

    preloadNext()
    updateUI()
}

function preloadNext()
{
    const token = ++preloadToken

    if (tracks.length < 2) return

    const nextIndex = (currentTrackIndex + 1) % tracks.length
    const nextMeta = tracks[nextIndex]

    getSongData(nextMeta.id).then(track => 
    {
        if (token !== preloadToken || !track?.data) 
            return

        if (nextTrackURL)
            URL.revokeObjectURL(nextTrackURL)

        try
        {
            const blob = track?.data instanceof Blob
                ? track.data
                : new Blob([track.data], { type: nextMeta.type })

            nextTrackURL = URL.createObjectURL(blob)
        }
        
        catch (error)
        {
            console.error('Preload Error:', error)
            nextTrackURL = null
        }
    })
}

function deleteSong(event, id) 
{
    event.stopPropagation()

    const indexToDelete = tracks.findIndex(t => t.id === id)
    if (indexToDelete === -1) 
        return

    const isCurrent = indexToDelete === currentTrackIndex
    if (!confirm('Delete This Song?')) 
        return

    const tx = playlistDB.transaction('tracks', 'readwrite')
    tx.objectStore('tracks').delete(id)

    tx.oncomplete = () =>
    {
        if (currentTrackURL)
        {
            URL.revokeObjectURL(currentTrackURL)
            currentTrackURL = null
        }

        if (nextTrackURL)
        {
            URL.revokeObjectURL(nextTrackURL)
            nextTrackURL = null
        }

        if (isCurrent && tracks.length > 1)
        {
            const nextIndex = indexToDelete >= tracks.length - 1
                ? 0
                : indexToDelete

            loadPlaylist()
            setTimeout(() => playSong(nextIndex), 50)
        }

        else
        {
            audioFromTrack.pause()
            audio.src = ''
            currentTrackIndex = -1
            loadPlaylist()
        }
    }
}

playPreviousTrackButton.addEventListener('click', () => 
{
    if (tracks.length === 0) return

    let previousIndex = currentTrackIndex -1
    if (previousIndex < 0) 
        previousIndex = tracks.length - 1

    playSong(previousIndex)
    console.log('Playing Previous Track:', tracks[previousIndex].name)
})

playPauseTrackButton.addEventListener('click', () => 
{
    if (audioFromTrack.paused) 
    {
        audioFromTrack.play().catch(() => {})
        playPauseTrackButton.textContent = '❚❚'
        console.log('Playing Track:', tracks[currentTrackIndex]?.name || 'Unknown')
    } 

    else 
    {
        audioFromTrack.pause()
        playPauseTrackButton.textContent = '▶︎'
        console.log('Pausing Track:', tracks[currentTrackIndex]?.name || 'Unknown')
    }
})

playNextTrackButton.addEventListener('click', () =>
{
    if (tracks.length === 0) return

    const nextIndex = (currentTrackIndex + 1) % tracks.length
    playSong(nextIndex)
    console.log('Playing Next Track:', tracks[nextIndex].name)
})

audioFromTrack.addEventListener('ended', () => 
{
    localStorage.setItem('seek_track_' + tracks[currentTrackIndex].id, 0)

    if (!tracks.length) 
        return

    const nextIndex = (currentTrackIndex + 1) % tracks.length
    if (nextTrackURL)
    {
        if (!nextTrackURL.startsWith('blob:')) 
            return

        currentTrackIndex = nextIndex

        if (currentTrackURL)
            URL.revokeObjectURL(currentTrackURL)

        currentTrackURL = nextTrackURL
        nextTrackURL = null

        audioFromTrack.src = currentTrackURL
        audioFromTrack.play().catch(() => {})

        updateUI()
        preloadNext()
    }

    else
    {
        playSong(nextIndex)
    }
})

audioFromTrack.addEventListener('timeupdate', () => 
{
    if (!Number.isNaN(audioFromTrack.duration)) 
    {
        seekBar.max = audioFromTrack.duration
        seekBar.value = audioFromTrack.currentTime

        if (currentTrackIndex !== -1 && tracks[currentTrackIndex])
        {
            const track = tracks[currentTrackIndex]
            localStorage.setItem('seek_track_' + track.id, audioFromTrack.currentTime)
        }
    }
})

seekBar.addEventListener('input', () => 
{
    audioFromTrack.currentTime = seekBar.value
})

const savedVolume = Number(localStorage.getItem('volumeLevel')) || 0.5
audioFromTrack.volume = savedVolume
volumeBar.value = savedVolume * 10

volumeBar.addEventListener('input', () => 
{
    const value = Math.max(0, Math.min(1, Number(volumeBar.value) / 10))
    audioFromTrack.volume = value;

    if (currentTrackIndex !== -1 && tracks[currentTrackIndex])
    {
        const track = tracks[currentTrackIndex]
        localStorage.setItem('volume_track_' + track.id, value)
    }

    else
    {
        localStorage.setItem('volumeLevel', value);
    }
})

audioFromTrack.addEventListener('error', () => 
{
    const err = audioFromTrack.error

    if (!err) return
    if (err.code === 1) return

    console.log('Audio Error:', err)
})

function updateUI()
{
    const meta = tracks[currentTrackIndex]
    const name = meta.name.replace(/\.(mp3|mp4)$/i, '')

    document.title = name
    document.getElementById('trackNameWrapper').textContent = name

    trackMetadata.forEach(item => item.classList.remove('blue-border'))
    if (trackMetadata[currentTrackIndex])
        trackMetadata[currentTrackIndex].classList.add('blue-border')

    if ('mediaSession' in navigator) 
    {
        navigator.mediaSession.setActionHandler('previoustrack', () => 
        {
            playPreviousTrackButton.click();
            console.log('Playing Previous Track:', tracks[(currentTrackIndex - 1 + tracks.length) % tracks.length].name)
        })

        navigator.mediaSession.setActionHandler('play', () => 
        {
            audioFromTrack.play();
            playPauseTrackButton.textContent = '❚❚';
            console.log('Playing Track:', tracks[currentTrackIndex]?.name || 'Unknown')
        })

        navigator.mediaSession.setActionHandler('pause', () => 
        {
            audioFromTrack.pause();
            playPauseTrackButton.textContent = '▶︎';
            console.log('Pausing Track:', tracks[currentTrackIndex]?.name || 'Unknown')
        })

        navigator.mediaSession.setActionHandler('nexttrack', () => 
        {
            playNextTrackButton.click();
            console.log('Playing Next Track:', tracks[(currentTrackIndex + 1) % tracks.length].name)
        })
    }
}
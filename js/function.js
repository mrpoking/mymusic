const fileInput = document.getElementById('file-input')
const audio = document.getElementById('audio')
const previousButton = document.getElementById('previousButton')
const playPauseButton = document.getElementById('playPauseButton')
const nextButton = document.getElementById('nextButton')
const seekBar = document.getElementById('seekBar')
const volumeBar = document.getElementById('volumeBar')
const playList = document.getElementById('playList')

let songs = []
let songItems = []
let currentSongIndex = -1
let currentAudioURL = null
let nextAudioURL = null

let db
let loadToken = 0
let preloadToken = 0
let userInteracted = false

const request = indexedDB.open('MusicDB', 1)

request.onerror = e => console.log('IndexedDB Error:', e.target.error)

request.onupgradeneeded = e => 
{
    db = e.target.result
    if (!db.objectStoreNames.contains('songs'))
        db.createObjectStore('songs', {keyPath: 'id', autoIncrement: true})
}

request.onsuccess = e => 
{
    db = e.target.result
    loadPlaylist()
}

fileInput.addEventListener('change', async e => 
{
    const files = Array.from(e.target.files)

    for (let file of files) 
        await saveSong(file)

    loadPlaylist()
})

function saveSong(file) 
{
    return new Promise(resolve => 
    {
        const tx = db.transaction('songs', 'readwrite')
        const store = tx.objectStore('songs')
        
        const checkRequest = store.getAll()

        checkRequest.onsuccess = () =>
        {
            if (checkRequest.result.some(s => s.name === file.name))
                return resolve()

            store.add ({
                name: file.name,
                data: file,
                type: file.type
            })

            tx.oncomplete = resolve
        }
    })
}

function loadPlaylist() 
{
    userInteracted = false

    loadToken++
    preloadToken++

    songs = []
    songItems = []

    playList.innerHTML = ''

    const tx = db.transaction('songs', 'readonly')
    const store = tx.objectStore('songs')

    store.openCursor().onsuccess = e => 
    {
        const cursor = e.target.result

        if (cursor)
        {
            const song = cursor.value
            
            songs.push ({
                id: song.id, 
                name: song.name,
                type: song.type
            })

            const li = document.createElement('li')
            li.textContent = song.name.replace(/\.(mp3|mp4)$/i, '')
            li.onclick = () => playSongById(song.id)

            const wrap = document.createElement('div')
            wrap.className = 'wrap-wrapper'

            const deleteButton = document.createElement('button')
            deleteButton.textContent = '✖'
            deleteButton.className = 'deletebutton-li'
            deleteButton.onclick = ev => deleteSong(ev, song.id)

            wrap.appendChild(deleteButton)
            li.appendChild(wrap)

            playList.appendChild(li)
            songItems.push(li)

            cursor.continue()
        }

        else 
        {
            restoreLastSong()
        }
    }
}

function playSongById(id)
{
    userInteracted = true

    const index = songs.findIndex(s => s.id === id)

    if (index !== -1)
        playSong(index)
}

function restoreLastSong()
{
    if (userInteracted) return

    const savedIndex = Number(localStorage.getItem('lastSongIndex'))

    if (!Number.isNaN(savedIndex) && savedIndex >= 0 && savedIndex < songs.length)
        playSong(savedIndex)
}

function getSongData(id)
{
    return new Promise(resolve => 
    {
        const tx = db.transaction('songs', 'readonly')
        const store = tx.objectStore('songs')
        const requests = store.get(id)

        requests.onsuccess = e => resolve(e.target.result)
        requests.onerror = () => resolve(null)
    })
}

async function playSong(index) 
{
    const token = ++loadToken

    const meta = songs[index]
    if (!meta) return

    audio.pause()
    audio.removeAttribute('src')
    audio.load()

    const song = await getSongData(meta.id)

    if (token !== loadToken) return

    if (!song?.data)
    {
        console.log('Invalid Audio Data')
        return
    }

    if (currentAudioURL)
    {
        const oldURL = currentAudioURL

        setTimeout(() => URL.revokeObjectURL(oldURL), 1000)
    }

    const savedSeek = Number(localStorage.getItem('seek_song_' + meta.id))

    if (!Number.isNaN(savedSeek))
        audio.currentTime = savedSeek

    const blob = song.data instanceof Blob
        ? song.data
        : new Blob([song.data], { type: meta.type })

    currentAudioURL = URL.createObjectURL(blob)

    audio.src = currentAudioURL
    audio.play().catch(() => {})

    currentSongIndex = index
    playPauseButton.textContent = '❚❚'

    const savedVolumeStr = localStorage.getItem('volume_song_' + meta.id);

    if (savedVolumeStr === null) 
    {
        const globalVolume = Number(localStorage.getItem('volumeLevel')) || 0.5;
        
        audio.volume = globalVolume;
        volumeBar.value = globalVolume * 10;
    } 
    
    else 
    {
        const savedSongVolume = Number(savedVolumeStr);

        audio.volume = savedSongVolume;
        volumeBar.value = savedSongVolume * 10;
    }

    const name = meta.name.replace(/\.(mp3|mp4)$/i, '')

    document.title = name
    document.getElementById('trackName').textContent = name

    localStorage.setItem('lastSongIndex', index)

    songItems.forEach(item => item.classList.remove('blue-border'))

    if(songItems[index]) 
        songItems[index].classList.add('blue-border')

    preloadNext()
}

function preloadNext()
{
    const token = ++preloadToken

    if (songs.length < 2) return

    const nextIndex = (currentSongIndex + 1) % songs.length
    const nextMeta = songs[nextIndex]

    getSongData(nextMeta.id).then(song => 
    {
        if (token !== preloadToken) 
            return

        if (!song?.data) 
            return

        if (nextAudioURL)
            URL.revokeObjectURL(nextAudioURL)

        try
        {
            const blob = song?.data instanceof Blob
                ? song.data
                : new Blob([song.data], { type: nextMeta.type })

            nextAudioURL = URL.createObjectURL(blob)
        }
        
        catch (error)
        {
            console.error('Preload Error:', error)
            nextAudioURL = null
        }
    })
}

function deleteSong(e, id) 
{
    e.stopPropagation()

    const indexToDelete = songs.findIndex(s => s.id === id)

    if (indexToDelete === -1) return

    const isCurrent = indexToDelete === currentSongIndex

    if (!confirm('Delete This Song?')) return

    const tx = db.transaction('songs', 'readwrite')
    tx.objectStore('songs').delete(id)

    tx.oncomplete = () =>
    {
        if (currentAudioURL)
        {
            URL.revokeObjectURL(currentAudioURL)
            currentAudioURL = null
        }

        if (nextAudioURL)
        {
            URL.revokeObjectURL(nextAudioURL)
            nextAudioURL = null
        }

        if (isCurrent)
        {
            if (songs.length > 1)
            {
                const nextIndex = indexToDelete >= songs.length - 1
                    ? 0
                    : indexToDelete

                loadPlaylist()
                setTimeout(() => playSong(nextIndex), 50)
            }

            else
            {
                audio.pause()
                audio.src = ''
                currentSongIndex = -1
                loadPlaylist()
            }
        }

        else
        {
            loadPlaylist()
        }
    }
}

previousButton.addEventListener('click', () => 
{
    if (songs.length === 0) return

    let previousIndex = currentSongIndex -1

    if (previousIndex < 0) 
        previousIndex = songs.length - 1

    playSong(previousIndex)
})

playPauseButton.addEventListener('click', () => 
{
    if (audio.paused) 
    {
        audio.play().catch(() => {})
        playPauseButton.textContent = '❚❚'
    } 

    else 
    {
        audio.pause()
        playPauseButton.textContent = '▶︎'
    }
})

nextButton.addEventListener('click', () =>
{
    if (songs.length === 0) return

    const nextIndex = (currentSongIndex + 1) % songs.length
    
    playSong(nextIndex)
})

audio.addEventListener('ended', () => 
{
    localStorage.setItem('seek_song_' + songs[currentSongIndex].id, 0)

    if (!songs.length) 
        return

    const nextIndex = (currentSongIndex + 1) % songs.length

    if (nextAudioURL)
    {
        if (!nextAudioURL.startsWith('blob:')) 
            return

        currentSongIndex = nextIndex

        if (currentAudioURL)
            URL.revokeObjectURL(currentAudioURL)

        currentAudioURL = nextAudioURL
        nextAudioURL = null

        audio.src = currentAudioURL
        audio.play().catch(() => {})

        updateUI()
        preloadNext()
    }

    else
    {
        playSong(nextIndex)
    }
})

function updateUI()
{
    const meta = songs[currentSongIndex]
    const name = meta.name.replace(/\.(mp3|mp4)$/i, '')

    document.title = name
    document.getElementById('trackName').textContent = name

    songItems.forEach(item => item.classList.remove('blue-border'))

    if (songItems[currentSongIndex])
        songItems[currentSongIndex].classList.add('blue-border')
}

audio.addEventListener('timeupdate', () => 
{
    if (!Number.isNaN(audio.duration)) 
    {
        seekBar.max = audio.duration
        seekBar.value = audio.currentTime

        if (currentSongIndex !== -1 && songs[currentSongIndex])
        {
            const song = songs[currentSongIndex]

            localStorage.setItem('seek_song_' + song.id, audio.currentTime)
        }
    }
})

seekBar.addEventListener('input', () => 
{
    audio.currentTime = seekBar.value
})

const savedVolume = Number(localStorage.getItem('volumeLevel')) || 0.5

audio.volume = savedVolume
volumeBar.value = savedVolume * 10

volumeBar.addEventListener('input', () => 
{
    const value = Math.max(0, Math.min(1, Number(volumeBar.value) / 10))

    audio.volume = value;

    if (currentSongIndex !== -1 && songs[currentSongIndex])
    {
        const song = songs[currentSongIndex]
        localStorage.setItem('volume_song_' + song.id, value)
    }

    else
    {
        localStorage.setItem('volumeLevel', value);
    }
})

audio.addEventListener('error', () => 
{
    const err = audio.error

    if (!err) return

    if (err.code === 1) return

    console.log('Audio Error:', err)
})
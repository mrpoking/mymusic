const themeIcon = document.getElementById('themeButton')
const darkmodeThemeIcon = '🌙'
const lightmodeThemeIcon = '☀️'

if (!localStorage.getItem('themeMode')) 
    localStorage.setItem('themeMode', 'darkmode')

let themeMode = localStorage.getItem('themeMode') === 'lightmode'
themeIcon.textContent = themeMode ? darkmodeThemeIcon : lightmodeThemeIcon
applyTheme()

themeIcon.addEventListener('click', () => 
{
    themeMode = !themeMode
    themeIcon.textContent = themeMode ? darkmodeThemeIcon : lightmodeThemeIcon
    localStorage.setItem('themeMode', themeMode ? 'lightmode' : 'darkmode')
    applyTheme()
})

function applyTheme() 
{
    const vars = 
    [
        'backgroundcolor-1', 'backgroundcolor-2', 'backgroundcolor-3', 'backgroundcolor-4',
        'backgroundcolor-a', 'backgroundcolor-b', 'backgroundcolor-c',
        'textcolor-1', 'textcolor-2', 'textcolor-3', 'textcolor-4', 'textcolor-a'
    ]

    vars.forEach(i => 
    {
        document.body.style.setProperty(`--${i}`, `var(--${localStorage.getItem('themeMode')}-${i})`)
    })
}

const fileInput = document.getElementById('file-input')
const audio = document.getElementById('audio')

const playPauseButton = document.getElementById('playPauseButton')
const seekBar = document.getElementById('seekBar')
const volumeBar = document.getElementById('volumeBar')
const playList = document.getElementById('playList')

let songs = []
let currentSongIndex = -1
let songItems = []

let currentAudioURL = null

let db
const request = indexedDB.open('MusicDB', 1)

request.onerror = (event) => 
{
    console.log('IndexedDB Error:', event.target.error)
}

request.onupgradeneeded = (event) => 
{
    db = event.target.result
    if (!db.objectStoreNames.contains('songs'))
        db.createObjectStore('songs', {keyPath: 'id', autoIncrement: true})
}

request.onsuccess = (event) => 
{
    db = event.target.result
    loadPlaylist()
}

fileInput.addEventListener('change', async (event) => 
{
    const files = event.target.files
    for (let file of files) 
        saveSong(file)

    loadPlaylist()
})

function saveSong(file) 
{
    return new Promise(resolve => 
    {
        const reader = new FileReader()

        reader.onload = function (e) 
        {
            const transaction = db.transaction(['songs'], 'readwrite')
            const store = transaction.objectStore('songs')

            const checkRequest = store.getAll()
            checkRequest.onsuccess = function ()
            {
                const exists = checkRequest.result.some(song => song.name === file.name)
                if (exists)
                {
                    console.log('Duplicated Skipped', file.name)
                    resolve()
                    return
                }

                store.add ({
                    name: file.name,
                    data: e.target.result,
                    type: file.type
                })

                transaction.oncomplete = resolve
            }
        }

        reader.readAsArrayBuffer(file)
    })
}

function loadPlaylist() 
{
    songs = []
    songItems = []

    playList.innerHTML = ''

    const transaction = db.transaction(['songs'], 'readonly')
    const store = transaction.objectStore('songs')

    store.openCursor().onsuccess = (event) => 
    {
        const cursor = event.target.result
        if (cursor)
        {
            const song = cursor.value
            songs.push(song)
            const index = songs.length - 1

            const li = document.createElement('li')
            li.addEventListener('click', () => playSong(index))
            li.textContent = song.name.replace(/\.(mp3|mp4)$/i, '')
            songItems.push(li)

            const wrap = document.createElement('div')
            wrap.className = 'wrap-wrapper'

            const deleteButton = document.createElement('button')
            deleteButton.textContent = '✖'
            deleteButton.className = 'deletebutton-li'
            deleteButton.onclick = (e) => deleteSong(e, song.id)

            wrap.appendChild(deleteButton)
            li.appendChild(wrap)

            playList.appendChild(li)
            cursor.continue()
        }

        else
        {
            restoreLastSong()
        }
    }
}

function restoreLastSong() 
{
    const lastIndex = localStorage.getItem('lastSongIndex')
    if (lastIndex !== null && songs.length > 0)
    {
        currentSongIndex = Number(lastIndex)

        const song = songs[currentSongIndex]
        const blob = new Blob([song.data], {type: song.type})

        if (currentAudioURL)
            URL.revokeObjectURL(currentAudioURL)

        currentAudioURL = URL.createObjectURL(blob)
        audio.src = currentAudioURL

        songItems[currentSongIndex]?.classList.add('blue-border')
    }
}

function playSong(index) 
{
    const song = songs[index]
    const blob = new Blob([song.data], {type: song.type})

    if (currentAudioURL)
        URL.revokeObjectURL(currentAudioURL)

    currentAudioURL = URL.createObjectURL(blob)

    audio.src = currentAudioURL
    audio.play()

    currentSongIndex = index
    playPauseButton.textContent = '❚❚'

    document.title = song.name.replace(/\.(mp3|mp4)$/i, '')
    document.getElementById('trackName').textContent = song.name.replace(/\.(mp3|mp4)$/i, '')

    localStorage.setItem('lastSongIndex', index)

    songItems.forEach(item => item.classList.remove('blue-border'))
    if (songItems[index])
        songItems[index].classList.add('blue-border')

    const savedVolume = localStorage.getItem('volume_song_' + song.id)
    const globalVolume = localStorage.getItem('volumeLevel') || 0.7

    const volume = savedVolume ? Number(savedVolume) : Number(globalVolume)

    audio.volume = Math.max(0, Math.min(1, volume))
    volumeBar.value = audio.volume * 13
}

function deleteSong(event, id) 
{
    event.preventDefault()

    if (songs[currentSongIndex]?.id === id)
    {
        audio.pause()
        audio.src = ''
        currentSongIndex = -1
    }

    const transaction = db.transaction(['songs'], 'readwrite')
    const store = transaction.objectStore('songs')

    if (confirm('Delete This Song?')) 
        store.delete(id)

    transaction.oncomplete = () => loadPlaylist()
}

playPauseButton.addEventListener('click', () => 
{
    if (audio.paused) 
    {
        audio.play()
        playPauseButton.textContent = '❚❚'
    } 

    else 
    {
        audio.pause()
        playPauseButton.textContent = '▶︎'
    }
})

audio.addEventListener('ended', () => 
{
    if (songs.length === 0) return

    currentSongIndex = (currentSongIndex + 1) % songs.length
    playSong(currentSongIndex)
})

audio.addEventListener('timeupdate', () => 
{
    if (!Number.isNaN(audio.duration)) 
    {
        seekBar.max = audio.duration
        seekBar.value = audio.currentTime
    }
})

seekBar.addEventListener('input', () => 
{
    audio.currentTime = seekBar.value
})

const savedVolume = localStorage.getItem('volumeLevel')
const volume = savedVolume ? Number(savedVolume) : 0.3

audio.volume = Math.max(0, Math.min(1, volume))
volumeBar.value = audio.volume * 10

volumeBar.addEventListener('input', () => 
{
    const rawVolume = Number(volumeBar.value)
    const value = Math.max(0, Math.min(1, rawVolume / 10))

    if (currentSongIndex !== -1)
    {
        const song = songs[currentSongIndex]
        localStorage.setItem('volume_song_' + song.id, value)
    }

    localStorage.setItem('volumeLevel', value);
    audio.volume = value;
})

audio.addEventListener('error', (e) => 
{
    console.log('Audio Error:', e)
})

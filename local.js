const themeIcon = document.getElementById('themeButton')
const darkmodeThemeIcon = '🌙'
const lightmodeThemeIcon = '☀️'

if (!localStorage.getItem('themeMode')) 
{
    localStorage.setItem('themeMode', 'darkmode')
}

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
    const vars = [
        'backgroundcolor-1', 'backgroundcolor-2', 'backgroundcolor-3', 'backgroundcolor-4',
        'backgroundcolor-a', 'backgroundcolor-b',
        'textcolor-1', 'textcolor-2', 'textcolor-3', 'textcolor-4'
    ]

    vars.forEach(i => {
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
let playButtons = []
let songItems = []

let db
const request = indexedDB.open('MusicDB', 1)

request.onerror = (event) => 
{
    console.log('IndexedDB Error:', event.target.error)
}

request.onupgradeneeded = (event) => 
{
    db = event.target.result

    if (!db.objectStoreNames.contains('songs')) {
        db.createObjectStore('songs', { keyPath: 'id', autoIncrement: true })
    }
}

request.onsuccess = (event) => 
{
    db = event.target.result
    loadPlaylist()
}

fileInput.addEventListener('change', (event) => 
{
    const files = event.target.files
    for (let file of files) saveSong(file)
})

function saveSong(file) 
{
    const reader = new FileReader()

    reader.onload = function (e) 
    {
        const transaction = db.transaction(['songs'], 'readwrite')
        const store = transaction.objectStore('songs')

        store.add({
            name: file.name,
            data: e.target.result,
            type: file.type
        })

        transaction.oncomplete = () => loadPlaylist()
    }

    reader.readAsArrayBuffer(file)
}

function loadPlaylist() 
{
    songs = []
    playButtons = []
    songItems = []
    playList.innerHTML = ''

    const transaction = db.transaction(['songs'], 'readonly')
    const store = transaction.objectStore('songs')

    store.openCursor().onsuccess = (event) => {
        const cursor = event.target.result
        if (!cursor) return

        const song = cursor.value
        songs.push(song)
        const index = songs.length - 1

        const li = document.createElement('li')
        songItems.push(li)
        const wrap = document.createElement('div')
        wrap.className = 'wrap-wrapper'

        li.textContent = song.name

        const deleteButton = document.createElement('button')
        deleteButton.textContent = '✖'
        deleteButton.className = 'deletebutton-li'
        deleteButton.onclick = () => deleteSong(cursor.key)

        const playButton = document.createElement('button')
        playButton.textContent = '▶︎'
        playButton.className = 'playbutton-li'
        playButton.onclick = () => playSong(index)
        playButtons.push(playButton)

        wrap.appendChild(deleteButton)
        wrap.appendChild(playButton)
        li.appendChild(wrap)

        playList.appendChild(li)
        cursor.continue()
    }
}

function playSong(index) 
{
    const song = songs[index]
    const blob = new Blob([song.data], {type: song.type})
    const url = URL.createObjectURL(blob)

    audio.src = url
    audio.play()

    currentSongIndex = index
    playPauseButton.textContent = '❚❚'

    playButtons.forEach(btn => btn.textContent = '▶︎')
    if (playButtons[index])
        playButtons[index].textContent = '❚❚'

    songItems.forEach(item => item.classList.remove('blue-border'))
    if (songItems[index])
        songItems[index].classList.add('blue-border')
}

function deleteSong(id) 
{
    event.stopPropagation()

    const transaction = db.transaction(['songs'], 'readwrite')
    const store = transaction.objectStore('songs')

    if (confirm('Delete This Song?!'))
    {
        store.delete(id)
    }

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
    if (!isNaN(audio.duration)) 
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
if (savedVolume !== null) 
{
    volumeBar.value = savedVolume
}
else
{
    volumeBar.value = 0.7
}

volumeBar.addEventListener('input', () => 
{
    const currentValue = volumeBar.value;
    localStorage.setItem('volumeLevel', currentValue);

    audio.volume = currentValue;
})

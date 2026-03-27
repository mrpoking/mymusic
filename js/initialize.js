const searchTrackBar = document.getElementById('searchTrackBar')

const uploadTrack = document.getElementById('upload-track')
const audioFromTrack = document.getElementById('audioFromTrack')

const playPreviousTrackButton = document.getElementById('playPreviousTrackButton')
const playPauseTrackButton = document.getElementById('playPauseTrackButton')
const playNextTrackButton = document.getElementById('playNextTrackButton')

const volumeBar = document.getElementById('volumeBar')
const seekBar = document.getElementById('seekBar')

const userPlaylist = document.getElementById('userPlaylist')

let tracks = []
let trackMetadata = []

let currentTrackIndex = -1
let currentTrackURL = null
let nextTrackURL = null

let playlistDB
let loadToken = 0
let preloadToken = 0

let isTrackFound = false
let searchTrackTimeout = null
let isPlaylistLoaded = false
let userInteractedEarly = false
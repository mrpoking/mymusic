import { dom, store } from './state.js'

const 
{
    searchTrackBar,
    uploadTrack,
    audioFromTrack,
    playPreviousTrackButton,
    playPauseTrackButton,
    playNextTrackButton,
    volumeBar,
    seekBar,
    userPlaylist,
} = dom

store.tracks = []
store.trackMetadata = []

store.currentTrackIndex = -1
store.currentTrackURL = null
store.nextTrackURL = null

store.playlistDB = null
store.loadToken = 0
store.preloadToken = 0

store.isTrackFound = false
store.searchTrackTimeout = null
store.isPlaylistLoaded = false

store.userInteractedEarly = false

Object.assign(dom, 
{
    searchTrackBar,
    uploadTrack,
    audioFromTrack,

    playPreviousTrackButton,
    playPauseTrackButton,
    playNextTrackButton,

    volumeBar,
    seekBar,

    userPlaylist,
})

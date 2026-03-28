export const dom = 
{
    searchTrackBar: document.getElementById('searchTrackBar'),
    uploadTrack: document.getElementById('upload-track'),
    audioFromTrack: document.getElementById('audioFromTrack'),
    
    playPreviousTrackButton: document.getElementById('playPreviousTrackButton'),
    playPauseTrackButton: document.getElementById('playPauseTrackButton'),
    playNextTrackButton: document.getElementById('playNextTrackButton'),

    volumeBar: document.getElementById('volumeBar'),
    seekBar: document.getElementById('seekBar'),

    userPlaylist: document.getElementById('userPlaylist'),
}

export const store = 
{
    playlistDB: null,

    tracks: [],
    trackMetadata: [],

    currentTrackIndex: -1,
    currentTrackURL: null,
    nextTrackURL: null,

    loadToken: 0,
    preloadToken: 0,

    isTrackFound: false,
    searchTrackTimeout: null,
    isPlaylistLoaded: false,

    userInteractedEarly: false,
}

import { dom, store } from './state.js'
import { updateUI, preloadNext, playSong } from './function.js'

const { audioFromTrack, seekBar, volumeBar } = dom

audioFromTrack.addEventListener('ended', () => 
{
    localStorage.setItem('seek_track_' + store.tracks[store.currentTrackIndex].id, 0)

    if (!store.tracks.length) 
        return

    const nextIndex = (store.currentTrackIndex + 1) % store.tracks.length
    if (store.nextTrackURL)
    {
        if (!store.nextTrackURL.startsWith('blob:')) 
            return

        store.currentTrackIndex = nextIndex

        if (store.currentTrackURL)
            URL.revokeObjectURL(store.currentTrackURL)

        store.currentTrackURL = store.nextTrackURL
        store.nextTrackURL = null

        audioFromTrack.src = store.currentTrackURL
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

        if (store.currentTrackIndex !== -1 && store.tracks[store.currentTrackIndex])
        {
            const track = store.tracks[store.currentTrackIndex]
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

    if (store.currentTrackIndex !== -1 && store.tracks[store.currentTrackIndex])
    {
        const track = store.tracks[store.currentTrackIndex]
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
import { dom, store } from './stateExport.js'
import { playSong } from './function.js'

const { playPreviousTrackButton, playPauseTrackButton, playNextTrackButton, audioFromTrack } = dom

playPreviousTrackButton.addEventListener('click', () => 
{
    if (store.tracks.length === 0) 
        return

    let previousIndex = store.currentTrackIndex - 1
    if (previousIndex < 0)
        previousIndex = store.tracks.length - 1

    playSong(previousIndex)
    console.log('Playing Previous Track:', store.tracks[previousIndex].name)
})

playPauseTrackButton.addEventListener('click', () => 
{
    if (audioFromTrack.paused) 
    {
        audioFromTrack.play().catch(() => {})
        playPauseTrackButton.textContent = '❚❚'

        console.log('Playing Track:', store.tracks[store.currentTrackIndex]?.name || 'Unknown')
    } 

    else 
    {
        audioFromTrack.pause()
        playPauseTrackButton.textContent = '▶︎'

        console.log('Pausing Track:', store.tracks[store.currentTrackIndex]?.name || 'Unknown')
    }
})

playNextTrackButton.addEventListener('click', () =>
{
    if (store.tracks.length === 0) 
        return

    const nextIndex = (store.currentTrackIndex + 1) % store.tracks.length
    playSong(nextIndex)

    console.log('Playing Next Track:', store.tracks[nextIndex].name)
})

const controls = document.querySelector('.user-controls-layout')

let offsetX = 0
let offsetY = 0
let isDragging = false

const saved = JSON.parse(localStorage.getItem("controlsPos"))
if (saved) 
{
    controls.style.left = saved.left
    controls.style.top = saved.top
}

function startDrag(event) 
{
    if (!event.target.closest('.drag-handle')) 
        return

    isDragging = true
    event.preventDefault()

    const rect = controls.getBoundingClientRect()
    offsetX = event.clientX - rect.left
    offsetY = event.clientY - rect.top

    controls.style.cursor = "grabbing"
}

function onDrag(event) 
{
    if (!isDragging) 
        return

    event.preventDefault();

    let newLeft = event.clientX - offsetX
    let newTop = event.clientY - offsetY

    newLeft = Math.max(0, Math.min(window.innerWidth - controls.offsetWidth, newLeft))
    newTop = Math.max(0, Math.min(window.innerHeight - controls.offsetHeight, newTop))

    controls.style.left = newLeft + "px"
    controls.style.top = newTop + "px"
}

function stopDrag() 
{
    if (!isDragging) 
        return

    isDragging = false;
    controls.style.cursor = ""

    localStorage.setItem("controlsPos", JSON.stringify ({
        left: controls.style.left,
        top: controls.style.top
    }))
}

controls.addEventListener('pointerdown', startDrag)
document.addEventListener('pointermove', onDrag)
document.addEventListener('pointerup', stopDrag)

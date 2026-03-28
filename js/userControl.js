import { dom, store } from './state.js'
import { playSong } from './function.js'

const { playPreviousTrackButton, playPauseTrackButton, playNextTrackButton, audioFromTrack } = dom

playPreviousTrackButton.addEventListener('click', () => 
{
    if (store.tracks.length === 0) return

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
    if (store.tracks.length === 0) return

    const nextIndex = (store.currentTrackIndex + 1) % store.tracks.length
    playSong(nextIndex)
    console.log('Playing Next Track:', store.tracks[nextIndex].name)
})

const controls = document.querySelector('.user-controls-layout');

let offsetX = 0;
let offsetY = 0;
let isDragging = false;

const saved = JSON.parse(localStorage.getItem("controlsPos"));
if (saved) 
{
    controls.style.left = saved.left;
    controls.style.top = saved.top;
}

function getClientPos(e) 
{
    if (e.touches) 
    {
        return {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
    }
    
    return {
        x: e.clientX,
        y: e.clientY
    };
}

function startDrag(e) 
{
    if (!e.target.classList.contains('drag-handle')) return;

    isDragging = true;

    const pos = getClientPos(e);
    const rect = controls.getBoundingClientRect();

    offsetX = pos.x - rect.left;
    offsetY = pos.y - rect.top;

    controls.style.cursor = "grabbing";
}

controls.addEventListener('mousedown', startDrag);
controls.addEventListener('touchstart', startDrag);

function onDrag(e) 
{
    if (!isDragging) return;

    const pos = getClientPos(e);

    let newLeft = pos.x - offsetX;
    let newTop = pos.y - offsetY;

    newLeft = Math.max(0, Math.min(window.innerWidth - controls.offsetWidth, newLeft));
    newTop = Math.max(0, Math.min(window.innerHeight - controls.offsetHeight, newTop));

    controls.style.left = newLeft + "px";
    controls.style.top = newTop + "px";

    e.preventDefault();
}

document.addEventListener('mousemove', onDrag);
document.addEventListener('touchmove', onDrag);

function stopDrag() 
{
    if (!isDragging) return;

    isDragging = false;
    controls.style.cursor = "grab";

    localStorage.setItem("controlsPos", JSON.stringify ({
        left: controls.style.left,
        top: controls.style.top
    }));
}

document.addEventListener('mouseup', stopDrag);
document.addEventListener('touchend', stopDrag);

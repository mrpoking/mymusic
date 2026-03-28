if (!localStorage.getItem('isLightMode')) 
    localStorage.setItem('isLightMode', 'darkmode')

let isLightMode = (localStorage.getItem('isLightMode') === 'lightmode')

const themeButton = document.getElementById('themeButton')

const uploadTrackButtonElement = document.getElementById('uploadTrackButton')
const grabButtonElement = document.getElementById('grabButton')

const lightmodeThemeIcon = `<div class="lightmode-theme-icon"></div>`
const lightmodeUploadTrackIcon = `<div class="lightmode-upload-track-icon"></div>`
const lightmodeGrabIcon = `<div class="lightmode-grab-icon"></div>`

const darkmodeThemeIcon = `<div class="darkmode-theme-icon"></div>`
const darkmodeUploadTrackIcon = `<div class="darkmode-upload-track-icon"></div>`
const darkmodeGrabIcon = `<div class="darkmode-grab-icon"></div>`

function updateThemeUI()
{
    themeButton.innerHTML = isLightMode 
        ? darkmodeThemeIcon 
        : lightmodeThemeIcon

    uploadTrackButtonElement.innerHTML = isLightMode 
        ? darkmodeUploadTrackIcon 
        : lightmodeUploadTrackIcon

    grabButtonElement.innerHTML = isLightMode 
        ? darkmodeGrabIcon 
        : lightmodeGrabIcon
}

window.addEventListener("load", () => 
{
    updateThemeUI();
    applyThemeColors();
})

themeButton.addEventListener('click', () => 
{
    isLightMode = !isLightMode
    localStorage.setItem('isLightMode', isLightMode ? 'lightmode' : 'darkmode')

    updateThemeUI()
    applyThemeColors()

    console.log('Theme Mode Changed To:', isLightMode ? 'Light Mode' : 'Dark Mode')
})

function applyThemeColors() 
{
    const colorVariables = 
    [
        'backgroundcolor-1', 'backgroundcolor-2', 'backgroundcolor-3', 'backgroundcolor-4', 
        'backgroundcolor-a', 'backgroundcolor-b', 'backgroundcolor-c',
        'cardbackgroundcolor-1', 'cardbackgroundcolor-2', 'cardbackgroundcolor-3',
        'textcolor-1', 'textcolor-2', 'textcolor-3', 'textcolor-4', 'textcolor-a'
    ]

    const getSavedThemeMode = localStorage.getItem('isLightMode')
    document.body.style.backgroundImage = `var(--${getSavedThemeMode}-background-image)`
    colorVariables.forEach(i => 
    {
        document.body.style.setProperty(`--${i}`, `var(--${getSavedThemeMode}-${i})`)
    })
}
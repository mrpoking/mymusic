if (!localStorage.getItem('themeMode')) 
    localStorage.setItem('themeMode', 'darkmode')

let themeMode = localStorage.getItem('themeMode') === 'lightmode'

const themeIcon = document.getElementById('themeButton')
const uploadFileButton = document.getElementById('trackUploadButton')

const darkmodeThemeIcon = `<div class="darkmode-icon"></div>`
const darkmodeFileUploadIcon = `<div class="darkmode-trackupload-icon">`

const lightmodeThemeIcon = `<div class="lightmode-icon"></div>`
const lightmodeFileUploadIcon = `<div class="lightmode-trackupload-icon">`

function updateThemeUI()
{
    themeIcon.innerHTML = themeMode ? darkmodeThemeIcon : lightmodeThemeIcon
    uploadFileButton.innerHTML = themeMode ? darkmodeFileUploadIcon : lightmodeFileUploadIcon
}

updateThemeUI()
applyTheme()

themeIcon.addEventListener('click', () => 
{
    themeMode = !themeMode
    localStorage.setItem('themeMode', themeMode ? 'lightmode' : 'darkmode')
    updateThemeUI()
    applyTheme()
})

function applyTheme() 
{
    const vars = 
    [
        'backgroundcolor-1', 'backgroundcolor-2', 'backgroundcolor-3', 'backgroundcolor-4', 'cardbackgroundcolor-1', 'cardbackgroundcolor-2', 'cardbackgroundcolor-3',
        'backgroundcolor-a', 'backgroundcolor-b', 'backgroundcolor-c',
        'textcolor-1', 'textcolor-2', 'textcolor-3', 'textcolor-4', 'textcolor-a'
    ]

    const getThemeMode = localStorage.getItem('themeMode')

    vars.forEach(i => 
    {
        document.body.style.setProperty(`--${i}`, `var(--${getThemeMode}-${i})`)
    })
}
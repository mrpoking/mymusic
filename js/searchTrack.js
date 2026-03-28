import { dom, store } from './stateExport.js'
import { noResultsLayout } from './function.js'

const { searchTrackBar } = dom

searchTrackBar.addEventListener('input', () =>
{
    if (!store.isPlaylistLoaded) 
        return;

    clearTimeout(store.searchTrackTimeout)
    
    const searchValue = searchTrackBar.value.toLowerCase()
    store.searchTrackTimeout = setTimeout(() =>
    {
        if (!store.isPlaylistLoaded)
        {
            noResultsLayout.style.display = 
            (searchValue.length > 0) ? '' : 'none'
            return
        }

        if (searchValue.length < 2)
        {
            store.isTrackFound = false
            store.trackMetadata.forEach(item => item.style.display = '')
            noResultsLayout.style.display = 'none'
            return
        }

        store.isTrackFound = false
        store.trackMetadata.forEach((item, index) => 
        {
            const trackName = store.tracks[index].name.toLowerCase()
            const trackMatch = trackName.includes(searchValue)

            item.style.display = trackMatch ? '' : 'none'
            if (trackMatch) 
                store.isTrackFound = true
        })

        noResultsLayout.style.display = store.isTrackFound ? 'none' : ''
    }, 200)
})
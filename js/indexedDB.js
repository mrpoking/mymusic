import { store } from './stateExport.js'
import { loadPlaylist } from './function.js'

const requestDB = indexedDB.open('playlistDB', 2)
requestDB.onerror = event =>
    console.log('IndexedDB Error:', event.target.error)

requestDB.onupgradeneeded = event =>
{
    store.playlistDB = event.target.result
    if (!store.playlistDB.objectStoreNames.contains('tracks'))
        store.playlistDB.createObjectStore('tracks', { keyPath: 'id', autoIncrement: true })
}

requestDB.onsuccess = event =>
{
    store.playlistDB = event.target.result
    if (!store.playlistDB.objectStoreNames.contains('tracks'))
    {
        console.error('Tracks Object Store Not Found!')
        return
    }

    loadPlaylist()
}
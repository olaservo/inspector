import { contextBridge } from 'electron'

// Expose an API to the renderer process if needed
contextBridge.exposeInMainWorld('myAPI', {
  // your API methods here
})

// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge } from 'electron'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// Set up ESM compatible paths if needed
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Add any electron API methods you want to expose to the renderer process
  }
)

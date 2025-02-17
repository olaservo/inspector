// Enable detailed logging
process.env.ELECTRON_ENABLE_LOGGING = '1'
process.env.ELECTRON_DEBUG_LOGGING = '1'

console.log('='.repeat(50))
console.log('ELECTRON MAIN PROCESS STARTING')
console.log('='.repeat(50))

import { app, BrowserWindow } from 'electron'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Set up paths for production using ESM compatible methods
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DIST_ELECTRON = __dirname
const DIST_CLIENT = join(DIST_ELECTRON, '../dist')

// In development, we load from the Vite dev server
// In production, we load from the built client files
const isDev = !app.isPackaged

function createWindow(): BrowserWindow | null {
  try {
    console.log('Creating BrowserWindow...')
    const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(DIST_ELECTRON, 'preload.cjs'),
      nodeIntegration: true, // if you still need it; many apps disable it for security
      contextIsolation: true, // must be true for contextBridge to work
    },    
  })

    console.log('Window created successfully')
    
    // Add window error handlers
    mainWindow.webContents.on('did-fail-load', (_, code, desc) => {
      console.error(`Failed to load: ${code} - ${desc}`)
    })

    // Load the appropriate URL/file based on environment
    if (isDev) {
      console.log('Development mode: Waiting for dev server...')
      setTimeout(() => {
        console.log('Loading dev server URL...')
        mainWindow.loadURL('http://localhost:5173').catch(err => {
          console.error('Failed to load dev server:', err)
          app.quit()
        })
        mainWindow.webContents.openDevTools()
      }, 1000)
    } else {
      console.log('Production mode: Loading from built files...')
      const indexPath = join(DIST_CLIENT, 'index.html')
      mainWindow.loadFile(indexPath)
    }

    return mainWindow
  } catch (err) {
    console.error('Failed to create window:', err)
    app.quit()
    return null
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  console.log('App is ready, creating window...')
  const window = createWindow()
  if (!window) {
    console.error('Failed to create window, quitting...')
    app.quit()
  }
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    console.log('No windows found, creating new window...')
    const window = createWindow()
    if (!window) {
      console.error('Failed to create window on activate, quitting...')
      app.quit()
    }
  }
})

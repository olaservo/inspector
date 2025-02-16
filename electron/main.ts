import { app, BrowserWindow } from 'electron'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// In development, we load from the Vite dev server (localhost:5173)
// In production, we load from the built client files in client/dist
const isDev = process.env.VITE_DEV_SERVER_URL !== undefined

// Set up paths for production using ESM compatible methods
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DIST_ELECTRON = join(__dirname, '..')
const DIST_CLIENT = join(DIST_ELECTRON, 'dist')

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  // Load the appropriate URL/file based on environment
  if (isDev) {
    // Development: Load from Vite dev server
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL as string)
    mainWindow.webContents.openDevTools()
  } else {
    // Production: Load from built files in the dist directory
    const indexPath = join(DIST_CLIENT, 'index.html')
    mainWindow.loadFile(indexPath)
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(createWindow)

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
    createWindow()
  }
})

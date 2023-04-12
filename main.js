// Modules to control application life and create native browser window
const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require('path')
const fs = require("fs");

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 730,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadFile('index.html')
  // mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})



ipcMain.handle('dialog:openDirectory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  if (canceled) {
    return ''
  } else {
    return filePaths[0] + '\\'
  }
})

ipcMain.on("toMain", (event, args) => {
  const files = fs.readdirSync(args, (err) => {
    if (err) throw new Error('Unable to scan directory: ' + err)
  })
  .filter(file => path.extname(file) === '.png')
  .map(file => {
    const fileStats = fs.statSync(args + file, (err, stats) => {
      if (err) { throw new Error('Last modified date not found', err) }
    })
    
    return {
      'fileName': file,
      'fileDate': fileStats.mtime.toLocaleDateString()
    }
  })
  
  mainWindow.webContents.send("fromMain", files);
})

ipcMain.handle('fileSystem:writeHeader', (event, filePath, header) => {
  fs.writeFile(filePath, header.join("\t") + '\n', 'utf8', (err) => {
    if (err) throw new Error('Failed to write header', err)
  })
})

ipcMain.handle('fileSystem:appendValues', (event, filePath, arrValues) => {
  fs.appendFile(filePath, arrValues.join("\t") + '\n', 'utf8', (err) => {
    if (err) throw new Error('Failed to append values', err)
  })
})

ipcMain.handle('xlsx:writeExcel', async (event, filePath, destinationPath) => {
  const XLSX = require('xlsx')
  const txt = XLSX.readFile(filePath, String)
  await XLSX.writeFile(txt, destinationPath)
})
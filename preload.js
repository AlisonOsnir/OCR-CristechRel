const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld(
    "api", {
    send: (channel, data) => {
        let validChannels = ["toMain"];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    receive: (channel, func) => {
        let validChannels = ["fromMain"];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    selectFolder: () => ipcRenderer.invoke('dialog:openDirectory'),
    writeHeader: (filePath, data) => ipcRenderer.invoke('fileSystem:writeHeader', filePath, data),
    appendValues: (filePath, data) => ipcRenderer.invoke('fileSystem:appendValues', filePath, data),
    writeExcel: (filePath, toPath) => ipcRenderer.invoke('xlsx:writeExcel', filePath, toPath),
    invokeExcel: (filePath) => ipcRenderer.invoke('childProcess:invokeExcel', filePath),
    invokeNotepad: (filePath) => ipcRenderer.invoke('childProcess:invokeNotepad', filePath)
});
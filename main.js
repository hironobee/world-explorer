// main.js - Electron main process

const {app, BrowserWindow} = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1100,
        height: 740,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false
        }
    });

    win.loadFile('index.html');
    // win.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
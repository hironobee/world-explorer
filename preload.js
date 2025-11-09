// preload.js - currently minimal, prepared for secure IPC in future

const {contextBridge} = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // in future i can add secure IPC function here.
});
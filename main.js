const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;


function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        icon: path.join(__dirname, 'icons', 'application', 'icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        backgroundColor: '#1a1a1a',
        show: false
    });

    mainWindow.loadFile('index.html');

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers for file operations
ipcMain.handle('save-file', async (event, { defaultPath, content, filters }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultPath,
        filters: filters || [{ name: 'All Files', extensions: ['*'] }]
    });

    if (result.canceled) {
        return null;
    }

    try {
        fs.writeFileSync(result.filePath, content);
        return result.filePath;
    } catch (error) {
        throw new Error(`Failed to save file: ${error.message}`);
    }
});

ipcMain.handle('open-file', async (event, filters) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: filters || [{ name: 'All Files', extensions: ['*'] }]
    });

    if (result.canceled) {
        return null;
    }

    try {
        const content = fs.readFileSync(result.filePaths[0], 'utf-8');
        return {
            path: result.filePaths[0],
            content: content
        };
    } catch (error) {
        throw new Error(`Failed to open file: ${error.message}`);
    }
});

// Get app version
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

// Get user data path
ipcMain.handle('get-user-data-path', () => {
    return app.getPath('userData');
});

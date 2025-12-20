const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let currentModel = null;
let currentContext = null;
let currentSession = null;
let modelLoading = false;
let llamaCpp = null;

// Dynamically import node-llama-cpp
async function initLlamaCpp() {
    if (!llamaCpp) {
        llamaCpp = await import('node-llama-cpp');
    }
    return llamaCpp;
}

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
ipcMain.handle('select-gguf-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'GGUF Models', extensions: ['gguf'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (result.canceled) {
        return null;
    }

    const filePath = result.filePaths[0];
    return {
        path: filePath,
        name: path.basename(filePath),
        size: fs.statSync(filePath).size
    };
});

ipcMain.handle('read-gguf-file', async (event, filePath) => {
    try {
        const buffer = fs.readFileSync(filePath);
        return buffer;
    } catch (error) {
        throw new Error(`Failed to read GGUF file: ${error.message}`);
    }
});

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

// Get user data path for storing models
ipcMain.handle('get-user-data-path', () => {
    return app.getPath('userData');
});

// Scan models folder for GGUF files
ipcMain.handle('scan-models-folder', async () => {
    const modelsPath = path.join(__dirname, 'models');
    
    try {
        // Create models folder if it doesn't exist
        if (!fs.existsSync(modelsPath)) {
            fs.mkdirSync(modelsPath, { recursive: true });
            return [];
        }
        
        // Read directory
        const files = fs.readdirSync(modelsPath);
        
        // Filter for .gguf files and get their details
        const models = files
            .filter(file => file.toLowerCase().endsWith('.gguf'))
            .map(file => {
                const filePath = path.join(modelsPath, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    path: filePath,
                    size: stats.size,
                    sizeFormatted: formatBytes(stats.size),
                    modified: stats.mtime
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));
        
        return models;
    } catch (error) {
        console.error('Error scanning models folder:', error);
        return [];
    }
});

// Helper function to format bytes
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Open models folder in file explorer
ipcMain.handle('open-models-folder', async () => {
    const modelsPath = path.join(__dirname, 'models');
    
    // Create folder if it doesn't exist
    if (!fs.existsSync(modelsPath)) {
        fs.mkdirSync(modelsPath, { recursive: true });
    }
    
    // Open in file explorer
    const { shell } = require('electron');
    await shell.openPath(modelsPath);
});

// Load GGUF model
ipcMain.handle('load-model', async (event, modelPath, options = {}) => {
    try {
        // Prevent concurrent loading
        if (modelLoading) {
            throw new Error('A model is already being loaded');
        }
        
        modelLoading = true;
        
        // Unload existing model if any
        if (currentModel) {
            currentModel = null;
            currentContext = null;
            currentSession = null;
        }
        
        // Verify file exists
        if (!fs.existsSync(modelPath)) {
            throw new Error(`Model file not found: ${modelPath}`);
        }
        
        console.log('Loading model from:', modelPath);
        
        // Initialize llama-cpp
        const llama = await initLlamaCpp();
        const { getLlama } = llama;
        
        // Get llama instance
        const llamaInstance = await getLlama();
        
        // Load model with CPU fallback
        const model = await llamaInstance.loadModel({
            modelPath: modelPath,
            gpuLayers: 0  // Force CPU mode to avoid VRAM issues
        });
        
        // Create context
        const context = await model.createContext({
            contextSize: options.contextLength || 512
        });
        
        // Create chat session
        const session = new llama.LlamaChatSession({
            contextSequence: context.getSequence()
        });
        
        currentModel = model;
        currentContext = context;
        currentSession = session;
        modelLoading = false;
        
        console.log('Model loaded successfully');
        
        return {
            success: true,
            modelPath: modelPath,
            modelName: path.basename(modelPath)
        };
    } catch (error) {
        modelLoading = false;
        currentModel = null;
        currentContext = null;
        currentSession = null;
        console.error('Model loading error:', error);
        throw new Error(`Failed to load model: ${error.message}`);
    }
});

// Unload model
ipcMain.handle('unload-model', async () => {
    if (currentModel) {
        currentSession = null;
        currentContext = null;
        currentModel = null;
        return { success: true };
    }
    return { success: false, message: 'No model loaded' };
});

// Generate text with loaded model
ipcMain.handle('generate-text', async (event, prompt, options = {}) => {
    if (!currentSession) {
        throw new Error('No model loaded. Please load a model first.');
    }
    
    try {
        console.log('Generating text...');
        let generatedText = '';
        
        // Use chat session for generation
        const response = await currentSession.prompt(prompt, {
            maxTokens: options.maxTokens,
            temperature: options.temperature,
            topK: options.topK,
            topP: options.topP,
            onTextChunk: (chunk) => {
                // Stream tokens as they're generated
                generatedText += chunk;
                event.sender.send('generation-progress', chunk);
            }
        });
        
        console.log('Generation complete');
        
        return {
            success: true,
            text: generatedText || response
        };
    } catch (error) {
        console.error('Generation error:', error);
        throw new Error(`Generation failed: ${error.message}`);
    }
});

// Check if model is loaded
ipcMain.handle('is-model-loaded', () => {
    return currentModel !== null && currentSession !== null;
});

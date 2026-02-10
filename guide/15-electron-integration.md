# Chapter 15 — Electron Integration

This chapter shows how to wrap the React build inside Electron for a desktop application, just like the original Forgeon.

---

## 15.1 Install Electron

From the React project root:

```bash
npm install --save-dev electron electron-builder
```

---

## 15.2 Electron Main Process

> **File:** `public/electron.js`

This replaces the original `main.js`. It loads the React build instead of a static `index.html`.

```js
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
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#1a1a1a',
    show: false,
  });

  // In development, load from React dev server
  // In production, load from the build folder
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'build', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

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

// ── IPC Handlers ──────────────────────────────────

ipcMain.handle('save-file', async (event, { defaultPath, content, filters }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters: filters || [{ name: 'All Files', extensions: ['*'] }],
  });

  if (result.canceled) return null;

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
    filters: filters || [{ name: 'All Files', extensions: ['*'] }],
  });

  if (result.canceled) return null;

  try {
    const content = fs.readFileSync(result.filePaths[0], 'utf-8');
    return { path: result.filePaths[0], content };
  } catch (error) {
    throw new Error(`Failed to open file: ${error.message}`);
  }
});

ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-user-data-path', () => app.getPath('userData'));
```

---

## 15.3 Preload Script

> **File:** `public/preload.js`

```js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  openFile: (filters) => ipcRenderer.invoke('open-file', filters),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
});
```

---

## 15.4 Update `package.json`

Add these fields to your React project's `package.json`:

```json
{
  "main": "public/electron.js",
  "homepage": "./",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "electron-dev": "ELECTRON_START_URL=http://localhost:3000 electron .",
    "electron-build": "npm run build && electron-builder",
    "electron-start": "electron ."
  },
  "build": {
    "appId": "com.forgeon.gameplanner",
    "productName": "Forgeon Game Planner",
    "directories": {
      "output": "dist"
    },
    "files": [
      "build/**/*",
      "public/electron.js",
      "public/preload.js",
      "public/icons/**/*"
    ],
    "win": {
      "target": ["nsis", "portable"],
      "icon": "public/icons/application/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "public/icons/application/512x512.png",
      "category": "public.app-category.developer-tools"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "icon": "public/icons/application/512x512.png",
      "category": "Development"
    }
  }
}
```

> **Important:** The `"homepage": "./"` setting tells Create React App to use relative paths in the production build, which is required for Electron to load assets correctly.

---

## 15.5 Detecting Electron in React

> **File:** `src/utils/electron.js`

Create a small utility to detect whether the app is running in Electron:

```js
/**
 * Detects if the app is running inside Electron.
 * Uses the same check as the original script.js.
 */
export const isElectron = typeof window.electronAPI !== 'undefined';

/**
 * Safely access Electron APIs.
 * Returns null if not in Electron.
 */
export function getElectronAPI() {
  if (isElectron) {
    return window.electronAPI;
  }
  return null;
}
```

Use it in components that need file dialogs:

```jsx
import { getElectronAPI } from '../../utils/electron';

const ExportButton = () => {
  const handleExport = async () => {
    const api = getElectronAPI();
    if (api) {
      // Desktop: use Electron save dialog
      await api.saveFile({
        defaultPath: 'forgeon-export.json',
        content: JSON.stringify(data),
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
    } else {
      // Browser: use download link
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'forgeon-export.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return <button onClick={handleExport}>Export</button>;
};
```

---

## 15.6 Development Workflow

```bash
# Terminal 1: Start React dev server
npm start

# Terminal 2: Start Electron (after React is running)
npm run electron-dev
```

---

## 15.7 Production Build

```bash
# Build React + package with Electron
npm run electron-build
```

The output will be in the `dist/` folder.

---

## 15.8 Files Created

| File | Replaces |
|------|----------|
| `public/electron.js` | `main.js` |
| `public/preload.js` | `preload.js` |
| `src/utils/electron.js` | `isElectron` flag in `script.js` |

---

## 🎉 Congratulations!

You have now rebuilt the entire Forgeon application using React.js with modern destructuring techniques. Here is a summary of what was covered:

| Chapter | What Was Built |
|---------|---------------|
| 01 | Project scaffolding with Create React App |
| 02 | Complete file/folder structure |
| 03 | Context + Reducer state management |
| 04 | App shell, Sidebar, Modal, Theme, Search |
| 05 | Dashboard with stat cards and calendar |
| 06 | Task manager with filter/sort/CRUD |
| 07 | Asset tracker with category filtering |
| 08 | Milestone planner with progress bars |
| 09 | Class definitions with attributes/skills |
| 10 | Game mechanics documentation |
| 11 | Story & Narrative (acts, characters, locations, quests, timeline, conflicts, themes, items) |
| 12 | Notes with categories, tags, pinning, reminders |
| 13 | Shared utilities, helpers, IndexedDB storage |
| 14 | CSS migration and theme system |
| 15 | Electron desktop integration |

### Key Destructuring Patterns Used

| Pattern | Example |
|---------|---------|
| **Props destructuring** | `const TaskCard = ({ title, priority }) => ...` |
| **State destructuring** | `const { tasks, theme } = useAppState()` |
| **Array destructuring** | `const [filter, setFilter] = useState('all')` |
| **Nested destructuring** | `const { story: { acts } } = useAppState()` |
| **Event destructuring** | `({ target: { value } }) => setValue(value)` |
| **Rest/spread** | `const { id, ...updates } = payload` |
| **Default values** | `const { priority = 'medium' } = task` |
| **Rename** | `const { id: existingId } = task` |
| **Map callback destructuring** | `items.map(({ id, name }) => ...)` |
| **Filter destructuring** | `tasks.filter(({ completed }) => !completed)` |

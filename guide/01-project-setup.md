# Chapter 1 — Project Setup

## 1.1 Create the React App

```bash
npx create-react-app forgeon-react
cd forgeon-react
```

## 1.2 Install Dependencies

```bash
npm install react-router-dom jszip
```

| Package | Purpose |
|---------|---------|
| `react-router-dom` | Client-side routing between sections |
| `jszip` | ZIP archive export / import (same as original) |

## 1.3 Clean Up the Scaffolded Files

Delete the files you won't need:

```bash
rm src/App.test.js src/logo.svg src/reportWebVitals.js src/setupTests.js
```

## 1.4 Copy the Icons

Copy the entire `icons/` directory from the original Forgeon project into the React app's `public/` folder:

```bash
cp -r /path/to/original/Forgeon/icons public/icons
```

Also copy the banner image:

```
public/
  icons/
    actions/
    asset/
    application/
    misc/
    navigation/
    status/
    story/
    theme/
```

## 1.5 Update `public/index.html`

> **File:** `public/index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Forgeon - Organize your game development projects" />
    <title>Forgeon</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

## 1.6 Update `src/index.js`

> **File:** `src/index.js`

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppProvider } from './context/AppContext';
import './styles/index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

**Destructuring used:** The `<AppProvider>` wraps the entire app so every child can destructure state from context.

## 1.7 Create the Folder Structure

Run these commands inside `forgeon-react/src/`:

```bash
mkdir -p src/components/layout
mkdir -p src/components/dashboard
mkdir -p src/components/tasks
mkdir -p src/components/assets
mkdir -p src/components/milestones
mkdir -p src/components/classes
mkdir -p src/components/mechanics
mkdir -p src/components/story
mkdir -p src/components/notes
mkdir -p src/components/shared
mkdir -p src/context
mkdir -p src/hooks
mkdir -p src/utils
mkdir -p src/styles
```

## 1.8 Result After This Chapter

```
forgeon-react/
├── public/
│   ├── index.html
│   └── icons/          ← copied from original project
│       ├── actions/
│       ├── application/
│       ├── asset/
│       ├── misc/
│       ├── navigation/
│       ├── status/
│       ├── story/
│       └── theme/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   ├── dashboard/
│   │   ├── tasks/
│   │   ├── assets/
│   │   ├── milestones/
│   │   ├── classes/
│   │   ├── mechanics/
│   │   ├── story/
│   │   ├── notes/
│   │   └── shared/
│   ├── context/
│   ├── hooks/
│   ├── utils/
│   ├── styles/
│   ├── App.js
│   └── index.js
├── package.json
└── ...
```

---

**Next:** [Chapter 2 — Project Structure](./02-project-structure.md)

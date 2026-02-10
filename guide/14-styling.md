# Chapter 14 — Styling

This chapter migrates the original `style.css` into the React project. The CSS variable system and theme support carry over almost unchanged.

---

## 14.1 Approach

The original `style.css` is **8,000+ lines** and uses CSS custom properties (variables) for theming. Since React uses `className` (not `class`) and the component structure changed, we need to:

1. Copy the CSS variable definitions as-is (they work identically in React).
2. Copy component styles that match our new class names (they already align).
3. Split into smaller files for maintainability.

The original CSS classes (`item-card`, `btn`, `nav-item`, `filter-btn`, etc.) are **reused directly** in the React components, so most styles work without changes.

---

## 14.2 Main Stylesheet

> **File:** `src/styles/index.css`

Copy the full contents of the original `style.css` into this file. The key sections that must be preserved are shown below.

```css
/* =================================
   CSS Variables for Theming
   ================================= */
:root {
  /* Light Theme Colors */
  --primary-color: #E02424;
  --primary-hover: #C01F1F;
  --secondary-color: #8b5cf6;
  --accent-color: #8b5cf6;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --danger-color: #ef4444;

  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-tertiary: #f3f4f6;

  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;

  --border-color: #e5e7eb;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

  --icon-filter: none;

  --sidebar-width: 260px;
  --header-height: 70px;
  --transition-speed: 0.3s;
}

/* Dark Theme */
[data-theme="dark"] {
  --accent-color: #8b5cf6;
  --bg-primary: #1f2937;
  --bg-secondary: #111827;
  --bg-tertiary: #374151;

  --text-primary: #f9fafb;
  --text-secondary: #d1d5db;
  --text-tertiary: #9ca3af;

  --border-color: #374151;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);

  --icon-filter: brightness(0) invert(1);
}

/* =================================
   Global Styles
   ================================= */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  line-height: 1.6;
  transition: background-color var(--transition-speed), color var(--transition-speed);
}

button {
  font-family: inherit;
  cursor: pointer;
  border: none;
  background: none;
  transition: all 0.2s ease;
}

button:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

ul { list-style: none; }

img, svg { filter: var(--icon-filter); }

/* Don't filter content images */
.note-card-drawing img,
.asset-thumbnail img,
canvas { filter: none !important; }

/* =================================
   App Layout
   ================================= */
.app-container {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  min-height: 100vh;
}

/* ... rest of styles from original style.css ... */
```

### How to Complete This File

1. Open the original `style.css` from the Forgeon repository.
2. Copy its **entire contents** into `src/styles/index.css`.
3. The class names used in the React components match the original CSS exactly, so no renaming is needed.

> **Important:** The original CSS is self-contained with CSS variables. Since React applies `className` the same way the browser applies `class`, all styles work as-is.

---

## 14.3 Additional Animation Styles

Add these at the end of `src/styles/index.css` (if not already present in the original):

```css
/* =================================
   Animations
   ================================= */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeInOut {
  0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
  10%, 90% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

@keyframes slideInUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes slideInRight {
  from { transform: translateX(400px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
```

---

## 14.4 Theme Toggle in React

The theme is applied by setting a `data-theme` attribute on `<body>`. This is handled in `AppContext.js` via a `useEffect`:

```js
useEffect(() => {
  document.body.setAttribute('data-theme', state.theme);
}, [state.theme]);
```

This single line replaces the original `AppState.applyTheme()` method. The CSS variable system does the rest.

---

## 14.5 Why Not CSS Modules?

The original Forgeon uses **global class names** that are tightly coupled to the CSS file. To minimize migration effort:

- We keep all styles global (in `index.css`).
- React components use the **same class names** as the original HTML.
- You can incrementally adopt CSS Modules later by extracting styles per component.

If you prefer CSS Modules in the future, rename files to `*.module.css` and import them:

```jsx
import styles from './TaskCard.module.css';
<div className={styles.itemCard}>
```

---

## 14.6 Summary

| What | Action |
|------|--------|
| CSS variables (`:root`, `[data-theme="dark"]`) | Copy as-is — identical behavior |
| Global styles (reset, buttons, etc.) | Copy as-is |
| Component styles (`.item-card`, `.nav-item`, etc.) | Copy as-is — class names match |
| Theme toggle | Handled by `useEffect` in `AppContext.js` |
| Animations | Copy as-is, or add the snippets above |

---

**Next:** [Chapter 15 — Electron Integration](./15-electron-integration.md)

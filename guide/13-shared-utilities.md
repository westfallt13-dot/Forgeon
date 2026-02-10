# Chapter 13 — Shared Utilities

This chapter creates the utility functions and the IndexedDB file storage wrapper that are shared across the entire application.

---

## 13.1 Helper Functions

> **File:** `src/utils/helpers.js`

These are pure functions — no side effects, no DOM manipulation. They replace the `Utils` object from `script.js`.

```js
/**
 * Generates a unique ID using timestamp + random string.
 * Same algorithm as the original Utils.generateId().
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Formats a date string for display.
 * Handles both YYYY-MM-DD and full ISO datetime strings.
 *
 * @param {string} dateString
 * @returns {string} e.g. "Jan 15, 2024"
 */
export function formatDate(dateString) {
  if (!dateString) return '';

  // Handle date-only strings (YYYY-MM-DD) to avoid timezone issues
  if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number); // ← array destructuring
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Checks if a date is before today (ignores time component).
 * Useful for detecting overdue tasks/milestones.
 *
 * @param {string} dateString
 * @returns {boolean}
 */
export function isDateBeforeToday(dateString) {
  if (!dateString) return false;

  let d;
  if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    d = new Date(year, month - 1, day);
  } else {
    d = new Date(dateString);
  }

  if (isNaN(d)) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

/**
 * Escapes HTML special characters to prevent XSS.
 * Uses a temporary DOM element for reliable escaping.
 *
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Converts basic Markdown to HTML.
 * Supports: # headings, **bold**, *italic*, - lists, paragraphs.
 *
 * @param {string} text
 * @returns {string}
 */
export function parseMarkdown(text) {
  if (!text) return '';
  let html = escapeHtml(text);

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold and Italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Lists
  html = html.replace(/^- (.+)$/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';

  return html;
}
```

---

## 13.2 File Storage (IndexedDB)

> **File:** `src/utils/fileStorage.js`

This replaces the `FileStorage` object from `script.js`. It provides an IndexedDB wrapper for storing binary file data (asset attachments, etc.).

```js
const DB_NAME = 'ForgeonFileStore';
const STORE_NAME = 'files';
const DB_VERSION = 1;

let dbInstance = null;

/**
 * Opens (or creates) the IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = ({ target: { result: db } }) => {  // ← destructure event
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = ({ target: { result } }) => {
      dbInstance = result;
      resolve(result);
    };

    request.onerror = ({ target: { error } }) => {
      reject(error);
    };
  });
}

/**
 * Stores a file in IndexedDB.
 * @param {string} id - Unique file ID
 * @param {*} data - File data (Blob, ArrayBuffer, base64 string, etc.)
 * @param {Object} metadata - Additional metadata (name, type, size, etc.)
 */
export async function storeFile(id, data, metadata = {}) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ id, data, ...metadata, storedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = ({ target: { error } }) => reject(error);
  });
}

/**
 * Retrieves a file from IndexedDB.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getFile(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = ({ target: { result } }) => resolve(result || null);
    req.onerror = ({ target: { error } }) => reject(error);
  });
}

/**
 * Deletes a file from IndexedDB.
 * @param {string} id
 */
export async function deleteFile(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = ({ target: { error } }) => reject(error);
  });
}

/**
 * Lists all files in IndexedDB.
 * @returns {Promise<Array>}
 */
export async function listFiles() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = ({ target: { result } }) => resolve(result);
    req.onerror = ({ target: { error } }) => reject(error);
  });
}
```

---

## 13.3 Related Items Component

> **File:** `src/components/shared/RelatedItems.jsx`

This component renders a list of related item chips, replacing `Utils.renderRelatedItems()` and `Utils.renderConnections()`.

```jsx
import React from 'react';
import useRelationships from '../../hooks/useRelationships';
import { useAppDispatch, ACTIONS } from '../../context/AppContext';

/**
 * Renders related item chips for a given item.
 * Clicking a chip navigates to that item's section.
 */
const RelatedItems = ({ relatedItems = [] }) => {
  const { findItem } = useRelationships();
  const dispatch = useAppDispatch();

  if (relatedItems.length === 0) return null;

  const navigateTo = (section) => {
    dispatch({ type: ACTIONS.SET_SECTION, payload: section });
  };

  return (
    <div className="related-items-section">
      <div className="related-items-header">
        <h4>
          <img src="/icons/misc/link.svg" alt="" width="14" height="14" style={{ verticalAlign: 'middle' }} />
          {' '}Related Items
        </h4>
      </div>
      <div className="related-items-list">
        {relatedItems.map(({ id, type }) => {
          const item = findItem(id);
          if (!item) return null;
          const { name, category, section } = item;  // ← destructure found item
          return (
            <div
              key={`${id}-${type}`}
              className="related-item-chip"
              onClick={() => navigateTo(section)}
              style={{ cursor: 'pointer' }}
            >
              <span className="chip-name">{name}</span>
              <span className="chip-type">{category}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RelatedItems;
```

---

## 13.4 FilterBar Component

> **File:** `src/components/shared/FilterBar.jsx`

A generic, reusable filter bar that any section can use.

```jsx
import React from 'react';

/**
 * Renders a row of filter buttons.
 * @param {Array} filters - Array of filter values or {value, label} objects
 * @param {string} active - The currently active filter
 * @param {Function} onChange - Callback when a filter is selected
 */
const FilterBar = ({ filters, active, onChange }) => (
  <div className="filters">
    {filters.map((f) => {
      const { value, label } = typeof f === 'string' ? { value: f, label: f } : f;
      return (
        <button
          key={value}
          className={`filter-btn ${active === value ? 'active' : ''}`}
          onClick={() => onChange(value)}
        >
          {label.charAt(0).toUpperCase() + label.slice(1)}
        </button>
      );
    })}
  </div>
);

export default FilterBar;
```

---

## 13.5 Files Created

| File | Replaces |
|------|----------|
| `src/utils/helpers.js` | `Utils` object functions |
| `src/utils/fileStorage.js` | `FileStorage` object |
| `src/components/shared/RelatedItems.jsx` | `Utils.renderRelatedItems()` / `Utils.renderConnections()` |
| `src/components/shared/FilterBar.jsx` | Generic filter button rows |

---

**Next:** [Chapter 14 — Styling](./14-styling.md)

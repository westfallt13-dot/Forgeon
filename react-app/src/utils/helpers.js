/**
 * Utility functions ported from the original Forgeon vanilla JS app.
 * Provides ID generation, date formatting, HTML escaping, and markdown parsing.
 */

/**
 * Generates a unique ID using timestamp + random string
 * @returns {string} A unique identifier
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Formats a date string for human-readable display
 * @param {string} dateString - ISO format date string
 * @returns {string} Formatted date (e.g. "Jan 15, 2024")
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  // Handle date-only strings (YYYY-MM-DD) to avoid timezone issues
  if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  // Handle full datetime strings
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Checks if a given date is before today (ignores time component)
 * @param {string} dateString - Date in YYYY-MM-DD format or ISO datetime string
 * @returns {boolean} True if date is before today
 */
export function isDateBeforeToday(dateString) {
  if (!dateString) return false;
  let d;
  if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
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
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} text - Raw text that may contain HTML characters
 * @returns {string} HTML-escaped safe text
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Converts basic Markdown syntax to HTML.
 * Supports headers (#, ##, ###), bold (**), italic (*), lists (-), code blocks, links, and paragraphs.
 * @param {string} text - Markdown-formatted text
 * @returns {string} HTML version of the markdown
 */
export function parseMarkdown(text) {
  let html = escapeHtml(text);

  // Headers (h1, h2, h3)
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold and Italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Lists (lines starting with -)
  html = html.replace(/^- (.+)$/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Paragraphs (double newlines)
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';

  return html;
}

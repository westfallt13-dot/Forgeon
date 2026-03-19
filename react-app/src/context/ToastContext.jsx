import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

// ── Toast colors matching the original app ─────────────────────────────────────

const TOAST_COLORS = {
  success: 'linear-gradient(135deg, #10b981, #059669)',
  error: 'linear-gradient(135deg, #ef4444, #dc2626)',
  warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
  info: 'linear-gradient(135deg, #3b82f6, #2563eb)',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [prompt, setPrompt] = useState(null);
  const toastIdRef = useRef(0);

  // ── Toast ──────────────────────────────────────────────────────────────────

  const showToast = useCallback((message, type = 'success') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2000);
  }, []);

  // ── Confirm dialog ─────────────────────────────────────────────────────────

  const showConfirm = useCallback((message, onConfirm, onCancel = null) => {
    setConfirm({ message, onConfirm, onCancel });
  }, []);

  const handleConfirm = useCallback(() => {
    const cb = confirm?.onConfirm;
    setConfirm(null);
    if (cb) cb();
  }, [confirm]);

  const handleConfirmCancel = useCallback(() => {
    const cb = confirm?.onCancel;
    setConfirm(null);
    if (cb) cb();
  }, [confirm]);

  // ── Prompt dialog ──────────────────────────────────────────────────────────

  const showPrompt = useCallback((message, defaultValue = '', onSubmit, onCancel = null) => {
    setPrompt({ message, defaultValue, onSubmit, onCancel });
  }, []);

  const handlePromptSubmit = useCallback(
    (value) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      const cb = prompt?.onSubmit;
      setPrompt(null);
      if (cb) cb(trimmed);
    },
    [prompt]
  );

  const handlePromptCancel = useCallback(() => {
    const cb = prompt?.onCancel;
    setPrompt(null);
    if (cb) cb();
  }, [prompt]);

  return (
    <ToastContext.Provider value={{ showToast, showConfirm, showPrompt }}>
      {children}

      {/* Toast notifications */}
      {toasts.map((toast) => (
        <div key={toast.id} style={toastStyle(toast.type)}>
          {toast.message}
        </div>
      ))}

      {/* Confirm dialog */}
      {confirm && (
        <div style={overlayStyle} onClick={handleConfirmCancel}>
          <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
            <div style={messageStyle}>{confirm.message}</div>
            <div style={buttonContainerStyle}>
              <button
                style={cancelBtnStyle}
                className="btn btn-secondary"
                onClick={handleConfirmCancel}
              >
                Cancel
              </button>
              <button
                style={confirmBtnStyle}
                className="btn btn-danger"
                onClick={handleConfirm}
                autoFocus
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt dialog */}
      {prompt && <PromptDialog prompt={prompt} onSubmit={handlePromptSubmit} onCancel={handlePromptCancel} />}
    </ToastContext.Provider>
  );
}

// Extracted prompt dialog so it can manage its own input state
function PromptDialog({ prompt, onSubmit, onCancel }) {
  const [value, setValue] = useState(prompt.defaultValue);
  const inputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit(value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={{ ...dialogStyle, minWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
        <div style={messageStyle}>{prompt.message}</div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          style={inputStyle}
        />
        <div style={buttonContainerStyle}>
          <button style={cancelBtnStyle} className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            style={confirmBtnStyle}
            className="btn btn-primary"
            onClick={() => onSubmit(value)}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

function toastStyle(type) {
  return {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: TOAST_COLORS[type] || TOAST_COLORS.info,
    color: 'white',
    padding: '1rem 2rem',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    zIndex: 99999,
    fontSize: '1rem',
    fontWeight: 600,
    maxWidth: '400px',
    textAlign: 'center',
    pointerEvents: 'none',
  };
}

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 99999,
};

const dialogStyle = {
  background: 'var(--bg-primary, #fff)',
  borderRadius: '12px',
  padding: '2rem',
  maxWidth: '500px',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
};

const messageStyle = {
  color: 'var(--text-primary, #1a1a1a)',
  fontSize: '1rem',
  marginBottom: '1.5rem',
  whiteSpace: 'pre-line',
  lineHeight: 1.6,
};

const buttonContainerStyle = {
  display: 'flex',
  gap: '1rem',
  justifyContent: 'flex-end',
};

const cancelBtnStyle = { minWidth: '100px' };
const confirmBtnStyle = { minWidth: '100px' };

const inputStyle = {
  width: '100%',
  padding: '0.75rem',
  border: '1px solid var(--border-color, #d1d5db)',
  borderRadius: '6px',
  background: 'var(--bg-secondary, #f9fafb)',
  color: 'var(--text-primary, #1a1a1a)',
  fontSize: '1rem',
  marginBottom: '1.5rem',
  boxSizing: 'border-box',
};

/**
 * Hook to access the ToastContext
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastContext;

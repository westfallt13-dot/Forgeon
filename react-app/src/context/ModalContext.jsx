import { createContext, useContext, useState, useCallback } from 'react';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [modalContent, setModalContent] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback((content) => {
    setModalContent(content);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setModalContent(null);
  }, []);

  return (
    <ModalContext.Provider value={{ isOpen, modalContent, openModal, closeModal }}>
      {children}
      {isOpen && (
        <div className="modal-overlay" onClick={closeModal} style={overlayStyle}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={dialogStyle}
          >
            {modalContent}
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
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
  maxWidth: '600px',
  width: '90%',
  maxHeight: '90vh',
  overflow: 'auto',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
};

/**
 * Hook to access the ModalContext
 */
export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}

export default ModalContext;

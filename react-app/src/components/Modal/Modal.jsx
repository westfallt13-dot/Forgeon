import { useEffect } from 'react';
import { useModal } from '../../context/ModalContext';

export default function Modal() {
  const { isOpen, closeModal } = useModal();

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        closeModal();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeModal]);

  // The ModalContext already renders the modal overlay/dialog inline.
  // This component adds ESC key support.
  return null;
}

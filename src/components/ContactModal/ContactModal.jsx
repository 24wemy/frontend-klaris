import React, { useRef, useEffect } from 'react';
import './ContactModal.css';

const ContactModal = ({ isOpen, onClose }) => {
    const modalRef = useRef(null);

     useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;
  return (
    <div className="contact-modal-overlay">
      <div className="contact-modal-content" ref={modalRef}>
        <span className="close-button" onClick={onClose}>
          ×
        </span>
        <h2>Contact Developer</h2>
        <div className="contact-info">
          <p>If you encounter any bugs or have any feedback, feel free to reach out to the developer:</p>
          <ul>
            <li><strong>Email:</strong> <a>klabatiris.ai@gmail.com</a></li>
          </ul>
             <p>Thank you!</p>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;
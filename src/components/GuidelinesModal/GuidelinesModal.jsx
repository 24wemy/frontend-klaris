import React, { useRef, useEffect } from 'react';
import './GuidelinesModal.css';

const GuidelinesModal = ({ isOpen, onClose }) => {
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
    <div className="guidelines-modal-overlay">
      <div className="guidelines-modal-content" ref={modalRef}>
        <span className="close-button" onClick={onClose}>
          ×
        </span>
        <h2>How to Use This System</h2>
        <div className="guidelines-content">
          <p>Welcome to the UNKLAB Virtual Assistant System! Here's a quick guide on how to interact with me:</p>
          <ul>
            <li><strong>Voice Input:</strong> Click the microphone button to start speaking. I will process your request.</li>
            <li><strong>Audio Output:</strong> I will provide answers and optionally with voice.</li>
            <li><strong>Ask questions:</strong> ask question about Universitas Klabat (UNKLAB) or about me.</li>
            <li><strong>Bug Report:</strong> If you find any bugs or issues, please contact the developer using the "Contact Developer" button.</li>
          </ul>
           <p>Thank you for using this system!</p>
        </div>
      </div>
    </div>
  );
};

export default GuidelinesModal;
import React, { useState } from 'react';
import LoginModal from '../LoginModal/LoginModal';
import GuidelinesModal from '../GuidelinesModal/GuidelinesModal';
import ContactModal from '../ContactModal/ContactModal';
import './Sidebar.css'; // Import CSS for Sidebar
import { FaUser, FaSignOutAlt, FaBook, FaEnvelope } from 'react-icons/fa'; // Import icons
import { useNavigate } from 'react-router-dom';

const Sidebar = ({ isLoggedIn, username, handleLogout, handleLogin }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const navigate = useNavigate()

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const openModal = (modalName) => {
    setActiveModal(modalName);
    setIsSidebarOpen(false); // Menutup sidebar setelah memilih opsi
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const handleLogoutClick = () => {
    handleLogout();
    navigate('/')
  }

  return (
    <>
      {/* Hamburger Menu */}
      <div className="hamburger-menu" onClick={toggleSidebar}>
        ☰
      </div>

      {/* Sidebar */}
      <div className={`sidebar-container ${isSidebarOpen ? 'open' : ''}`}>
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          ×
        </button>
        <div className="sidebar-content">
          {isLoggedIn ? (
            <div className="sidebar-item" onClick={handleLogoutClick}>
              <span><FaSignOutAlt /></span>
              <span>Logout as {username}</span>
            </div>
          ) : (
            <div className="sidebar-item" onClick={() => openModal('login')}>
              <span><FaUser /></span>
              <span>Login</span>
            </div>
          )}
          <div className="sidebar-item" onClick={() => openModal('guidelines')}>
            <span><FaBook /></span>
            <span>Guidelines</span>
          </div>
          <div className="sidebar-item" onClick={() => openModal('contact')}>
            <span><FaEnvelope /></span>
            <span>Contact</span>
          </div>
          <div style={{ 
            position: 'absolute',
            bottom: '50px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'white',
            padding: '20px',
            textAlign: 'center',
            width: '100%'
          }}>
            @Klaris AI v.0.1 - 2025
          </div>
        </div>
      </div>

      {/* Modals */}
      <LoginModal isOpen={activeModal === 'login'} onClose={closeModal} onLogin={handleLogin} />
      <GuidelinesModal isOpen={activeModal === 'guidelines'} onClose={closeModal} />
      <ContactModal isOpen={activeModal === 'contact'} onClose={closeModal} />
    </>
  );
};

export default Sidebar;
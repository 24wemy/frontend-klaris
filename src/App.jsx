import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Avatar } from './components/Avatar/Avatar';
import Sidebar from './components/Sidebar/Sidebar';
import './App.css';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import PageAdmin from './components/PageAdmin/pageAdmin';
import Chatbot from './components/Chatbot/Chatbot'; // Import Chatbot component

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [showAvatar, setShowAvatar] = useState(true);
  const navigate = useNavigate();

  const handleLogin = (uname) => {
    setIsLoggedIn(true);
    setUsername(uname);
    navigate('/admin'); // Navigasi ke halaman admin
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    navigate('/');
  };

  const handleContentClick = () => {
    setShowAvatar(false);
  };

  const handleAvatarClick = () => {
    setShowAvatar(true);
  };
  // PrivateRoute Component
  const PrivateRoute = ({ children }) => {
    return isLoggedIn ? children : <Navigate to="/" />;
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', display: 'flex', overflow: 'hidden' }}>
      <Routes>
        <Route path="/" element={
          <>
            <Sidebar
              isLoggedIn={isLoggedIn}
              username={username}
              handleLogin={handleLogin}
              handleLogout={handleLogout}
              onContentClick={handleContentClick}
            />
            {showAvatar && (
              <Canvas
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  zIndex: showAvatar ? 1 : -1,
                  pointerEvents: showAvatar ? 'auto' : 'none',
                  touchAction: 'none',
                  overflow: 'hidden'
                }}
                camera={{
                  position: [0, 1.5, 5],
                  fov: 45
                }}
                onContextMenu={(e) => e.preventDefault()}
                onWheel={(e) => {
                  // Remove preventDefault to avoid passive event listener warning
                  e.stopPropagation();
                }}
                onClick={handleAvatarClick}
              >
                <ambientLight intensity={0.6} />
                <pointLight position={[10, 10, 10]} />
                <pointLight position={[-10, 5, 5]} intensity={0.8} color="#ffffff" />
                <directionalLight
                  position={[-5, 3, 0]}
                  intensity={0.5}
                  castShadow
                  shadow-mapSize-width={1024}
                  shadow-mapSize-height={1024}
                />
                <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
                <Avatar />
              </Canvas>
            )}
          </>
        } />
        <Route path="/admin" element={<PrivateRoute><PageAdmin /></PrivateRoute>} />
      </Routes>
        <Chatbot avatarEndpoint="/api/chatbot" />
    </div>
  );
}

export default App;
import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Avatar } from './components/Avatar/Avatar';
import Sidebar from './components/Sidebar/Sidebar';
import './App.css';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import PageAdmin from './components/PageAdmin/pageAdmin'; 

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
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
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
                       position: 'absolute',
                       top: 0,
                       left: 0,
                       zIndex: showAvatar ? 1 : -1,
                       pointerEvents: showAvatar ? 'auto' : 'none'
                   }}
                   camera={{
                       position: [0, 1.5, 5],
                       fov: 45
                   }}
                   onContextMenu={(e) => e.preventDefault()}
                   onWheel={(e) => e.preventDefault()}
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
    </div>
  );
}

export default App;
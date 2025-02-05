import React, { useState, useRef, useEffect } from 'react';
import './LoginModal.css';

const LoginModal = ({ isOpen, onClose, onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const modalRef = useRef(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const backendUrl = 'https://klaris.my.id/backend'; // Definisi URL backend

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

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch(`${backendUrl}/api/login`, { // Memakai backendUrl
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Login successful:', data.message);
                setIsAuthenticated(true);
                onLogin(username); // Call onLogin after successful authentication
                onClose();
                setUsername('');
                setPassword('');
                setShowPassword(false);
            } else {
                alert(`Login Failed: ${data.message}`);
            }
        } catch (error) {
            console.error('Error during login:', error);
            alert('An error occurred during login.');
        }
    };


    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    if (!isOpen) return null;

    return (
        <div className="login-modal-overlay">
            <div className="login-modal-content" ref={modalRef}>
                <span className="close-button" onClick={onClose}>
                    ×
                </span>
                <h2>Login Admin</h2>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <span
                            className="password-toggle-icon"
                            onClick={togglePasswordVisibility}
                        >
                            {showPassword ? "👁️" : "👁️‍🗨️"}
                        </span>
                    </div>
                    <button type="submit">Login</button>
                </form>
            </div>
        </div>
    );
};

export default LoginModal;
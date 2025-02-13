import React, { useState, useRef, useEffect } from 'react';
import './Chatbot.css';
import axios from 'axios';
import { FaPaperPlane, FaTrash, FaTimes, FaComments, FaCircle } from 'react-icons/fa';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const chatContainerRef = useRef(null);
    const messagesEndRef = useRef(null);
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000';

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    const handleInputChange = (e) => {
        setInputText(e.target.value);
    };

    const clearChat = () => {
        setMessages([]);
    };

    const sendMessage = async () => {
        if (!inputText.trim()) return;

        const newMessage = { text: inputText, sender: 'user' };
        setMessages(prevMessages => [...prevMessages, newMessage]);
        setInputText('');
        setIsTyping(true);

        try {
            const response = await axios.post(`${backendUrl}/api/query`, {
                query: inputText
            });

            const botReply = { 
                text: response.data.answer || "I don't understand. Please try again.", 
                sender: 'bot' 
            };
            setMessages(prevMessages => [...prevMessages, botReply]);
        } catch (error) {
            console.error('Chatbot API Error:', error);
            const errorReply = { 
                text: "Sorry, I'm having trouble connecting. Please try again later.", 
                sender: 'bot' 
            };
            setMessages(prevMessages => [...prevMessages, errorReply]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleInputKeyPress = (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };

    // Add click event listener to close chat when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isOpen && 
                chatContainerRef.current && 
                !chatContainerRef.current.contains(event.target) &&
                !event.target.closest('.chatbot-toggle')) {
                setIsOpen(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className={`chatbot-container ${isOpen ? 'open' : ''}`}>
            <button className="chatbot-toggle" onClick={toggleChat}>
                <FaComments size={24} color="white" />
            </button>

            <div className="chatbot-window" ref={chatContainerRef}>
                <div className="chatbot-header">
                    <div className="chatbot-header-left">
                        <div className="chatbot-icon">
                            <FaComments size={24} color="white" />
                        </div>
                        <div className="chatbot-title">
                            <span>Klaris AI</span>
                            <div className="chatbot-status">
                                <FaCircle size={10} style={{ color: '#10B981', animation: 'pulse 2s infinite' }} />
                                <span>Online</span>
                            </div>
                        </div>
                    </div>
                    <div className="chatbot-header-right">
                        <button className="chatbot-clear" onClick={clearChat} title="Clear chat">
                            <FaTrash size={16} color="white" />
                        </button>
                        <button className="chatbot-close" onClick={toggleChat} title="Close chat">
                            <FaTimes size={16} color="white" />
                        </button>
                    </div>
                </div>

                <div className="chatbot-messages">
                    {messages.map((message, index) => (
                        <div key={index} className={`message ${message.sender}`}>
                            {message.text}
                        </div>
                    ))}
                    {isTyping && (
                        <div className="typing-indicator">
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="chatbot-input">
                    <input
                        type="text"
                        placeholder="Type your message..."
                        value={inputText}
                        onChange={handleInputChange}
                        onKeyPress={handleInputKeyPress}
                    />
                    <button onClick={sendMessage}>
                        <FaPaperPlane size={16} color="white" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chatbot;

import React from 'react';
import './VoiceChatInterface.css';

const renderRecordIcon = (recordIconState, isListening) => {
    switch (recordIconState) {
        case 'overridden':
            return (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="orange" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" fill="currentColor"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" fill="currentColor"/>
                </svg>
            );
        case 'custom':
            return (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="purple" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 13.5c-4.135 0-7.5 3.365-7.5 7.5h15c0-4.135-3.365-7.5-7.5-7.5z" fill="currentColor"/>
                </svg>
            );
        default:
            return isListening ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" fill="white"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" fill="white"/>
                    <circle cx="12" cy="12" r="11" stroke="white" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6">
                        <animateTransform
                            attributeName="transform"
                            attributeType="XML"
                            type="rotate"
                            from="0 12 12"
                            to="360 12 12"
                            dur="4s"
                            repeatCount="indefinite"
                        />
                    </circle>
                </svg>
            ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" fill="white"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" fill="white"/>
                </svg>
            );
    }
};

export const VoiceChatInterface = ({
    isListening,
    loading,
    isPlaying,
    toggleListening,
    isHidden,
    recordIconState
}) => {
    if (isHidden) {
        return null;
    }

    // Deteksi browser Android
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    // Handler untuk sentuh
    const handleTouchStart = (e) => {
        e.preventDefault(); // Mencegah perilaku default
        if (!isPlaying) {
            toggleListening();
        }
    };

    return (
        <div className="voice-chat-interface">
            <div>
                <button
                    onClick={!isAndroid ? toggleListening : undefined}
                    onTouchStart={isAndroid ? handleTouchStart : undefined}
                    onTouchEnd={isAndroid ? handleTouchStart : undefined}
                    className={isListening ? 'listening' : 'notlistening'}
                    disabled={isPlaying}
                    style={{
                        WebkitTapHighlightColor: 'transparent',
                        WebkitTouchCallout: 'none',
                        WebkitUserSelect: 'none',
                        touchAction: 'manipulation'
                    }}
                >
                    {renderRecordIcon(recordIconState, isListening)}
                </button>

                <div>
                    {isListening && (
                        <div className='listening-indicator'>
                            <div />
                            <b>Mendengarkan...</b>
                        </div>
                    )}
                    {loading && (
                        <div className='loading-indicator'>
                            <div />
                            <b>Memproses...</b>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
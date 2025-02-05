import React from 'react';

export const ConversationDisplay = ({ answerText }) => {
    return (
        <>
          {answerText && (
            <div style={{
                position: 'fixed',
                left: '-270px', 
                bottom: '140px',
                width: '200px',
                color: 'white',
                fontSize: '10px',
                textAlign: 'left',
                wordWrap: 'break-word',
                animation: 'fadeIn 0.5s ease-out forwards',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                zIndex: 10,
                transform: 'translateX(0)'
            }}>
                {answerText}
            </div>
          )}
          <style>
            {`
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateX(-20px); }
                  to { opacity: 1; transform: translateX(0); }
                }
            `}
        </style>
        </>
      );
  };
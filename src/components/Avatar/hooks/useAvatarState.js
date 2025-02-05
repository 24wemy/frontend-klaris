import { useState } from "react";

// Custom hook for avatar state management
export const useAvatarState = () => {
    const [audioUrl, setAudioUrl] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [lipSyncData, setLipSyncData] = useState([]);
    const [conversation, setConversation] = useState([]);

    return {
        audioUrl,
        isPlaying,
        lipSyncData,
        conversation,
        setAudioUrl,
        setIsPlaying,
        setLipSyncData,
        setConversation
    };
};
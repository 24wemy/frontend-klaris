import React, { useRef, useEffect, useState, Suspense, useCallback } from "react";
import { useGLTF, useFBX, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from 'three';
import axios from 'axios';
import { VISEME_MAP, FACIAL_EXPRESSIONS } from "./constants";
import { useAvatarState } from "./hooks/useAvatarState";
import { lerpMorphTarget } from "../../utils";
//import { ConversationDisplay } from "../ConversationDisplay/ConversationDisplay"; // Commented out import
import { VoiceChatInterface } from "../VoiceChatInterface/VoiceChatInterface";

export function Avatar() {
    // Refs
    const audioRef = useRef(null);
    const groupRef = useRef();
    const mixerRef = useRef();
    const recognitionRef = useRef(null);
    const idleActionRef = useRef(null);
    const audioPlayOnceRef = useRef(false);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const smileTimerRef = useRef(null);

    // State
    const [isListening, setIsListening] = useState(false);
    const [loading, setLoading] = useState(false);
    const [, setError] = useState('');
    const [blink, setBlink] = useState(false);
    const [facialExpression, setFacialExpression] = useState("bigSmile");
    const [smileIntensity, setSmileIntensity] = useState(1);
    const [answerText, setAnswerText] = useState('');
    const [isMobile] = useState(() => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    });

    // Get avatar state from custom hook
    const {
        audioUrl,
        isPlaying,
        lipSyncData,
        setAudioUrl,
        setLipSyncData,
        setIsPlaying,
        setConversation
    } = useAvatarState();

    // Load 3D models and animations
    const { nodes, materials } = useGLTF("/models/klaris2.glb");
    const { animations: idleAnimations } = useFBX("/animations/id.fbx");

    // Dynamic smile effect
    useEffect(() => {
        const updateSmile = () => {
            // Randomly choose between big and small smile
            const newExpression = Math.random() > 0.5 ? "bigSmile" : "smallSmile";
            setFacialExpression(newExpression);

            // Random intensity variation
            setSmileIntensity(0.7 + Math.random() * 0.3);

            // Set next update interval (between 2-5 seconds)
            smileTimerRef.current = setTimeout(updateSmile, 2000 + Math.random() * 3000);
        };

        updateSmile();
        return () => clearTimeout(smileTimerRef.current);
    }, []);


    // Process audio and generate lip sync data
    const processAudioFile = useCallback((url) => {
        setAudioUrl(url);

        // Generate temporary lip sync data with moderate values
const tempLipSyncData = Array.from({ length: 200 }, (_, i) => {
            const start = i * 0.15; // Overlapping starts by reducing the interval
            const end = (i + 1) * 0.25; // Longer end duration
            return {
                start: start,
                end: end,
                viseme: Object.keys(VISEME_MAP)[Math.floor(Math.random() * 8)],
                weight: 0.4 + Math.random() * 0.2 // Reduced weight range to 0.4-0.6 for more natural movement
            };
        });

        setLipSyncData(tempLipSyncData);
    }, [setAudioUrl]);

    // Add message to conversation
    const addToConversation = useCallback((role, message) => {
        setConversation(prev => [...prev, { role, message }]);
    }, [setConversation]);

    // Send query to backend
    const sendQueryToBackend = useCallback(async (query, audioBlob) => {
        setLoading(true);
        setAudioUrl('');
        setError('');
        setAnswerText('');
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://klaris.my.id/backend';
            const response = await axios.post(`${backendUrl}/api/query`, {
                query,
                audio: audioBlob,
                isMobile: isMobile // Send device info to backend
            }, {
                headers: { 'Content-Type': 'application/json' }
            });

            const answer = response.data.answer || 'No answer available.';
            addToConversation('assistant', answer);
            setAnswerText(answer);

            if (response.data.audio_file) {
                const audioUrl = `${backendUrl}/api/audio/${response.data.audio_file}`;
                processAudioFile(audioUrl);
                
                // For mobile, ensure audio plays
                if (isMobile) {
                    const audio = new Audio(audioUrl);
                    audio.play().catch(console.error);
                }
            }
        } catch (err) {
            console.error('Backend Error:', err);
            setError('Failed to connect to server. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [addToConversation, processAudioFile, setAudioUrl, setError, isMobile]);

    // Speech recognition handler
    const handleSpeechResult = useCallback((event) => {
        if (event.results?.[0]?.[0]) {
            const transcript = event.results[0][0].transcript;
            setIsListening(false);
            addToConversation('user', transcript);
            sendQueryToBackend(transcript);
        }
    }, [addToConversation, sendQueryToBackend]);

   // Initialize speech recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.lang = 'id-ID';
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.onresult = handleSpeechResult;

            recognitionRef.current.onerror = (event) => {
                console.error('Speech Recognition Error:', event.error);
                setIsListening(false);
                setError(event.error === 'no-speech'
                    ? 'No speech detected. Please try again.'
                    : 'Speech recognition error. Please try again.');

                if (event.error === 'no-speech') {
                    recognitionRef.current?.stop();
                }
            };
        } else {
           setError('Speech recognition not supported in this browser.');
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current.onresult = null;
                recognitionRef.current.onerror = null;
            }
        };
    }, [handleSpeechResult, setError]);

    // Toggle listening state
    const toggleListening = async () => {
        if (isListening) {
            // Stop recording and recognition
            mediaRecorderRef.current?.state === 'recording' && mediaRecorderRef.current.stop();
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            // Start recording and recognition
            setError('');
            chunksRef.current = [];

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: true,
                    video: false // Explicitly disable video
                });
                
                // Use lower quality audio for mobile
                const options = isMobile ? {
                    mimeType: 'audio/webm;codecs=opus',
                    bitsPerSecond: 16000
                } : {
                    mimeType: 'audio/webm'
                };

                mediaRecorderRef.current = new MediaRecorder(stream, options);

                mediaRecorderRef.current.ondataavailable = (event) => {
                    event.data.size > 0 && chunksRef.current.push(event.data);
                };

                mediaRecorderRef.current.onstop = () => {
                    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                    sendQueryToBackend('', audioBlob);
                    
                    // Clean up stream tracks
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorderRef.current.start();
                recognitionRef.current?.start();
                setIsListening(true);
            } catch (err) {
                console.error('Microphone Access Error:', err);
                setError('Failed to access microphone. Please check permissions.');
                setIsListening(false);
                if (mediaRecorderRef.current?.state === 'recording') {
                    mediaRecorderRef.current.stop();
                }
            }
        }
    };

    // Setup animations and mixer
    useEffect(() => {
        if (groupRef.current && idleAnimations.length > 0) {
            mixerRef.current = new THREE.AnimationMixer(groupRef.current);

            idleActionRef.current = mixerRef.current.clipAction(idleAnimations[0]);
            idleActionRef.current.play();
        }

        return () => mixerRef.current?.stopAllAction();
    }, [idleAnimations]);

    // Setup lighting
    useEffect(() => {
        if (!groupRef.current) return;

        // Simplified lighting for mobile
        if (isMobile) {
            const mainLight = new THREE.DirectionalLight(0xffffff, 2);
            mainLight.position.set(0, 2, 3);
            groupRef.current.add(mainLight);

            const ambientLight = new THREE.AmbientLight(0x404040, 1);
            groupRef.current.add(ambientLight);

            return () => {
                groupRef.current.remove(mainLight);
                groupRef.current.remove(ambientLight);
            };
        }

        // Full lighting setup for desktop
        const mainLight = new THREE.DirectionalLight(0xfff5e6, 1.6);
        mainLight.position.set(0, 2, 3);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.1;
        mainLight.shadow.camera.far = 1000;
        mainLight.shadow.bias = -0.00001;
        groupRef.current.add(mainLight);

        const fillLight = new THREE.DirectionalLight(0xb6ceff, 0.3);
        fillLight.position.set(-2, 1.5, -1.5);
        fillLight.castShadow = true;
        groupRef.current.add(fillLight);

        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        groupRef.current.add(ambientLight);

        const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
        rimLight.position.set(0, 2.5, -4);
        groupRef.current.add(rimLight);

        const eyeLight1 = new THREE.SpotLight(0xffffff, 0.6);
        eyeLight1.position.set(0.4, 2.1, 2.8);
        eyeLight1.angle = Math.PI / 6;
        eyeLight1.penumbra = 0.7;
        eyeLight1.decay = 2;
        eyeLight1.distance = 8;
        groupRef.current.add(eyeLight1);

        const eyeLight2 = new THREE.SpotLight(0xffffff, 0.4);
        eyeLight2.position.set(-1.2, 2.1, 2.8);
        eyeLight2.angle = Math.PI / 8;
        eyeLight2.penumbra = 0.7;
        eyeLight2.decay = 2;
        eyeLight2.distance = 8;
        groupRef.current.add(eyeLight2);

        const bounceLight = new THREE.DirectionalLight(0xfff5e6, 0.15);
        bounceLight.position.set(0, -2.5, 1.5);
        groupRef.current.add(bounceLight);

        const hairLight = new THREE.SpotLight(0xfff5e6, 0.25);
        hairLight.position.set(1.5, 4, -1.5);
        hairLight.angle = Math.PI / 4;
        hairLight.penumbra = 0.4;
        groupRef.current.add(hairLight);

        const faceLight = new THREE.SpotLight(0xffffff, 1.3);
        faceLight.position.set(0, 2.3, 2.5);
        faceLight.angle = Math.PI / 4;
        faceLight.penumbra = 0.2;
        faceLight.decay = 2;
        faceLight.distance = 4;
        groupRef.current.add(faceLight);

        const sideLight = new THREE.DirectionalLight(0xffffff, 0.2);
        sideLight.position.set(3, 2, 0);
        groupRef.current.add(sideLight);

        const topLight = new THREE.DirectionalLight(0xffffff, 0.15);
        topLight.position.set(0, 4, 0);
        groupRef.current.add(topLight);

        return () => {
            if (groupRef.current) {
                groupRef.current.remove(mainLight);
                groupRef.current.remove(fillLight);
                groupRef.current.remove(ambientLight);
                groupRef.current.remove(rimLight);
                groupRef.current.remove(eyeLight1);
                groupRef.current.remove(eyeLight2);
                groupRef.current.remove(bounceLight);
                groupRef.current.remove(hairLight);
                groupRef.current.remove(faceLight);
                groupRef.current.remove(sideLight);
                groupRef.current.remove(topLight);
            }
        };
    }, [isMobile]);

    // Handle audio playback
    useEffect(() => {
        if (!audioUrl) return;

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        const handlePlay = () => {
            setIsPlaying(true);
        };

        const handleEnd = () => {
            setIsPlaying(false);
            if (nodes.Wolf3D_Head && nodes.Wolf3D_Teeth) {
                Object.values(VISEME_MAP).forEach(viseme => {
                    [nodes.Wolf3D_Head, nodes.Wolf3D_Teeth].forEach(node => {
                        if (node.morphTargetDictionary[viseme] !== undefined) {
                            node.morphTargetInfluences[node.morphTargetDictionary[viseme]] = 0.1;
                        }
                    });
                });
            }
            audioPlayOnceRef.current = false;
        };

        const handleError = (error) => {
            console.error("Audio Playback Error:", error);
            setIsPlaying(false);
            setError("Error playing audio.");
            audioPlayOnceRef.current = false;
        };

        audio.addEventListener("play", handlePlay);
        audio.addEventListener("ended", handleEnd);
        audio.addEventListener("error", handleError);

        // For mobile, add user interaction requirement
        if (isMobile) {
            const playAudio = () => {
                if (!audioPlayOnceRef.current) {
                    audio.play().catch(handleError);
                    audioPlayOnceRef.current = true;
                }
                document.removeEventListener('touchstart', playAudio);
            };
            document.addEventListener('touchstart', playAudio);
        } else if (!audioPlayOnceRef.current) {
            audio.play().catch(handleError);
            audioPlayOnceRef.current = true;
        }

        return () => {
            audio.removeEventListener("play", handlePlay);
            audio.removeEventListener("ended", handleEnd);
            audio.removeEventListener("error", handleError);
            if (isMobile) {
                document.removeEventListener('touchstart', () => {});
            }
            audio.pause();
            audio.currentTime = 0;
        };
    }, [audioUrl, nodes, setIsPlaying, setError, isMobile]);

    // Automatic blinking
    useEffect(() => {
        let blinkTimer;

        const triggerBlink = () => {
            blinkTimer = setTimeout(() => {
                setBlink(true);
                setTimeout(() => {
                    setBlink(false);
                    triggerBlink();
                }, 200);
            }, 5000 + Math.random() * 3000);
        };

        triggerBlink();
        return () => clearTimeout(blinkTimer);
    }, []);

   // Animation frame updates
    useFrame((state, delta) => {
        // Update animation mixer
        mixerRef.current?.update(delta);

        // Update eye blinks
        lerpMorphTarget(groupRef, smileIntensity, "eyeBlinkLeft", blink ? 1 : 0, 0.5);
        lerpMorphTarget(groupRef, smileIntensity, "eyeBlinkRight", blink ? 1 : 0, 0.5);

        // Update facial expressions
        if (nodes.EyeLeft?.morphTargetDictionary) {
            Object.keys(nodes.EyeLeft.morphTargetDictionary).forEach(key => {
                if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") return;

                const expression = FACIAL_EXPRESSIONS[facialExpression];
                lerpMorphTarget(groupRef, smileIntensity, key, expression?.[key] || 0, 0.1);
            });
        }

        // Update lip sync with moderate values
        if (!audioRef.current?.currentTime || !isPlaying || !lipSyncData.length) return;

        const currentTime = audioRef.current.currentTime;
        const currentViseme = lipSyncData.find(
            data => currentTime >= data.start && currentTime <= data.end
        );

        if (nodes.Wolf3D_Head && nodes.Wolf3D_Teeth) {
            Object.values(VISEME_MAP).forEach(viseme => {
                [nodes.Wolf3D_Head, nodes.Wolf3D_Teeth].forEach(node => {
                    if (node.morphTargetDictionary[viseme] !== undefined) {
                        node.morphTargetInfluences[node.morphTargetDictionary[viseme]] = 0.1;
                    }
                });
            });

            if (currentViseme && VISEME_MAP[currentViseme.viseme]) {
                const viseme = VISEME_MAP[currentViseme.viseme];
                const weight = Math.min(0.5, currentViseme.weight || 0.4);

                [nodes.Wolf3D_Head, nodes.Wolf3D_Teeth].forEach(node => {
                    if (node.morphTargetDictionary[viseme] !== undefined) {
                        node.morphTargetInfluences[node.morphTargetDictionary[viseme]] = weight;
                    }
                });
            }
        }
    });

    // Head tracking
    useFrame((state) => {
        const head = groupRef.current?.getObjectByName("Head");
        if (head) {
            const cameraPos = state.camera.position.clone();
            cameraPos.y = head.position.y;
            head.lookAt(cameraPos);
        }
    });

    return (
        <Suspense fallback={<Html>Loading...</Html>}>
            <group ref={groupRef} position={[-0, -15, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={9.1}>
                <primitive object={nodes.Hips} />
                <skinnedMesh
                    name="EyeLeft"
                    geometry={nodes.EyeLeft.geometry}
                    material={materials.Wolf3D_Eye}
                    skeleton={nodes.EyeLeft.skeleton}
                    morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
                    morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
                />
                <skinnedMesh
                    name="EyeRight"
                    geometry={nodes.EyeRight.geometry}
                    material={materials.Wolf3D_Eye}
                    skeleton={nodes.EyeRight.skeleton}
                    morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
                    morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
                />
                <skinnedMesh
                    name="Wolf3D_Head"
                    geometry={nodes.Wolf3D_Head.geometry}
                    material={materials.Wolf3D_Skin}
                    skeleton={nodes.Wolf3D_Head.skeleton}
                    morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
                    morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
                />
                <skinnedMesh
                    name="Wolf3D_Teeth"
                    geometry={nodes.Wolf3D_Teeth.geometry}
                    material={materials.Wolf3D_Teeth}
                    skeleton={nodes.Wolf3D_Teeth.skeleton}
                    morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
                    morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
                />
                <skinnedMesh
                    geometry={nodes.Wolf3D_Hair.geometry}
                    material={materials.Wolf3D_Hair}
                    skeleton={nodes.Wolf3D_Hair.skeleton}
                />
                <skinnedMesh
                    geometry={nodes.Wolf3D_Body.geometry}
                    material={materials.Wolf3D_Body}
                    skeleton={nodes.Wolf3D_Body.skeleton}
                />
                <skinnedMesh
                    geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
                    material={materials.Wolf3D_Outfit_Bottom}
                    skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
                />
                <skinnedMesh
                    geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
                    material={materials.Wolf3D_Outfit_Footwear}
                    skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
                />
                <skinnedMesh
                    geometry={nodes.Wolf3D_Outfit_Top.geometry}
                    material={materials.Wolf3D_Outfit_Top}
                    skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
                />
            </group>

            {/* Voice chat interface */}
           <Html position={[0, isMobile ? -1.5 : -2.5, 0]} style={{ 
               pointerEvents: 'auto',
               transform: isMobile ? 'scale(1.5)' : 'none' 
           }}>
              <VoiceChatInterface
                  isListening={isListening}
                  loading={loading}
                  isPlaying={isPlaying}
                  toggleListening={toggleListening}
                  isMobile={isMobile}
                  answerText={answerText}
              />
           </Html>
        </Suspense>
    );
}

// Preload assets
useGLTF.preload("/models/klaris2.glb");
useFBX.preload("/animations/id.fbx");
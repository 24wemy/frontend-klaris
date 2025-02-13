import React, { useRef, useEffect, useState, Suspense, useCallback } from "react";
import { useGLTF, useFBX, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import axios from "axios";
import { VISEME_MAP, FACIAL_EXPRESSIONS, morphTargets } from "./constants";
import { useAvatarState } from "./hooks/useAvatarState";
import { lerpMorphTarget } from "../../utils"; // Pastikan fungsi ini melakukan interpolasi: 
// child.morphTargetInfluences[index] = THREE.MathUtils.lerp(child.morphTargetInfluences[index], value, speed);
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
  const [, setError] = useState("");
  const [blink, setBlink] = useState(false);
  const [facialExpression, setFacialExpression] = useState("bigSmile");
  const [smileIntensity, setSmileIntensity] = useState(1);
  const [answerText, setAnswerText] = useState("");

  // Ambil state dari custom hook
  const {
    audioUrl,
    isPlaying,
    lipSyncData,
    setAudioUrl,
    setLipSyncData,
    setIsPlaying,
    setConversation,
  } = useAvatarState();

  // Load model 3D dan animasi
  const { nodes, materials } = useGLTF("/models/klaris2.glb");
  const { animations: idleAnimations } = useFBX("/animations/id.fbx");

  // Debug: Tampilkan morphTargetDictionary untuk verifikasi mapping viseme
  useEffect(() => {
    if (nodes.Wolf3D_Head && nodes.Wolf3D_Teeth) {
      console.log("Wolf3D_Head morphTargetDictionary:", nodes.Wolf3D_Head.morphTargetDictionary);
      console.log("Wolf3D_Teeth morphTargetDictionary:", nodes.Wolf3D_Teeth.morphTargetDictionary);
    }
  }, [nodes]);

  // Efek senyum dinamis
  useEffect(() => {
    const updateSmile = () => {
      // Pilih ekspresi secara acak antara "bigSmile" dan "smallSmile"
      const newExpression = Math.random() > 0.5 ? "bigSmile" : "smallSmile";
      setFacialExpression(newExpression);

      // Variasi intensitas senyum
      setSmileIntensity(0.7 + Math.random() * 0.3);

      // Interval update antara 2-5 detik
      smileTimerRef.current = setTimeout(updateSmile, 2000 + Math.random() * 3000);
    };

    updateSmile();
    return () => clearTimeout(smileTimerRef.current);
  }, []);

  // Proses file audio untuk menghasilkan data lip sync
  const processAudioFile = useCallback(
    (url) => {
      setAudioUrl(url);
    },
    [setAudioUrl]
  );

  // Tambahkan pesan ke percakapan
  const addToConversation = useCallback(
    (role, message) => {
      setConversation((prev) => [...prev, { role, message }]);
    },
    [setConversation]
  );

  // Kirim query ke backend
  const sendQueryToBackend = useCallback(
    async (query, audioBlob) => {
      setLoading(true);
      setAudioUrl("");
      setError("");
      setAnswerText("");
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:5000";
        let audioData = "";
        if (audioBlob) {
          // Ubah Blob ke base64
          audioData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(",")[1]);
            reader.readAsDataURL(audioBlob);
          });
        }

        const response = await axios.post(
          `${backendUrl}/api/query`,
          { query, audio: audioData },
          { headers: { "Content-Type": "application/json" } }
        );

        const answer = response.data.answer || "No answer available.";
        addToConversation("assistant", answer);
        setAnswerText(answer);

        console.log("Respons dari backend:", response.data);

        if (response.data.audio_file) {
          const audioFileUrl = `${backendUrl}/api/audio/${response.data.audio_file}`;
          setAudioUrl(audioFileUrl);
        }

        if (response.data.lipsync_data) {
          // Pastikan lipsync_data adalah string, kemudian parse JSON-nya
          if (typeof response.data.lipsync_data === "string") {
            setLipSyncData(JSON.parse(response.data.lipsync_data));
          } else {
            console.error("lipsync_data bukan string:", response.data.lipsync_data);
            setLipSyncData({});
          }
        }
      } catch (err) {
        console.error("Backend Error:", err);
        setError("Failed to connect to server. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [addToConversation, setAudioUrl, setError, setLipSyncData]
  );

  // Handler untuk Speech Recognition
  const handleSpeechResult = useCallback(
    (event) => {
      if (event.results?.[0]?.[0]) {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        addToConversation("user", transcript);
        sendQueryToBackend(transcript);
      }
    },
    [addToConversation, sendQueryToBackend]
  );

  // Inisialisasi Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = "id-ID";
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.onresult = handleSpeechResult;

      recognitionRef.current.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        setIsListening(false);
        setError(
          event.error === "no-speech"
            ? "No speech detected. Please try again."
            : "Speech recognition error. Please try again."
        );

        if (event.error === "no-speech") {
          recognitionRef.current?.stop();
        }
      };
    } else {
      setError("Speech recognition not supported in this browser.");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
      }
    };
  }, [handleSpeechResult, setError]);

  // Toggle state mendengarkan (listening)
  const toggleListening = async () => {
    if (isListening) {
      // Hentikan recording dan recognition
      mediaRecorderRef.current?.state === "recording" && mediaRecorderRef.current.stop();
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setError("");
      chunksRef.current = [];

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "audio/webm" });

        mediaRecorderRef.current.ondataavailable = (event) => {
          event.data.size > 0 && chunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
          sendQueryToBackend("", audioBlob);
        };

        mediaRecorderRef.current.start();
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error("Microphone Access Error:", err);
        setError("Failed to access microphone. Please check permissions.");
        setIsListening(false);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
        return;
      }
    }
  };

  // Setup animasi dan mixer
  useEffect(() => {
    if (groupRef.current && idleAnimations.length > 0) {
      mixerRef.current = new THREE.AnimationMixer(groupRef.current);
      idleActionRef.current = mixerRef.current.clipAction(idleAnimations[0]);
      idleActionRef.current.play();
    }

    return () => mixerRef.current?.stopAllAction();
  }, [idleAnimations]);

  // Setup pencahayaan
  useEffect(() => {
    if (!groupRef.current) return;

    // Main directional light (key light)
    const mainLight = new THREE.DirectionalLight(0xfff5e6, 1.6);
    mainLight.position.set(0, 2, 3);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.1;
    mainLight.shadow.camera.far = 1000;
    mainLight.shadow.bias = -0.00001;
    groupRef.current.add(mainLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0xb6ceff, 0.3);
    fillLight.position.set(-2, 1.5, -1.5);
    fillLight.castShadow = true;
    groupRef.current.add(fillLight);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    groupRef.current.add(ambientLight);

    // Rim light
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
    rimLight.position.set(0, 2.5, -4);
    groupRef.current.add(rimLight);

    // Eye lights
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

    // Bounce light (ground reflection)
    const bounceLight = new THREE.DirectionalLight(0xfff5e6, 0.15);
    bounceLight.position.set(0, -2.5, 1.5);
    groupRef.current.add(bounceLight);

    // Hair highlight
    const hairLight = new THREE.SpotLight(0xfff5e6, 0.25);
    hairLight.position.set(1.5, 4, -1.5);
    hairLight.angle = Math.PI / 4;
    hairLight.penumbra = 0.4;
    groupRef.current.add(hairLight);

    // Focused face light
    const faceLight = new THREE.SpotLight(0xffffff, 1.3);
    faceLight.position.set(0, 2.3, 2.5);
    faceLight.angle = Math.PI / 4;
    faceLight.penumbra = 0.2;
    faceLight.decay = 2;
    faceLight.distance = 4;
    groupRef.current.add(faceLight);

    // Additional side light
    const sideLight = new THREE.DirectionalLight(0xffffff, 0.2);
    sideLight.position.set(3, 2, 0);
    groupRef.current.add(sideLight);

    // Top light
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
  }, []);

  // Handle audio playback
  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handlePlay = () => {
      setIsPlaying(true);
      console.log("currentTime (handlePlay):", audio.currentTime);
    };

    const handleEnd = () => {
      setIsPlaying(false);
      console.log("currentTime (handleEnd):", audio.currentTime);
      // Reset semua viseme
      if (nodes.Wolf3D_Head && nodes.Wolf3D_Teeth) {
        Object.values(VISEME_MAP).forEach((viseme) => {
          [nodes.Wolf3D_Head, nodes.Wolf3D_Teeth].forEach((node) => {
            if (node.morphTargetDictionary && node.morphTargetDictionary[viseme] !== undefined) {
              node.morphTargetInfluences[node.morphTargetDictionary[viseme]] = 0.0;
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

    if (!audioPlayOnceRef.current) {
      audio.play().catch(handleError);
      audioPlayOnceRef.current = true;
    }

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("ended", handleEnd);
      audio.removeEventListener("error", handleError);
      audio.pause();
      audio.currentTime = 0;
    };
  }, [audioUrl, nodes, setIsPlaying, setError]);

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

  // Update frame untuk animasi, ekspresi wajah, dan lip sync
  useFrame((state, delta) => {
    // Update mixer animasi
    mixerRef.current?.update(delta);

    // Update eye blinks menggunakan fungsi lerpMorphTarget
    lerpMorphTarget(groupRef, smileIntensity, "eyeBlinkLeft", blink ? 1 : 0, 0.5);
    lerpMorphTarget(groupRef, smileIntensity, "eyeBlinkRight", blink ? 1 : 0, 0.5);

    // Update ekspresi wajah selain blink
    if (nodes.EyeLeft?.morphTargetDictionary) {
      Object.keys(nodes.EyeLeft.morphTargetDictionary).forEach((key) => {
        if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") return;
        const expression = FACIAL_EXPRESSIONS[facialExpression];
        lerpMorphTarget(groupRef, smileIntensity, key, expression?.[key] || 0, 0.1);
      });
    }

    // --- Lip Sync Implementation ---
    // Gunakan data lipsync dari Rhubarb (dengan properti mouthCues)
    if (
      isPlaying &&
      lipSyncData &&
      lipSyncData.mouthCues &&
      lipSyncData.mouthCues.length > 0 &&
      nodes.Wolf3D_Head &&
      nodes.Wolf3D_Teeth
    ) {
      const currentTime = audioRef.current ? audioRef.current.currentTime : 0;
      let appliedMorphTargets = [];

      // Iterasi setiap cue di mouthCues
      for (let i = 0; i < lipSyncData.mouthCues.length; i++) {
        const mouthCue = lipSyncData.mouthCues[i];
        if (currentTime >= mouthCue.start && currentTime <= mouthCue.end) {
          const viseme = mouthCue.value; // Contoh: "X", "B", "A", dll.
          const visemeValue = VISEME_MAP[viseme];
          if (visemeValue) {
            appliedMorphTargets.push(visemeValue);
            // Gunakan lerpMorphTarget dengan kecepatan interpolasi lebih lambat (misalnya 0.1)
            lerpMorphTarget(groupRef, smileIntensity, visemeValue, 1.5, 0.1);
          }
          break; // Hanya terapkan satu cue yang aktif
        }
      }

      // Reset morph target lain yang tidak aktif secara smooth
      Object.values(VISEME_MAP).forEach((visemeValue) => {
        if (!appliedMorphTargets.includes(visemeValue)) {
          lerpMorphTarget(groupRef, smileIntensity, visemeValue, 0, 0.1);
        }
      });
    }
  });

  // Head tracking (supaya kepala selalu menghadap kamera)
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

      {/* Interface voice chat */}
      <Html position={[0, -2.5, 0]} style={{ pointerEvents: "auto" }}>
        <VoiceChatInterface
          isListening={isListening}
          loading={loading}
          isPlaying={isPlaying}
          toggleListening={toggleListening}
        />
      </Html>
    </Suspense>
  );
}

useGLTF.preload("/models/klaris2.glb");
useFBX.preload("/animations/id.fbx");

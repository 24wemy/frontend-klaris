import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import axios from 'axios';

function HumanDetector() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [detectedCount, setDetectedCount] = useState(0);
    const [hasDetected, setHasDetected] = useState(false);  // State untuk menandai apakah pernah mendeteksi orang
    const timerIdRef = useRef(null);

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://klaris.my.id/backend';
    const avatarEndpoint = `${backendUrl}/api/query`;

    const sendMessageToBackend = useCallback(async (message) => {
        try {
            const response = await axios.post(avatarEndpoint, { query: message });
            if (response.status !== 200) {
                console.error('Error sending message to backend:', response.status);
            }
        } catch (error) {
            console.error('Error sending message to backend:', error);
        }
    }, [avatarEndpoint]);

    useEffect(() => {
        let model = null;

        async function loadModel() {
            model = await cocoSsd.load();
            return model;
        }

        async function setupCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                videoRef.current.srcObject = stream;
                videoRef.current.addEventListener('loadeddata', predict);
            } catch (err) {
                console.error("Error accessing camera", err);
            }
        }

        async function predict() {
            if (!model) return;
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                const predictions = await model.detect(videoRef.current);
                const people = predictions.filter(prediction => prediction.class === 'person');
                const currentCount = people.length;

                if (currentCount > 0 && !hasDetected) {
                    // Deteksi pertama, kirim pesan dan atur timer
                    sendMessageToBackend("Orang terdeteksi");
                    setHasDetected(true);

                    timerIdRef.current = setTimeout(() => {
                        // Setelah 3 menit, kirim pesan lagi (jika masih ada orang) dan reset `hasDetected`
                        if (currentCount > 0) {
                            sendMessageToBackend("Orang terdeteksi");
                        }
                        setHasDetected(false);  // Siap untuk mendeteksi lagi setelah 3 menit
                        timerIdRef.current = null;
                    }, 180000);
                } else if (currentCount === 0 && hasDetected) {
                    // Jika orang hilang, batalkan timer
                    if (timerIdRef.current) {
                        clearTimeout(timerIdRef.current);
                        timerIdRef.current = null;
                    }
                    setHasDetected(false); // Reset state jika tidak ada orang terdeteksi
                }

                setDetectedCount(currentCount);

                const ctx = canvasRef.current.getContext("2d");
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

                const font = "16px sans-serif";
                ctx.font = font;
                ctx.textBaseline = "top";

                people.forEach(prediction => {
                    const x = prediction.bbox[0];
                    const y = prediction.bbox[1];
                    const width = prediction.bbox[2];
                    const height = prediction.bbox[3];

                    ctx.strokeStyle = "#00FFFF";
                    ctx.lineWidth = 4;
                    ctx.strokeRect(x, y, width, height);

                    ctx.fillStyle = "#00FFFF";
                    const textWidth = ctx.measureText(prediction.class).width;
                    const textHeight = parseInt(font, 10);
                    ctx.fillRect(x, y, width + 4, height + 4);

                    ctx.fillStyle = "#000000";
                    ctx.fillText(prediction.class, x, y);
                });

                requestAnimationFrame(predict);
            } else {
                requestAnimationFrame(predict);
            }
        }

        setupCamera();
        loadModel();

        return () => {
            // Batalkan timer saat komponen unmount
            if (timerIdRef.current) {
                clearTimeout(timerIdRef.current);
            }
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject;
                const tracks = stream.getTracks();
                tracks.forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
        };
    }, [sendMessageToBackend]);

    return (
        <div style={{ position: 'absolute', top: '10px', left: '300px', zIndex: 2, color: 'white' }}>
            <div>Jumlah Orang Terdeteksi: {detectedCount}</div>
            <video
                ref={videoRef}
                style={{ height: '300px', width: '300px' }}
                autoPlay
                muted
            />
            <canvas
                ref={canvasRef}
                width="300"
                height="300"
                style={{ position: 'absolute', top: 0, left: 0 }}
            />
        </div>
    );
}

export default HumanDetector;
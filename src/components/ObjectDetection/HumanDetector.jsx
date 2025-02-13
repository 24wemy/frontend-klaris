import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import axios from 'axios';

function HumanDetector() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [detectedCount, setDetectedCount] = useState(0);
  const [hasDetected, setHasDetected] = useState(false);
  const [canSendMessage, setCanSendMessage] = useState(true);
  const [firstDetectionDone, setFirstDetectionDone] = useState(false);
  const timerIdRef = useRef(null);
  const captureIntervalRef = useRef(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000';
  const humanDetectedEndpoint = `${backendUrl}/api/human_detected`;

  // Fungsi untuk mengirim pesan ke backend
  const sendMessageToBackend = useCallback(async (message) => {
    console.log("sendMessageToBackend dipanggil dengan pesan:", message);
    try {
      // Pastikan payload menggunakan key "message"
      const payload = { message: message };
      console.log("Mengirim payload:", payload);
      const response = await axios.post(humanDetectedEndpoint, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log("Response dari backend:", response);
      if (response.status !== 200) {
        console.error('Error mengirim pesan ke backend:', response.status);
      }
    } catch (error) {
      console.error('Error mengirim pesan ke backend:', error);
    }
  }, [humanDetectedEndpoint]);

  // Fungsi untuk menangkap frame video dan melakukan prediksi
  const captureAndPredict = useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      console.log("Video belum siap, lewati captureAndPredict");
      return;
    }

    try {
      const model = await cocoSsd.load();
      const predictions = await model.detect(videoRef.current);
      const people = predictions.filter(prediction => prediction.class === 'person');
      const currentCount = people.length;

      console.log("Predictions:", predictions);
      setDetectedCount(currentCount);

      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      const font = "16px sans-serif";
      ctx.font = font;
      ctx.textBaseline = "top";

      people.forEach(prediction => {
        const [x, y, width, height] = prediction.bbox;

        ctx.strokeStyle = "#00FFFF";
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, width, height);

        ctx.fillStyle = "#00FFFF";
        const textWidth = ctx.measureText(prediction.class).width;
        const textHeight = parseInt(font, 10);
        ctx.fillRect(x, y, textWidth + 4, textHeight + 4);

        ctx.fillStyle = "#000000";
        ctx.fillText(prediction.class, x, y);
      });

      // Jika terdapat setidaknya satu orang terdeteksi
      if (currentCount > 0) {
        const message = "Orang terdeteksi";
        if (!firstDetectionDone) {
          console.log("Deteksi pertama, mengirim pesan");
          sendMessageToBackend(message);
          setHasDetected(true);
          setCanSendMessage(false);
          setFirstDetectionDone(true);

          timerIdRef.current = setTimeout(() => {
            setCanSendMessage(true);
            setHasDetected(false);
          }, 180000); // 3 menit
        } else if (canSendMessage) {
          console.log("Mengirim pesan ke backend setelah 3 menit");
          sendMessageToBackend(message);
          setHasDetected(true);
          setCanSendMessage(false);

          timerIdRef.current = setTimeout(() => {
            setCanSendMessage(true);
            setHasDetected(false);
          }, 180000); // 3 menit
        }
      } else {
        setHasDetected(false);
      }
    } catch (error) {
      console.error("Error selama capture and prediction:", error);
    }
  }, [sendMessageToBackend, canSendMessage, firstDetectionDone]);

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener('loadeddata', () => {
          console.log("Kamera sudah siap, memulai interval");
          // Mulai capture dan prediksi setiap 3 menit
          captureIntervalRef.current = setInterval(captureAndPredict, 180000);
          // Lakukan capture dan prediksi segera setelah kamera siap
          captureAndPredict();
        });
      } catch (err) {
        console.error("Error mengakses kamera", err);
      }
    }

    setupCamera();

    return () => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
      }
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [captureAndPredict]);

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

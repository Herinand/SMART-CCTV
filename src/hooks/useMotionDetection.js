import { useRef, useState, useCallback, useEffect } from 'react';

const FRAME_INTERVAL = 500; // ms between frame captures
const MOTION_THRESHOLD = 15; // % of pixels changed to trigger
const GRID_SIZE = 32; // downscale for performance

export default function useMotionDetection(videoRef, enabled, onMotion) {
  const canvasRef = useRef(null);
  const prevFrameRef = useRef(null);
  const intervalRef = useRef(null);
  const [motionLevel, setMotionLevel] = useState(0);
  const lastAlertRef = useRef(0);

  const analyzeFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    canvas.width = GRID_SIZE;
    canvas.height = GRID_SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Preserve aspect ratio
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    ctx.drawImage(video, 0, 0, vw, vh, 0, 0, GRID_SIZE, GRID_SIZE);

    const currentFrame = ctx.getImageData(0, 0, GRID_SIZE, GRID_SIZE).data;

    if (prevFrameRef.current) {
      let changedPixels = 0;
      const totalPixels = GRID_SIZE * GRID_SIZE;
      for (let i = 0; i < currentFrame.length; i += 4) {
        const dr = Math.abs(currentFrame[i] - prevFrameRef.current[i]);
        const dg = Math.abs(currentFrame[i + 1] - prevFrameRef.current[i + 1]);
        const db = Math.abs(currentFrame[i + 2] - prevFrameRef.current[i + 2]);
        const diff = (dr + dg + db) / 3;
        if (diff > 30) changedPixels++;
      }
      const percentage = (changedPixels / totalPixels) * 100;
      setMotionLevel(percentage);

      // Throttle alerts to one per 5 seconds
      const now = Date.now();
      if (percentage > MOTION_THRESHOLD && now - lastAlertRef.current > 5000) {
        lastAlertRef.current = now;
        if (onMotion) onMotion(percentage);
      }
    }
    prevFrameRef.current = currentFrame;
  }, [videoRef, onMotion]);

  useEffect(() => {
    if (enabled) {
      prevFrameRef.current = null;
      intervalRef.current = setInterval(analyzeFrame, FRAME_INTERVAL);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setMotionLevel(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, analyzeFrame]);

  return { motionLevel };
}
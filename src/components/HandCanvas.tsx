import React, { useEffect, useRef, useState } from 'react';
import { Hands, Results, HAND_CONNECTIONS } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { Trash2, Pencil, MousePointer2, Undo2 } from 'lucide-react';

interface HandCanvasProps {
  color: string;
  brushSize: number;
  isEraser: boolean;
  clearTrigger?: number;
  undoTrigger?: number;
}

const HandCanvas: React.FC<HandCanvasProps> = ({ color, brushSize, isEraser, clearTrigger, undoTrigger }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gesture, setGesture] = useState<'none' | 'drawing' | 'selecting' | 'clearing' | 'undoing'>('none');
  const prevPos = useRef<{ x: number; y: number } | null>(null);
  const pointsBuffer = useRef<{ x: number; y: number }[]>([]);
  const clearCounter = useRef(0);
  const undoCounter = useRef(0);

  // History management
  const historyRef = useRef<{ points: { x: number; y: number }[]; color: string; brushSize: number }[]>([]);
  const currentStrokeRef = useRef<{ x: number; y: number }[] | null>(null);
  const shapePointsRef = useRef<{ x: number; y: number }[] | null>(null);

  // Use refs to keep track of instances and current settings
  const handsRef = useRef<Hands | null>(null);
  const settingsRef = useRef({ color, brushSize, isEraser });

  // Update settings ref when props change
  useEffect(() => {
    settingsRef.current = { color, brushSize, isEraser };
  }, [color, brushSize, isEraser]);

  const redraw = () => {
    if (!drawingCanvasRef.current) return;
    const ctx = drawingCanvasRef.current.getContext('2d')!;
    ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);

    historyRef.current.forEach(stroke => {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  };

  const undo = () => {
    if (historyRef.current.length > 0) {
      historyRef.current.pop();
      redraw();
    }
  };

  const recognizeShape = (points: { x: number; y: number }[]) => {
    if (points.length < 15) return null;

    const centerX = points.reduce((s, p) => s + p.x, 0) / points.length;
    const centerY = points.reduce((s, p) => s + p.y, 0) / points.length;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });

    const width = maxX - minX;
    const height = maxY - minY;
    if (width < 40 || height < 40) return null;

    let perimeter = 0;
    for (let i = 1; i < points.length; i++) {
      perimeter += Math.sqrt(Math.pow(points[i].x - points[i - 1].x, 2) + Math.pow(points[i].y - points[i - 1].y, 2));
    }

    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    area = Math.abs(area) / 2;

    const circularity = (4 * Math.PI * area) / (perimeter * perimeter);

    const startEndDist = Math.sqrt(Math.pow(points[0].x - points[points.length - 1].x, 2) + Math.pow(points[0].y - points[points.length - 1].y, 2));
    const isClosed = startEndDist < perimeter * 0.3;

    if (!isClosed) return null;

    const subdivide = (p1: { x: number; y: number }, p2: { x: number; y: number }, segments: number) => {
      const pts = [];
      for (let i = 0; i < segments; i++) {
        pts.push({
          x: p1.x + (p2.x - p1.x) * (i / segments),
          y: p1.y + (p2.y - p1.y) * (i / segments)
        });
      }
      return pts;
    };

    const getVertices = (count: number) => {
      let v1 = points[0];
      let maxDist = -1;
      points.forEach(p => {
        const d = Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2);
        if (d > maxDist) {
          maxDist = d;
          v1 = p;
        }
      });

      const vertices = [v1];
      for (let i = 1; i < count; i++) {
        let nextV = points[0];
        let maxMinDist = -1;
        points.forEach(p => {
          const minDistToExisting = Math.min(...vertices.map(v => Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2)));
          if (minDistToExisting > maxMinDist) {
            maxMinDist = minDistToExisting;
            nextV = p;
          }
        });
        vertices.push(nextV);
      }

      const vCenterX = vertices.reduce((s, p) => s + p.x, 0) / vertices.length;
      const vCenterY = vertices.reduce((s, p) => s + p.y, 0) / vertices.length;
      return vertices.sort((a, b) => Math.atan2(a.y - vCenterY, a.x - vCenterX) - Math.atan2(b.y - vCenterY, b.x - vCenterX));
    };

    if (circularity > 0.8) {
      const radius = (width + height) / 4;
      const circlePoints = [];
      const numPoints = 120;
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        circlePoints.push({
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius
        });
      }
      return circlePoints;
    }

    if (circularity > 0.6) {
      const corners = getVertices(4);
      const rectPoints: { x: number; y: number }[] = [];
      for (let i = 0; i < 4; i++) {
        rectPoints.push(...subdivide(corners[i], corners[(i + 1) % 4], 30));
      }
      rectPoints.push(rectPoints[0]);
      return rectPoints;
    }

    if (circularity > 0.35) {
      const corners = getVertices(3);
      const triPoints: { x: number; y: number }[] = [];
      for (let i = 0; i < 3; i++) {
        triPoints.push(...subdivide(corners[i], corners[(i + 1) % 3], 40));
      }
      triPoints.push(triPoints[0]);
      return triPoints;
    }

    return null;
  };

  const finalizeShape = () => {
    if (shapePointsRef.current && shapePointsRef.current.length > 15) {
      const perfectShape = recognizeShape(shapePointsRef.current);
      if (perfectShape) {
        const { color: currentColor, brushSize: currentSize } = settingsRef.current;
        historyRef.current.push({
          points: perfectShape,
          color: currentColor,
          brushSize: currentSize
        });
        redraw();
      }
    }
    shapePointsRef.current = null;
  };

  useEffect(() => {
    if (drawingCanvasRef.current) {
      historyRef.current = [];
      redraw();
    }
  }, [clearTrigger]);

  useEffect(() => {
    undo();
  }, [undoTrigger]);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current || !drawingCanvasRef.current) return;

    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });
    handsRef.current = hands;

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    const onResults = (results: Results) => {
      if (!canvasRef.current || !drawingCanvasRef.current) return;

      const canvasCtx = canvasRef.current.getContext('2d')!;
      const drawingCtx = drawingCanvasRef.current.getContext('2d')!;
      const { color: currentColor, brushSize: currentSize, isEraser: currentEraser } = settingsRef.current;

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      canvasCtx.translate(canvasRef.current.width, 0);
      canvasCtx.scale(-1, 1);

      let isTwoThumbsUp = false;

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        if (results.multiHandLandmarks.length === 2) {
          const bothThumbsUp = results.multiHandLandmarks.every(hand => {
            const thumbTip = hand[4];
            const thumbIp = hand[3];
            const indexTip = hand[8];
            const indexPip = hand[6];
            return thumbTip.y < thumbIp.y && indexTip.y > indexPip.y;
          });
          if (bothThumbsUp) isTwoThumbsUp = true;
        }

        const landmarks = results.multiHandLandmarks[0];

        results.multiHandLandmarks.forEach(hand => {
          drawConnectors(canvasCtx, hand, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
          drawLandmarks(canvasCtx, hand, { color: '#FF0000', lineWidth: 1, radius: 2 });
        });

        const indexTip = landmarks[8];
        const indexPip = landmarks[6];
        const middleTip = landmarks[12];
        const middlePip = landmarks[10];
        const thumbTip = landmarks[4];
        const thumbIp = landmarks[3];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];

        const isIndexUp = indexTip.y < indexPip.y;
        const isMiddleUp = middleTip.y < middlePip.y;
        const isRingUp = ringTip.y < landmarks[14].y;
        const isPinkyUp = pinkyTip.y < landmarks[18].y;
        const isThumbUp = thumbTip.y < thumbIp.y;

        const rawX = (1 - indexTip.x) * drawingCanvasRef.current.width;
        const rawY = indexTip.y * drawingCanvasRef.current.height;

        pointsBuffer.current.push({ x: rawX, y: rawY });
        if (pointsBuffer.current.length > 5) pointsBuffer.current.shift();

        const x = pointsBuffer.current.reduce((sum, p) => sum + p.x, 0) / pointsBuffer.current.length;
        const y = pointsBuffer.current.reduce((sum, p) => sum + p.y, 0) / pointsBuffer.current.length;

        if (isTwoThumbsUp) {
          setGesture('undoing');
          finalizeShape();
          undoCounter.current++;
          if (undoCounter.current > 20) {
            undo();
            undoCounter.current = 0;
          }
          prevPos.current = null;
          currentStrokeRef.current = null;
        } else if (isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
          setGesture('drawing');
          finalizeShape();
          const strokeColor = currentEraser ? '#FFFFFF' : currentColor;
          drawingCtx.strokeStyle = strokeColor;
          drawingCtx.lineWidth = currentSize;
          drawingCtx.lineCap = 'round';
          drawingCtx.lineJoin = 'round';

          if (!currentStrokeRef.current) {
            currentStrokeRef.current = [{ x, y }];
          } else {
            currentStrokeRef.current.push({ x, y });
          }

          if (prevPos.current) {
            drawingCtx.beginPath();
            drawingCtx.moveTo(prevPos.current.x, prevPos.current.y);
            drawingCtx.lineTo(x, y);
            drawingCtx.stroke();
          }
          prevPos.current = { x, y };
          clearCounter.current = 0;
          undoCounter.current = 0;
        } else if (isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp) {
          setGesture('selecting');
          if (!shapePointsRef.current) {
            shapePointsRef.current = [{ x, y }];
          } else {
            shapePointsRef.current.push({ x, y });
          }

          if (shapePointsRef.current.length > 1) {
            canvasCtx.beginPath();
            canvasCtx.strokeStyle = '#3b82f6';
            canvasCtx.lineWidth = 2;
            canvasCtx.setLineDash([5, 5]);
            canvasCtx.moveTo(shapePointsRef.current[0].x, shapePointsRef.current[0].y);
            for (let i = 1; i < shapePointsRef.current.length; i++) {
              canvasCtx.lineTo(shapePointsRef.current[i].x, shapePointsRef.current[i].y);
            }
            canvasCtx.stroke();
            canvasCtx.setLineDash([]);
          }

          if (currentStrokeRef.current) {
            historyRef.current.push({
              points: currentStrokeRef.current,
              color: currentEraser ? '#FFFFFF' : currentColor,
              brushSize: currentSize
            });
            currentStrokeRef.current = null;
          }
          prevPos.current = null;
          clearCounter.current = 0;
          undoCounter.current = 0;
        } else if (isThumbUp && !isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
          setGesture('clearing');
          finalizeShape();
          clearCounter.current++;
          if (clearCounter.current > 20) {
            historyRef.current = [];
            redraw();
            clearCounter.current = 0;
          }
          if (currentStrokeRef.current) {
            historyRef.current.push({
              points: currentStrokeRef.current,
              color: currentEraser ? '#FFFFFF' : currentColor,
              brushSize: currentSize
            });
            currentStrokeRef.current = null;
          }
          prevPos.current = null;
          undoCounter.current = 0;
        } else {
          setGesture('none');
          finalizeShape();
          if (currentStrokeRef.current) {
            historyRef.current.push({
              points: currentStrokeRef.current,
              color: currentEraser ? '#FFFFFF' : currentColor,
              brushSize: currentSize
            });
            currentStrokeRef.current = null;
          }
          prevPos.current = null;
          clearCounter.current = 0;
          undoCounter.current = 0;
        }
      } else {
        setGesture('none');
        finalizeShape();
        if (currentStrokeRef.current) {
          historyRef.current.push({
            points: currentStrokeRef.current,
            color: currentEraser ? '#FFFFFF' : currentColor,
            brushSize: currentSize
          });
          currentStrokeRef.current = null;
        }
        prevPos.current = null;
        clearCounter.current = 0;
        undoCounter.current = 0;
      }
      canvasCtx.restore();
    };

    hands.onResults(onResults);

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (handsRef.current && videoRef.current) {
          await handsRef.current.send({ image: videoRef.current });
        }
      },
      width: 640,
      height: 480,
    });

    // Suppress MediaPipe's built-in alert() calls — we show our own error UI instead
    const originalAlert = window.alert;
    window.alert = (msg: string) => {
      console.warn('[MediaPipe suppressed alert]', msg);
    };

    camera.start()
      .then(() => {
        window.alert = originalAlert;
        setIsModelLoaded(true);
        setError(null);
      })
      .catch((err) => {
        window.alert = originalAlert;
        console.error("Camera start error:", err);
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access in your browser settings.');
        } else if (err.name === 'AbortError' || err.name === 'TimeoutError') {
          setError('Camera timed out. Another app may be using it — close Zoom, Teams, or other camera apps and retry.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please connect a camera and retry.');
        } else {
          setError('Failed to start camera. Please retry.');
        }
      });

    return () => {
      camera.stop();
      hands.close();
      handsRef.current = null;
    };
  }, []);

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto gap-2">
      {/* Canvas wrapper — taller on mobile for more drawing space */}
      <div className="relative w-full aspect-[4/3] sm:aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border-2 sm:border-4 border-zinc-800">
        {/* Hidden video for processing */}
        <video ref={videoRef} className="hidden" playsInline muted />

        {/* Drawing Canvas (The Persistent Art) */}
        <canvas
          id="drawing-canvas"
          ref={drawingCanvasRef}
          width={1280}
          height={720}
          className="absolute inset-0 w-full h-full z-10 bg-white"
        />

        {/* Hand Feedback Canvas (The Real-time Overlay) */}
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="absolute inset-0 w-full h-full z-20 pointer-events-none opacity-50"
        />

        {/* Loading State */}
        {!isModelLoaded && !error && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-900 text-white">
            <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-base sm:text-lg font-medium animate-pulse">Initializing AI Hand Tracking...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-900 text-white p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">Camera Error</h3>
            <p className="text-zinc-400 max-w-md">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Gesture Indicator — top left inside canvas */}
        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-30 flex items-center gap-1.5 sm:gap-2 bg-black/60 backdrop-blur-md px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/20 text-white">
          {gesture === 'drawing' && <Pencil className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400" />}
          {gesture === 'selecting' && <MousePointer2 className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />}
          {gesture === 'clearing' && <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />}
          {gesture === 'undoing' && <Undo2 className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />}
          {gesture === 'none' && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-zinc-500" />}
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
            {gesture === 'none' ? 'Waiting for Hand' : gesture}
          </span>
        </div>
      </div>

      {/* Instructions bar — OUTSIDE the canvas, below it */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap px-1 py-1.5 bg-zinc-900/60 backdrop-blur-sm border border-white/5 rounded-xl text-[9px] sm:text-[10px] text-zinc-400">
        <span><span className="text-white font-mono font-bold">☝ </span>DRAW</span>
        <span className="text-zinc-700">|</span>
        <span><span className="text-white font-mono font-bold">✌ </span>SELECT</span>
        <span className="text-zinc-700">|</span>
        <span><span className="text-white font-mono font-bold">👍 </span>CLEAR</span>
        <span className="text-zinc-700">|</span>
        <span><span className="text-white font-mono font-bold">👍👍 </span>UNDO</span>
      </div>
    </div>
  );
};

export default HandCanvas;

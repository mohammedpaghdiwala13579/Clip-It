import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Check, PenTool, Type } from 'lucide-react';

interface SignaturePadProps {
  value?: string;
  onChange: (dataUrl: string) => void;
  label?: string;
  defaultName?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  value,
  onChange,
  label = 'Digital Signature',
  defaultName = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(Boolean(value));
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState(defaultName);
  const [selectedFont, setSelectedFont] = useState<'cursive' | 'serif' | 'script'>('cursive');

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high resolution for crisp drawing
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0f172a';

    // If there is an existing value, render it
    if (value && value.startsWith('data:image')) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawn(true);
      };
      img.src = value;
    }
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange('');
  };

  const applyTypedSignature = (text: string) => {
    setTypedName(text);
    if (!text.trim()) {
      onChange('');
      return;
    }

    // Generate an image representation on an offscreen canvas
    const offscreen = document.createElement('canvas');
    offscreen.width = 400;
    offscreen.height = 120;
    const ctx = offscreen.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 400, 120);
      ctx.fillStyle = '#0f172a';
      const fontStr =
        selectedFont === 'cursive'
          ? 'italic 34px "Brush Script MT", cursive, sans-serif'
          : selectedFont === 'serif'
          ? 'italic 32px "Playfair Display", Georgia, serif'
          : 'italic 30px "Caveat", "Segoe Script", cursive';
      ctx.font = fontStr;
      ctx.fillText(text, 30, 70);
      const dataUrl = offscreen.toDataURL('image/png');
      onChange(dataUrl);
      setHasDrawn(true);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-neutral-700 tracking-wide">{label}</label>
        <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setMode('draw')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
              mode === 'draw' ? 'bg-white text-neutral-900 shadow-xs font-medium' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <PenTool className="w-3 h-3" />
            Draw
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('type');
              if (defaultName && !typedName) applyTypedSignature(defaultName);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
              mode === 'type' ? 'bg-white text-neutral-900 shadow-xs font-medium' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Type className="w-3 h-3" />
            Type
          </button>
        </div>
      </div>

      {mode === 'draw' ? (
        <div className="relative border border-neutral-300 rounded-xl bg-white overflow-hidden shadow-2xs hover:border-neutral-400 transition-colors">
          <canvas
            ref={canvasRef}
            className="w-full h-36 touch-none cursor-crosshair block"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          <div className="absolute bottom-2 left-3 text-[11px] text-neutral-400 select-none pointer-events-none">
            Sign above line
          </div>
          <div className="absolute bottom-6 left-3 right-3 border-b border-dashed border-neutral-200 pointer-events-none" />

          {hasDrawn && (
            <button
              type="button"
              onClick={clearCanvas}
              className="absolute top-2 right-2 flex items-center gap-1 text-xs text-neutral-600 hover:text-red-600 bg-white/90 backdrop-blur-xs px-2 py-1 rounded-md border border-neutral-200 hover:border-red-200 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      ) : (
        <div className="border border-neutral-300 rounded-xl p-3 bg-white space-y-3">
          <div>
            <input
              type="text"
              value={typedName}
              onChange={(e) => applyTypedSignature(e.target.value)}
              placeholder="Type your legal full name"
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
            />
          </div>
          {typedName && (
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/80 flex items-center justify-between">
              <div className="italic text-2xl font-serif text-neutral-800 font-medium tracking-wide">
                {typedName}
              </div>
              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                <Check className="w-3 h-3" /> Ready
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

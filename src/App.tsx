/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import HandCanvas from './components/HandCanvas';
import Toolbar from './components/Toolbar';
import VoiceController from './components/VoiceController';
import { Pencil, Sparkles, Github, Info, ChevronDown } from 'lucide-react';
import AiPanel from './components/AiPanel';

export default function App() {
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const [clearTrigger, setClearTrigger] = useState(0);
  const [undoTrigger, setUndoTrigger] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  const handleDownload = () => {
    const canvas = document.getElementById('drawing-canvas') as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `air-draw-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleClear = () => setClearTrigger(prev => prev + 1);
  const handleUndo = () => setUndoTrigger(prev => prev + 1);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-orange-500/30">

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-md border-b border-white/5 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
            <Pencil className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-black tracking-tighter uppercase leading-none">
              Sketch<span className="text-orange-500">Air</span>
            </h1>
            <p className="text-[9px] sm:text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
              Gesture Drawing Studio
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-6">
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-zinc-400">
            <a href="#" className="hover:text-white transition-colors">Showcase</a>
            <a href="#" className="hover:text-white transition-colors">Tutorial</a>
            <a href="#" className="hover:text-white transition-colors">About</a>
          </nav>
          <div className="h-4 w-px bg-white/10 hidden md:block" />
          <div className="flex items-center gap-1 sm:gap-3">
            {/* Mobile info toggle */}
            <button
              onClick={() => setShowInfo(v => !v)}
              className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
            >
              <Info className="w-5 h-5" />
            </button>
            <button className="p-2 text-zinc-400 hover:text-white transition-colors">
              <Github className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button className="hidden md:flex p-2 text-zinc-400 hover:text-white transition-colors">
              <Info className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 sm:pt-20 lg:pt-24 pb-6 sm:pb-20 px-2 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-3 sm:gap-6 lg:gap-12 items-start">

          {/* Canvas + Toolbar Column */}
          <div className="w-full lg:col-span-8 flex flex-col gap-3 sm:gap-4">

            {/* Canvas */}
            <div className="relative group">
              <div className="absolute -inset-0.5 sm:-inset-1 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-2xl sm:rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200" />
              <HandCanvas
                color={color}
                brushSize={brushSize}
                isEraser={isEraser}
                clearTrigger={clearTrigger}
                undoTrigger={undoTrigger}
              />
            </div>

            {/* Toolbar */}
            <Toolbar
              color={color}
              setColor={setColor}
              brushSize={brushSize}
              setBrushSize={setBrushSize}
              isEraser={isEraser}
              setIsEraser={setIsEraser}
              onClear={handleClear}
              onUndo={handleUndo}
              onDownload={handleDownload}
            />
          </div>

          {/* Right Column — hidden on mobile unless toggled */}
          <div className={`w-full lg:col-span-4 lg:block space-y-3 sm:space-y-4 lg:space-y-8 ${showInfo ? 'block' : 'hidden'}`}>

            {/* How it works */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl sm:rounded-3xl p-5 sm:p-8 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-white">How it works</h2>
              </div>
              <ul className="space-y-4 sm:space-y-6">
                {[
                  { n: '01', title: 'Enable Camera', desc: 'Allow camera access to start the AI hand tracking system.' },
                  { n: '02', title: 'Index Finger Up', desc: 'Raise your index finger to start drawing on the virtual canvas.' },
                  { n: '03', title: 'Two Fingers Up', desc: 'Raise index and middle fingers to move without drawing.' },
                  { n: '04', title: 'Thumb Up (Hold)', desc: 'Hold your thumb up for a moment to clear the entire drawing board.' },
                  { n: '05', title: 'Two Thumbs Up (Hold)', desc: 'Hold both thumbs up to undo your last drawing stroke.' },
                  { n: '06', title: 'Voice Commands', desc: 'Click the mic and say "Change color to red", "Set brush size to 10", or "Clear screen".' },
                ].map(({ n, title, desc }) => (
                  <li key={n} className="flex gap-3 sm:gap-4">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] sm:text-xs font-bold text-orange-500 shrink-0 border border-white/5">{n}</div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-white mb-0.5 sm:mb-1">{title}</h3>
                      <p className="text-[11px] sm:text-xs text-zinc-400 leading-relaxed">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro Tip */}
            <div className="bg-orange-500 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-2xl shadow-orange-500/20 relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
              <h3 className="text-base sm:text-lg font-black uppercase tracking-tighter mb-2">Pro Tip</h3>
              <p className="text-xs sm:text-sm font-medium text-orange-50 leading-relaxed">
                For best results, ensure good lighting and a plain background. Keep your hand within the camera frame.
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* Footer — desktop only */}
      <footer className="hidden sm:block border-t border-white/5 py-10 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3 opacity-50 grayscale">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Pencil className="w-5 h-5 text-black" />
            </div>
            <span className="text-sm font-black tracking-tighter uppercase">SketchAir</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
            &copy; 2026 SketchAir &bull; Made for Creators
          </p>
          <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      {/* AI Panel */}
      <AiPanel />

      {/* Voice Controller */}
      <VoiceController
        setColor={setColor}
        setBrushSize={setBrushSize}
        setIsEraser={setIsEraser}
        onClear={handleClear}
        onUndo={handleUndo}
      />
    </div>
  );
}

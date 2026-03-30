import React from 'react';
import { Eraser, Pencil, Trash2, Download, Minus, Plus, Undo2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ToolbarProps {
  color: string;
  setColor: (color: string) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  isEraser: boolean;
  setIsEraser: (isEraser: boolean) => void;
  onClear: () => void;
  onUndo: () => void;
  onDownload: () => void;
}

const COLORS = [
  '#000000',
  '#FF0000',
  '#00FF00',
  '#0000FF',
  '#FFFF00',
  '#FF00FF',
  '#00FFFF',
  '#FF8C00',
  '#8B4513',
];

const Toolbar: React.FC<ToolbarProps> = ({
  color,
  setColor,
  brushSize,
  setBrushSize,
  isEraser,
  setIsEraser,
  onClear,
  onUndo,
  onDownload,
}) => {
  return (
    <div className="flex flex-col gap-2 sm:gap-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-6 p-3 sm:p-6 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl w-full mx-auto">

      {/* Row 1 on mobile: Tools + Colors + Brush */}
      <div className="flex items-center gap-2 sm:contents">

        {/* Tool Selection */}
        <div className="flex items-center gap-1 bg-zinc-800 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-white/5 shrink-0">
          <button
            onClick={() => setIsEraser(false)}
            className={cn(
              "p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-300",
              !isEraser ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 scale-105 sm:scale-110" : "text-zinc-400 hover:bg-zinc-700"
            )}
            title="Pencil"
          >
            <Pencil className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={() => setIsEraser(true)}
            className={cn(
              "p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-300",
              isEraser ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 scale-105 sm:scale-110" : "text-zinc-400 hover:bg-zinc-700"
            )}
            title="Eraser"
          >
            <Eraser className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Color Palette */}
        <div className="flex items-center flex-1 sm:flex-none px-2 sm:px-4 sm:border-l sm:border-r border-white/10 overflow-x-auto">
          <div className="flex gap-1.5 sm:gap-2 sm:flex-wrap sm:max-w-[180px]">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  setIsEraser(false);
                }}
                className={cn(
                  "w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-transform hover:scale-125 shrink-0",
                  color === c && !isEraser ? "border-white scale-110 shadow-lg shadow-white/20" : "border-transparent"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Brush Size */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0 sm:px-4">
          <div className="flex items-center gap-1 bg-zinc-800 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-white/5">
            <button
              onClick={() => setBrushSize(Math.max(2, brushSize - 2))}
              className="p-1.5 sm:p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-md sm:rounded-lg transition-colors"
            >
              <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            <div className="w-7 sm:w-10 text-center font-mono text-xs sm:text-sm text-white font-bold">
              {brushSize}
            </div>
            <button
              onClick={() => setBrushSize(Math.min(50, brushSize + 2))}
              className="p-1.5 sm:p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-md sm:rounded-lg transition-colors"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
          {/* Brush preview — desktop only */}
          <div
            className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center overflow-hidden"
            style={{ backgroundColor: isEraser ? '#ffffff' : color }}
          >
            <div
              className="rounded-full"
              style={{
                width: `${(brushSize / 50) * 100}%`,
                height: `${(brushSize / 50) * 100}%`,
                backgroundColor: isEraser ? '#000000' : color
              }}
            />
          </div>
        </div>
      </div>

      {/* Row 2 on mobile: Actions */}
      <div className="flex items-center gap-2 sm:gap-3 sm:ml-auto">
        <button
          onClick={onUndo}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white rounded-xl sm:rounded-2xl transition-all duration-300 font-bold text-xs sm:text-sm border border-white/5 flex-1 sm:flex-none justify-center"
          title="Undo"
        >
          <Undo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Undo</span>
        </button>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl sm:rounded-2xl transition-all duration-300 font-bold text-xs sm:text-sm border border-red-500/20 flex-1 sm:flex-none justify-center"
        >
          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Clear</span>
        </button>
        <button
          onClick={onDownload}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 bg-orange-500 text-white hover:bg-orange-600 rounded-xl sm:rounded-2xl transition-all duration-300 font-bold text-xs sm:text-sm shadow-lg shadow-orange-500/20 flex-1 sm:flex-none justify-center"
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Save</span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;

import React, { useState, useRef, useEffect } from 'react';
import { Crop, RefreshCw, Sparkles, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { handleImageError } from '../../utils/imageFallback';

interface CropPreviewModalProps {
  isOpen: boolean;
  imageSrc: string;
  onConfirmCrop: (croppedDataUrl: string) => void;
  onChangeImage: () => void;
  onClose: () => void;
  isUrduMode?: boolean;
  /** Pre-snapped box from outfit picker (percent 0-100). */
  initialBox?: { x: number; y: number; width: number; height: number } | null;
}

/**
 * Free crop modal (per Claude 2026-10-03 + user request):
 * - No zoom controls, no ratio presets — just a free draggable/resizable box.
 * - User crops whatever they want; pinch/drag on the box itself.
 * - Actually crops the image on confirm (previous version passed full image).
 */
export const CropPreviewModal: React.FC<CropPreviewModalProps> = ({
  isOpen,
  imageSrc,
  onConfirmCrop,
  onChangeImage,
  onClose,
  isUrduMode = false,
  initialBox = null,
}) => {
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: 'move' | 'resize' | null;
    handle?: string;
    startX: number; startY: number;
    origBox: typeof cropBox;
  }>({ mode: null, startX: 0, startY: 0, origBox: { x: 10, y: 10, width: 80, height: 80 } });

  // Apply pre-snapped box from outfit picker
  useEffect(() => {
    if (isOpen && initialBox) {
      setCropBox({
        x: Math.max(0, Math.min(90, initialBox.x)),
        y: Math.max(0, Math.min(90, initialBox.y)),
        width: Math.max(10, Math.min(100 - initialBox.x, initialBox.width)),
        height: Math.max(10, Math.min(100 - initialBox.y, initialBox.height)),
      });
    } else if (isOpen && !initialBox) {
      setCropBox({ x: 10, y: 10, width: 80, height: 80 });
    }
  }, [isOpen, initialBox]);

  if (!isOpen) return null;

  const clampBox = (b: typeof cropBox) => ({
    x: Math.max(0, Math.min(95, b.x)),
    y: Math.max(0, Math.min(95, b.y)),
    width: Math.max(5, Math.min(100 - b.x, b.width)),
    height: Math.max(5, Math.min(100 - b.y, b.height)),
  });

  const toPercent = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * 100,
      y: ((clientY - r.top) / r.height) * 100,
    };
  };

  const onPointerDown = (e: React.PointerEvent, mode: 'move' | 'resize', handle?: string) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      mode, handle,
      startX: e.clientX, startY: e.clientY,
      origBox: { ...cropBox },
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d.mode) return;
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = ((e.clientX - d.startX) / r.width) * 100;
    const dy = ((e.clientY - d.startY) / r.height) * 100;
    const o = d.origBox;

    if (d.mode === 'move') {
      setCropBox(clampBox({ ...o, x: o.x + dx, y: o.y + dy }));
    } else if (d.mode === 'resize' && d.handle) {
      let nb = { ...o };
      if (d.handle.includes('e')) nb.width = o.width + dx;
      if (d.handle.includes('s')) nb.height = o.height + dy;
      if (d.handle.includes('w')) { nb.x = o.x + dx; nb.width = o.width - dx; }
      if (d.handle.includes('n')) { nb.y = o.y + dy; nb.height = o.height - dy; }
      setCropBox(clampBox(nb));
    }
  };

  const onPointerUp = () => {
    dragRef.current.mode = null;
  };

  /** Crop the source image to the box; returns JPEG data URL. */
  const doCrop = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const sx = (cropBox.x / 100) * img.width;
          const sy = (cropBox.y / 100) * img.height;
          const sw = (cropBox.width / 100) * img.width;
          const sh = (cropBox.height / 100) * img.height;
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(sw));
          canvas.height = Math.max(1, Math.round(sh));
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('no 2d context');
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('decode failed'));
      img.src = imageSrc;
    });
  };

  const handleSearch = async () => {
    try {
      const cropped = await doCrop();
      onConfirmCrop(cropped);
    } catch {
      onConfirmCrop(imageSrc); // fall back to full image
    }
  };

  const handles = [
    { id: 'nw', className: '-top-2 -left-2 cursor-nwse-resize' },
    { id: 'ne', className: '-top-2 -right-2 cursor-nesw-resize' },
    { id: 'sw', className: '-bottom-2 -left-2 cursor-nesw-resize' },
    { id: 'se', className: '-bottom-2 -right-2 cursor-nwse-resize' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#262626] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#262626] flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#0C0C0C] dark:text-[#F5F5F5] font-heading flex items-center gap-2">
              <Crop className="w-5 h-5 text-[#0C0C0C] dark:text-[#B9C006]" />
              <span>{isUrduMode ? 'Jo chahiye crop karein' : 'Crop what you want'}</span>
            </h3>
            <p className="text-xs text-[#5F5F60] dark:text-[#9C9C9D] mt-0.5">
              {isUrduMode
                ? 'Box ko drag karein — jo cheez chahiye us par set karein'
                : 'Drag the box — frame whatever you want to find'}
            </p>
          </div>
          <button
            type="button"
            onClick={onChangeImage}
            className="text-xs font-semibold text-[#0C0C0C] dark:text-[#B9C006] hover:text-[#262626] flex items-center gap-1.5 p-2 rounded-lg hover:bg-[#F2F4D6] dark:hover:bg-[#2B2F0C] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isUrduMode ? 'Doosri Tasweer' : 'Change Image'}</span>
          </button>
        </div>

        {/* Free crop viewport — drag box to move, drag corners to resize */}
        <div className="relative flex-1 bg-[#0C0C0C] flex items-center justify-center p-4 overflow-hidden min-h-[300px] select-none touch-none">
          <div
            ref={containerRef}
            className="relative max-h-[52vh] max-w-full flex items-center justify-center"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            <img
              onError={handleImageError}
              src={imageSrc}
              alt="Crop preview"
              className="max-h-[52vh] max-w-full object-contain rounded-lg"
              draggable={false}
              onLoad={(e) => {
                const t = e.target as HTMLImageElement;
                setImgSize({ w: t.naturalWidth, h: t.naturalHeight });
              }}
            />
            {/* Free crop box */}
            <div
              className="absolute border-2 border-[#B9C006] bg-[#B9C006]/10 rounded-lg shadow-2xl cursor-move touch-none"
              style={{
                top: `${cropBox.y}%`,
                left: `${cropBox.x}%`,
                width: `${cropBox.width}%`,
                height: `${cropBox.height}%`,
              }}
              onPointerDown={(e) => onPointerDown(e, 'move')}
            >
              {handles.map((h) => (
                <div
                  key={h.id}
                  className={`absolute w-5 h-5 bg-[#B9C006] rounded-full border-2 border-white shadow ${h.className}`}
                  style={{ minWidth: 20, minHeight: 20 }}
                  onPointerDown={(e) => onPointerDown(e, 'resize', h.id)}
                />
              ))}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                <div className="border-r border-b border-[#B9C006]/60" />
                <div className="border-r border-b border-[#B9C006]/60" />
                <div className="border-b border-[#B9C006]/60" />
                <div className="border-r border-b border-[#B9C006]/60" />
                <div className="border-r border-b border-[#B9C006]/60" />
                <div className="border-b border-[#B9C006]/60" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-[#262626] flex items-center justify-end gap-3 bg-white dark:bg-[#1A1A1A]">
          <Button variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSearch}
            leftIcon={<Sparkles className="w-4 h-4 text-[#B9C006]" />}
          >
            {isUrduMode ? 'Yehi dhoondo' : 'Search this'}
          </Button>
        </div>
      </div>
    </div>
  );
};

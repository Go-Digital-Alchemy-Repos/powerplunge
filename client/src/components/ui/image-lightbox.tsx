import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ImageLightboxProps {
  images: string[];
  initialIndex: number;
  alt?: string;
  open: boolean;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
}

export default function ImageLightbox({
  images,
  initialIndex,
  alt = "Product image",
  open,
  onClose,
  onIndexChange,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });
  const touchStartDistance = useRef(0);
  const touchStartScale = useRef(1);
  const swipeStart = useRef({ x: 0, y: 0, time: 0 });
  const hasPinched = useRef(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (open) {
      resetZoom();
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex(index);
      resetZoom();
      onIndexChange?.(index);
    },
    [resetZoom, onIndexChange]
  );

  const goPrev = useCallback(() => {
    goTo(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
  }, [currentIndex, images.length, goTo]);

  const goNext = useCallback(() => {
    goTo(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
  }, [currentIndex, images.length, goTo]);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(s + 0.5, 4));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => {
      const next = Math.max(s - 0.5, 1);
      if (next === 1) setTranslate({ x: 0, y: 0 });
      return next;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          goPrev();
          break;
        case "ArrowRight":
          goNext();
          break;
        case "+":
        case "=":
          zoomIn();
          break;
        case "-":
          zoomOut();
          break;
        case "0":
          resetZoom();
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose, goPrev, goNext, zoomIn, zoomOut, resetZoom]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (scale > 1) {
        resetZoom();
      } else {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          setScale(2.5);
          setTranslate({ x: -x * 0.6, y: -y * 0.6 });
        }
      }
    },
    [scale, resetZoom]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (scale <= 1) return;
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      translateStart.current = { ...translate };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [scale, translate]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || e.pointerType === "touch") return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setTranslate({
        x: translateStart.current.x + dx,
        y: translateStart.current.y + dy,
      });
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        hasPinched.current = true;
        touchStartDistance.current = getTouchDistance(e.touches);
        touchStartScale.current = scale;
      } else if (e.touches.length === 1) {
        hasPinched.current = false;
        const touch = e.touches[0];
        swipeStart.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now(),
        };
        if (scale > 1) {
          dragStart.current = { x: touch.clientX, y: touch.clientY };
          translateStart.current = { ...translate };
          setIsDragging(true);
        }
      }
    },
    [scale, translate]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDistance(e.touches);
        if (touchStartDistance.current > 0) {
          const newScale = Math.min(
            Math.max(touchStartScale.current * (dist / touchStartDistance.current), 1),
            4
          );
          setScale(newScale);
          if (newScale === 1) setTranslate({ x: 0, y: 0 });
        }
      } else if (e.touches.length === 1 && isDragging && scale > 1) {
        const touch = e.touches[0];
        const dx = touch.clientX - dragStart.current.x;
        const dy = touch.clientY - dragStart.current.y;
        setTranslate({
          x: translateStart.current.x + dx,
          y: translateStart.current.y + dy,
        });
      }
    },
    [isDragging, scale]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      setIsDragging(false);
      if (hasPinched.current) {
        hasPinched.current = false;
        return;
      }
      if (scale > 1) return;
      if (e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const dx = touch.clientX - swipeStart.current.x;
        const dy = touch.clientY - swipeStart.current.y;
        const dt = Date.now() - swipeStart.current.time;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx > 50 && absDx > absDy && dt < 400) {
          if (dx > 0) goPrev();
          else goNext();
        }

        if (absDy > 100 && absDy > absDx && dt < 400) {
          onClose();
        }
      }
    },
    [scale, goPrev, goNext, onClose]
  );

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
          className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          data-testid="lightbox-overlay"
        >
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <div className="text-sm text-white/60">
              {images.length > 1 && `${currentIndex + 1} / ${images.length}`}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={zoomOut}
                disabled={scale <= 1}
                aria-label="Zoom out"
                className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
                data-testid="button-zoom-out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={zoomIn}
                disabled={scale >= 4}
                aria-label="Zoom in"
                className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
                data-testid="button-zoom-in"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              {scale > 1 && (
                <button
                  onClick={resetZoom}
                  aria-label="Reset zoom"
                  className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  data-testid="button-zoom-reset"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={onClose}
                aria-label="Close image viewer"
                className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors ml-2"
                data-testid="button-lightbox-close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div
            ref={containerRef}
            className="flex-1 flex items-center justify-center overflow-hidden relative select-none"
            style={{ touchAction: "none" }}
            onDoubleClick={handleDoubleClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {images.length > 1 && scale <= 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  aria-label="Previous image"
                  className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors"
                  data-testid="button-lightbox-prev"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  aria-label="Next image"
                  className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors"
                  data-testid="button-lightbox-next"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            <motion.img
              ref={imageRef}
              key={currentIndex}
              src={images[currentIndex]}
              alt={`${alt} ${currentIndex + 1}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="max-w-full max-h-full object-contain"
              style={{
                transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
                cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
                transition: isDragging ? "none" : "transform 0.2s ease-out",
              }}
              draggable={false}
              data-testid="img-lightbox-current"
            />
          </div>

          {images.length > 1 && (
            <div className="px-4 py-3 flex justify-center">
              <div className="flex gap-2 overflow-x-auto max-w-full pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => goTo(idx)}
                    className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === currentIndex
                        ? "border-primary opacity-100"
                        : "border-white/20 opacity-50 hover:opacity-80"
                    }`}
                    data-testid={`button-lightbox-thumb-${idx}`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {scale <= 1 && (
            <div className="sm:hidden text-center text-white/40 text-xs pb-3">
              Swipe to navigate · Pinch to zoom · Swipe down to close
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

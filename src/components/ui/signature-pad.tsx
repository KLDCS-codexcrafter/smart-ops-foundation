/**
 * signature-pad.tsx — Canvas-based signature capture
 * No external library — uses HTML5 Canvas pointer events for cross-device support.
 */
import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SignaturePadHandle {
  isEmpty: () => boolean;
  toDataURL: () => string;
  clear: () => void;
}

interface Props {
  width?: number;
  height?: number;
  disabled?: boolean;
  onChange?: (isEmpty: boolean) => void;
  className?: string;
}

export const SignaturePad = forwardRef<SignaturePadHandle, Props>(function SignaturePad(
  { width = 360, height = 140, disabled = false, onChange, className },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const isEmptyRef = useRef(true);

  const getCtx = useCallback(() => {
    const c = canvasRef.current;
    return c?.getContext('2d') ?? null;
  }, []);

  const clear = useCallback(() => {
    const ctx = getCtx();
    const c = canvasRef.current;
    if (!ctx || !c) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    isEmptyRef.current = true;
    onChange?.(true);
  }, [getCtx, onChange]);

  useEffect(() => {
    clear();
  }, [clear]);

  const getPoint = (e: React.PointerEvent): { x: number; y: number } => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const rect = c.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * c.width,
      y: ((e.clientY - rect.top) / rect.height) * c.height,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    drawingRef.current = true;
    lastPointRef.current = getPoint(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (disabled || !drawingRef.current) return;
    const ctx = getCtx();
    const last = lastPointRef.current;
    if (!ctx || !last) return;
    const cur = getPoint(e);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(cur.x, cur.y);
    ctx.stroke();
    lastPointRef.current = cur;
    if (isEmptyRef.current) {
      isEmptyRef.current = false;
      onChange?.(false);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    drawingRef.current = false;
    lastPointRef.current = null;
    canvasRef.current?.releasePointerCapture(e.pointerId);
  };

  useImperativeHandle(ref, () => ({
    isEmpty: () => isEmptyRef.current,
    toDataURL: () => canvasRef.current?.toDataURL('image/png') ?? '',
    clear,
  }), [clear]);

  return (
    <div className={cn('inline-block', className)}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={cn(
          'border rounded-md bg-white touch-none',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
      <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
        <span>Sign with mouse or finger</span>
        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={clear} disabled={disabled}>
          <Eraser className="h-3 w-3 mr-1" /> Clear
        </Button>
      </div>
    </div>
  );
});

export { Check };

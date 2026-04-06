import { useEffect, useState } from 'react';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#0D9488'];

interface P {
  id: number; left: number; delay: number; dur: number; color: string; size: number;
}

export function Confetti({ active, onComplete }: { active: boolean; onComplete?: () => void }) {
  const [pieces, setPieces] = useState<P[]>([]);

  useEffect(() => {
    if (!active) { setPieces([]); return; }
    setPieces(Array.from({ length: 60 }, (_, i) => ({
      id: i, left: Math.random() * 100, delay: Math.random() * 1.5,
      dur: 2 + Math.random() * 2, color: COLORS[i % COLORS.length], size: 6 + Math.random() * 8,
    })));
    const t = setTimeout(() => { setPieces([]); onComplete?.(); }, 4000);
    return () => clearTimeout(t);
  }, [active, onComplete]);

  if (!pieces.length) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {pieces.map(p => (
        <div
          key={p.id}
          className="absolute top-0 animate-confetti-fall"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            borderRadius: p.id % 2 === 0 ? '50%' : '2px',
            opacity: 0.9,
          }}
        />
      ))}
    </div>
  );
}

import { useEffect, useState } from 'react';
import type { Deck } from '../types';
import { SlideRenderer } from '../renderer/SlideRenderer';

interface Props {
  deck: Deck;
  startIndex?: number;
  onExit: () => void;
}

// Read-only Vollbild-Wiedergabe. Gleicher SlideRenderer, nur skaliert, ohne
// Editor-Chrome.
export function Presentation({ deck, startIndex = 0, onExit }: Props) {
  const [idx, setIdx] = useState(startIndex);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const compute = () => {
      const s = Math.min(window.innerWidth / deck.format.width, window.innerHeight / deck.format.height);
      setScale(s);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [deck.format.width, deck.format.height]);

  useEffect(() => {
    const last = deck.slides.length - 1;
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
        case 'PageDown':
          e.preventDefault();
          setIdx((i) => Math.min(i + 1, last));
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          setIdx((i) => Math.max(i - 1, 0));
          break;
        case 'Home':
          setIdx(0);
          break;
        case 'End':
          setIdx(last);
          break;
        case 'Escape':
          onExit();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deck.slides.length, onExit]);

  // Echtes Browser-Fullscreen anfordern (best effort).
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  const slide = deck.slides[idx];

  return (
    <div
      className="present-root"
      onClick={(e) => {
        // Linke Hälfte zurück, rechte Hälfte vor.
        const mid = window.innerWidth / 2;
        if (e.clientX < mid) setIdx((i) => Math.max(i - 1, 0));
        else setIdx((i) => Math.min(i + 1, deck.slides.length - 1));
      }}
    >
      <div
        style={{
          width: deck.format.width,
          height: deck.format.height,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <SlideRenderer slide={slide} deck={deck} />
      </div>
      <div className="present-hud">
        {idx + 1} / {deck.slides.length} · Esc beendet
      </div>
    </div>
  );
}

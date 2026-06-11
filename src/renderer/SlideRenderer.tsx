import { forwardRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { Deck, Slide } from '../types';
import { ElementView } from './ElementView';
import { AssetImage } from './AssetImage';

interface Props {
  slide: Slide;
  deck: Deck;
  // Zusätzliches Overlay je Element (z.B. Selektion/Handles im Editor).
  renderElementOverlay?: (elementId: string) => ReactNode;
  // Klick auf ein Element (Editor-Selektion).
  onElementPointerDown?: (elementId: string, e: React.PointerEvent) => void;
  onBackgroundPointerDown?: (e: React.PointerEvent) => void;
}

// Rendert eine Folie in fester logischer Größe (deck.format). Skalierung
// passiert außen via CSS-transform — dieselbe Komponente in Editor,
// Präsentation und Export, damit es keine Abweichungen gibt.
export const SlideRenderer = forwardRef<HTMLDivElement, Props>(function SlideRenderer(
  { slide, deck, renderElementOverlay, onElementPointerDown, onBackgroundPointerDown },
  ref,
) {
  const { width, height } = deck.format;
  const bg = slide.background ?? '#ffffff';
  const isColor = bg.startsWith('#') || bg.startsWith('rgb') || bg.startsWith('hsl');

  const frame: CSSProperties = {
    position: 'relative',
    width,
    height,
    background: isColor ? bg : '#ffffff',
    overflow: 'hidden',
  };

  // Elemente in Z-Reihenfolge.
  const ordered = [...slide.elements].sort((a, b) => a.z - b.z);

  return (
    <div ref={ref} style={frame} onPointerDown={onBackgroundPointerDown}>
      {!isColor && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <AssetImage assetId={bg} fit="cover" />
        </div>
      )}
      {ordered.map((el) => {
        const wrapper: CSSProperties = {
          position: 'absolute',
          left: el.x,
          top: el.y,
          width: el.width,
          height: Math.max(el.height, el.type === 'shape' && el.shape === 'line' ? 0 : 1),
          transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
          transformOrigin: 'center center',
        };
        return (
          <div
            key={el.id}
            data-element-id={el.id}
            style={wrapper}
            onPointerDown={
              onElementPointerDown ? (e) => onElementPointerDown(el.id, e) : undefined
            }
          >
            <ElementView element={el} theme={deck.theme} />
            {renderElementOverlay?.(el.id)}
          </div>
        );
      })}
    </div>
  );
});

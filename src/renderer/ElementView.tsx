import type { CSSProperties } from 'react';
import type { ShapeElement, SlideElement, TextElement, Theme } from '../types';
import { AssetImage } from './AssetImage';

interface Props {
  element: SlideElement;
  theme: Theme;
}

// Reines Rendering eines Elements in logischen Einheiten (px == logische Einheit).
// Position/Größe setzt der Wrapper in SlideRenderer; hier nur der Inhalt.
export function ElementView({ element, theme }: Props) {
  switch (element.type) {
    case 'text':
      return <TextView el={element} theme={theme} />;
    case 'image':
      return <AssetImage assetId={element.assetId} fit={element.fit} />;
    case 'shape':
      return <ShapeView el={element} />;
  }
}

function TextView({ el, theme }: { el: TextElement; theme: Theme }) {
  const roleSize =
    el.styleRole === 'title'
      ? theme.sizes.title
      : el.styleRole === 'caption'
        ? theme.sizes.caption
        : theme.sizes.body;
  const style: CSSProperties = {
    width: '100%',
    height: '100%',
    fontFamily: theme.fontFamily,
    fontSize: el.fontSize ?? roleSize,
    color: el.color ?? theme.palette[0],
    textAlign: el.align ?? 'left',
    fontWeight: el.styleRole === 'title' ? 700 : 400,
    lineHeight: 1.2,
    overflow: 'hidden',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
  };
  return <div style={style} dangerouslySetInnerHTML={{ __html: el.content }} />;
}

function ShapeView({ el }: { el: ShapeElement }) {
  if (el.shape === 'line') {
    // Linie als SVG über die Breite; Höhe der Box ist die Dicke-Hülle.
    const sw = el.strokeWidth ?? 4;
    return (
      <svg width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }}>
        <line
          x1={0}
          y1={Math.max(el.height / 2, sw / 2)}
          x2={el.width}
          y2={Math.max(el.height / 2, sw / 2)}
          stroke={el.stroke ?? '#000'}
          strokeWidth={sw}
          strokeLinecap="round"
        />
      </svg>
    );
  }
  const common: CSSProperties = {
    width: '100%',
    height: '100%',
    background: el.fill ?? 'transparent',
    border: el.strokeWidth ? `${el.strokeWidth}px solid ${el.stroke ?? '#000'}` : 'none',
    boxSizing: 'border-box',
  };
  if (el.shape === 'ellipse') common.borderRadius = '50%';
  return <div style={common} />;
}

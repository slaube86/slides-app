import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { TextElement, Theme } from '../types';

interface Props {
  element: TextElement;
  theme: Theme;
  onCommit: (html: string) => void;
}

// contenteditable-Overlay exakt über dem Text-Element. Liegt im skalierten
// Stage-Koordinatensystem, also in logischen Einheiten positioniert.
export function TextEditorOverlay({ element, theme, onCommit }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.innerHTML = element.content;
    node.focus();
    // Cursor ans Ende.
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roleSize =
    element.styleRole === 'title'
      ? theme.sizes.title
      : element.styleRole === 'caption'
        ? theme.sizes.caption
        : theme.sizes.body;

  const style: CSSProperties = {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    fontFamily: theme.fontFamily,
    fontSize: element.fontSize ?? roleSize,
    color: element.color ?? theme.palette[0],
    textAlign: element.align ?? 'left',
    fontWeight: element.styleRole === 'title' ? 700 : 400,
    lineHeight: 1.2,
    outline: '1.5px solid #111113',
    background: 'rgba(255,255,255,0.65)',
    overflow: 'hidden',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    cursor: 'text',
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      style={style}
      // Live committen: sonst geht der Text verloren, wenn das Overlay durch
      // Wegklicken ausgehängt wird, bevor onBlur feuert.
      onInput={() => onCommit(ref.current?.innerHTML ?? '')}
      onBlur={() => onCommit(ref.current?.innerHTML ?? '')}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        // Esc / Cmd+Enter beenden das Editieren.
        if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        }
      }}
    />
  );
}

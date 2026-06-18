import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { ListElement, Theme } from '../types';
import { listStyle } from '../renderer/ListView';

interface Props {
  element: ListElement;
  theme: Theme;
  onChange: (items: string[]) => void;
}

// Editierbare Liste über dem Element. Das ganze <ul>/<ol> ist contenteditable —
// so übernimmt der Browser das natürliche Verhalten (Enter = neuer Punkt,
// Backspace am Punktanfang = zusammenführen). Inhalt wird beim Mount einmal
// gesetzt und NICHT über React kontrolliert, damit Tippen den Cursor nicht
// zurücksetzt (gleiches Muster wie Text-/Tabellen-Editor).
export function ListEditorOverlay({ element, theme, onChange }: Props) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = ref.current;
    if (!list) return;
    const items = element.items.length ? element.items : [''];
    list.innerHTML = items.map((it) => `<li>${it || '<br>'}</li>`).join('');
    // Cursor ans Ende des ersten Punkts.
    const first = list.querySelector('li');
    if (first) {
      const range = document.createRange();
      range.selectNodeContents(first);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    list.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function serialize() {
    const list = ref.current;
    if (!list) return;
    const items = Array.from(list.querySelectorAll('li')).map((li) =>
      li.innerHTML.replace(/<br\s*\/?>$/i, ''),
    );
    onChange(items);
  }

  const Tag = element.ordered ? 'ol' : 'ul';
  const wrapper: CSSProperties = {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    outline: '1.5px solid #111113',
    background: 'rgba(255,255,255,0.65)',
  };

  return (
    <div style={wrapper} onPointerDown={(e) => e.stopPropagation()}>
      <Tag
        ref={ref as React.Ref<HTMLUListElement & HTMLOListElement>}
        contentEditable
        suppressContentEditableWarning
        style={{ ...listStyle(element, theme), outline: 'none', cursor: 'text' }}
        onInput={serialize}
        onBlur={serialize}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            (e.target as HTMLElement).blur();
          }
        }}
      />
    </div>
  );
}

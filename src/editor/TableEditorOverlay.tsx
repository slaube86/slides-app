import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { TableElement, Theme } from '../types';
import { tableStyle, cellStyle } from '../renderer/TableView';

interface Props {
  element: TableElement;
  theme: Theme;
  onCellInput: (row: number, col: number, html: string) => void;
}

// Editierbares Tabellen-Overlay, exakt über dem Element positioniert (logische
// Einheiten im skalierten Stage). Zellen sind contenteditable; Inhalt wird beim
// Mount einmal gesetzt und NICHT über React kontrolliert, damit Tippen den Cursor
// nicht zurücksetzt (gleiches Muster wie der Text-Editor).
export function TableEditorOverlay({ element, theme, onCellInput }: Props) {
  const ref = useRef<HTMLTableElement>(null);

  useEffect(() => {
    const table = ref.current;
    if (!table) return;
    table.querySelectorAll<HTMLTableCellElement>('td').forEach((td) => {
      const r = Number(td.dataset.r);
      const c = Number(td.dataset.c);
      td.innerHTML = element.cells[r]?.[c] ?? '';
    });
    // Erste Zelle fokussieren.
    table.querySelector<HTMLTableCellElement>('td')?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <table ref={ref} style={tableStyle(element, theme)}>
        <tbody>
          {Array.from({ length: element.rows }).map((_, r) => (
            <tr key={r} style={{ height: `${100 / element.rows}%` }}>
              {Array.from({ length: element.cols }).map((_, c) => (
                <td
                  key={c}
                  data-r={r}
                  data-c={c}
                  contentEditable
                  suppressContentEditableWarning
                  style={{ ...cellStyle(element, r), cursor: 'text' }}
                  onInput={(e) => onCellInput(r, c, e.currentTarget.innerHTML)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      (e.target as HTMLElement).blur();
                    }
                  }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

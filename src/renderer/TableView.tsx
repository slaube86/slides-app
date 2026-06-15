import type { CSSProperties } from 'react';
import type { TableElement, Theme } from '../types';

// Stil-Helfer, von TableView (read-only) und dem Editor-Overlay geteilt, damit
// Darstellung und Bearbeitung pixelgenau übereinstimmen.
export function tableStyle(el: TableElement, theme: Theme): CSSProperties {
  return {
    width: '100%',
    height: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
    fontFamily: theme.fontFamily,
    fontSize: el.fontSize ?? 20,
    color: el.color ?? theme.palette[0],
  };
}

export function cellStyle(el: TableElement, row: number): CSSProperties {
  const isHeader = !!el.headerRow && row === 0;
  const bw = el.borderWidth ?? 1;
  return {
    border: `${bw}px solid ${el.borderColor ?? '#cbd5e1'}`,
    padding: '4px 8px',
    verticalAlign: 'middle',
    textAlign: el.align ?? 'left',
    fontWeight: isHeader ? 700 : 400,
    background: isHeader ? el.headerFill ?? '#f1f5f9' : 'transparent',
    overflow: 'hidden',
    wordBreak: 'break-word',
  };
}

export function TableView({ el, theme }: { el: TableElement; theme: Theme }) {
  return (
    <table style={tableStyle(el, theme)}>
      <tbody>
        {Array.from({ length: el.rows }).map((_, r) => (
          <tr key={r} style={{ height: `${100 / el.rows}%` }}>
            {Array.from({ length: el.cols }).map((_, c) => (
              <td
                key={c}
                style={cellStyle(el, r)}
                dangerouslySetInnerHTML={{ __html: el.cells[r]?.[c] ?? '' }}
              />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

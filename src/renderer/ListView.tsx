import type { CSSProperties } from 'react';
import type { ListElement, Theme } from '../types';

// Stil-Helfer, von ListView (read-only) und dem Editor-Overlay geteilt, damit
// Anzeige und Bearbeitung übereinstimmen.
export function listStyle(el: ListElement, theme: Theme): CSSProperties {
  const roleSize =
    el.styleRole === 'title'
      ? theme.sizes.title
      : el.styleRole === 'caption'
        ? theme.sizes.caption
        : theme.sizes.body;
  return {
    width: '100%',
    height: '100%',
    margin: 0,
    paddingLeft: '1.4em',
    fontFamily: theme.fontFamily,
    fontSize: el.fontSize ?? roleSize,
    color: el.color ?? theme.palette[0],
    textAlign: el.align ?? 'left',
    lineHeight: 1.35,
    listStylePosition: 'outside',
    listStyleType: el.ordered ? 'decimal' : 'disc',
    boxSizing: 'border-box',
  };
}

export function ListView({ el, theme }: { el: ListElement; theme: Theme }) {
  const Tag = el.ordered ? 'ol' : 'ul';
  return (
    <Tag style={listStyle(el, theme)}>
      {el.items.map((item, i) => (
        <li key={i} style={{ marginBottom: '0.25em' }} dangerouslySetInnerHTML={{ __html: item }} />
      ))}
    </Tag>
  );
}

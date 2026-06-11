import type { Deck, Slide, Theme } from '../types';
import { uid } from './id';

export const DEFAULT_FORMAT = { width: 1280, height: 720 };

export function defaultTheme(): Theme {
  return {
    palette: ['#111113', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#ffffff'],
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    sizes: { title: 56, body: 28, caption: 18 },
  };
}

export function emptySlide(): Slide {
  return {
    id: uid('s_'),
    background: '#ffffff',
    elements: [],
  };
}

export function newDeck(title = 'Unbenannte Präsentation'): Deck {
  const now = Date.now();
  return {
    id: uid('d_'),
    title,
    format: { ...DEFAULT_FORMAT },
    theme: defaultTheme(),
    slides: [emptySlide()],
    createdAt: now,
    updatedAt: now,
  };
}

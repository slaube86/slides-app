// Datenmodell — siehe initial-slides-app.md.
// Ein Deck ist ein verschachteltes JSON-Objekt; serialisiert sauber, ganz ohne DB.

export type ElementType = 'text' | 'image' | 'shape';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number; // logische Einheiten (0..format.width)
  y: number; // logische Einheiten (0..format.height)
  width: number;
  height: number;
  rotation: number; // Grad
  z: number; // Stapelreihenfolge
}

export type StyleRole = 'title' | 'body' | 'caption';

export interface TextElement extends BaseElement {
  type: 'text';
  content: string; // Rich-Text / HTML
  styleRole?: StyleRole; // referenziert das Theme
  fontSize?: number; // optionaler Override
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export interface ImageElement extends BaseElement {
  type: 'image';
  assetId: string; // Referenz auf assets-Tabelle (Blob)
  fit?: 'cover' | 'contain';
}

export type ShapeKind = 'rect' | 'ellipse' | 'line';

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shape: ShapeKind;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export type SlideElement = TextElement | ImageElement | ShapeElement;

export interface Slide {
  id: string;
  background?: string; // Farbe oder assetId
  elements: SlideElement[];
}

export interface Theme {
  palette: string[];
  fontFamily: string;
  sizes: { title: number; body: number; caption: number };
}

export interface Deck {
  id: string;
  title: string;
  format: { width: number; height: number }; // z.B. 1280x720
  theme: Theme;
  slides: Slide[];
  createdAt: number;
  updatedAt: number;
}

export interface Asset {
  id: string;
  blob: Blob;
  type: string;
  createdAt: number;
}

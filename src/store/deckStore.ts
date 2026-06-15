import { create } from 'zustand';
import { produce, type Draft } from 'immer';
import type {
  Deck,
  ImageElement,
  ShapeElement,
  Slide,
  SlideElement,
  TableElement,
  TextElement,
  Theme,
} from '../types';
import { uid } from '../utils/id';
import { emptySlide, newDeck } from '../utils/defaults';
import { loadDeck, saveDeck } from '../db/db';

const HISTORY_LIMIT = 50;

interface DeckState {
  deck: Deck | null;
  currentSlide: number;
  selectedId: string | null;
  past: Deck[];
  future: Deck[];
  dirty: boolean;

  // lifecycle
  loadOrCreate: (id?: string) => Promise<void>;
  setDeck: (deck: Deck) => void;

  // history
  checkpoint: () => void;
  undo: () => void;
  redo: () => void;

  // deck-level
  setTitle: (title: string) => void;
  applyTheme: (theme: Theme) => void;

  // slides
  selectSlide: (idx: number) => void;
  addSlide: () => void;
  deleteSlide: (idx: number) => void;
  duplicateSlide: (idx: number) => void;
  moveSlide: (from: number, to: number) => void;
  setSlideBackground: (color: string) => void;

  // elements
  selectElement: (id: string | null) => void;
  addText: (role?: TextElement['styleRole']) => void;
  addShape: (shape: ShapeElement['shape']) => void;
  addImage: (assetId: string, width: number, height: number) => void;
  addTable: (rows?: number, cols?: number) => void;
  resizeTable: (id: string, rows: number, cols: number) => void;
  updateTableCell: (id: string, row: number, col: number, html: string) => void;
  updateElement: (
    id: string,
    patch: Partial<SlideElement>,
    opts?: { history?: boolean },
  ) => void;
  deleteElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  nudge: (id: string, dx: number, dy: number) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
}

// ---- Autosave: debounced Schreiben ins IndexedDB ----
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(deck: Deck, markClean: () => void) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const stamped = { ...deck, updatedAt: Date.now() };
    await saveDeck(stamped);
    markClean();
  }, 600);
}

function currentSlideOf(deck: Deck, idx: number): Slide | undefined {
  return deck.slides[idx];
}

export const useDeck = create<DeckState>((set, get) => {
  // Wendet einen immer-Recipe auf das Deck an, schiebt (optional) Historie und
  // plant Autosave. Einzige Stelle, die das Deck mutiert.
  function mutate(recipe: (d: Draft<Deck>) => void, history = true) {
    const state = get();
    if (!state.deck) return;
    const prev = state.deck;
    const next = produce(prev, recipe);
    if (next === prev) return;
    set({
      deck: next,
      past: history ? [...state.past, prev].slice(-HISTORY_LIMIT) : state.past,
      future: history ? [] : state.future,
      dirty: true,
    });
    scheduleSave(next, () => set({ dirty: false }));
  }

  return {
    deck: null,
    currentSlide: 0,
    selectedId: null,
    past: [],
    future: [],
    dirty: false,

    async loadOrCreate(id) {
      let deck = id ? await loadDeck(id) : undefined;
      if (!deck) {
        deck = newDeck();
        await saveDeck(deck);
      }
      set({ deck, currentSlide: 0, selectedId: null, past: [], future: [] });
    },

    setDeck(deck) {
      set({ deck, currentSlide: 0, selectedId: null, past: [], future: [], dirty: true });
      scheduleSave(deck, () => set({ dirty: false }));
    },

    checkpoint() {
      const { deck, past } = get();
      if (!deck) return;
      set({ past: [...past, deck].slice(-HISTORY_LIMIT), future: [] });
    },

    undo() {
      const { past, future, deck } = get();
      if (!deck || past.length === 0) return;
      const prev = past[past.length - 1];
      set({
        deck: prev,
        past: past.slice(0, -1),
        future: [deck, ...future],
        dirty: true,
        selectedId: null,
      });
      scheduleSave(prev, () => set({ dirty: false }));
    },

    redo() {
      const { past, future, deck } = get();
      if (!deck || future.length === 0) return;
      const next = future[0];
      set({
        deck: next,
        past: [...past, deck],
        future: future.slice(1),
        dirty: true,
        selectedId: null,
      });
      scheduleSave(next, () => set({ dirty: false }));
    },

    setTitle(title) {
      mutate((d) => {
        d.title = title;
      });
    },

    applyTheme(theme) {
      mutate((d) => {
        d.theme = theme;
      });
    },

    selectSlide(idx) {
      set({ currentSlide: idx, selectedId: null });
    },

    addSlide() {
      const { currentSlide } = get();
      mutate((d) => {
        d.slides.splice(currentSlide + 1, 0, emptySlide());
      });
      set({ currentSlide: get().currentSlide + 1, selectedId: null });
    },

    deleteSlide(idx) {
      const { deck } = get();
      if (!deck || deck.slides.length <= 1) return;
      mutate((d) => {
        d.slides.splice(idx, 1);
      });
      const count = get().deck!.slides.length;
      set({ currentSlide: Math.min(get().currentSlide, count - 1), selectedId: null });
    },

    duplicateSlide(idx) {
      const src = get().deck?.slides[idx];
      if (!src) return;
      // Aus dem nicht-Draft-State tief klonen, damit verschachtelte Daten (z.B.
      // Tabellen-Zellen) nicht zwischen Original und Kopie geteilt werden.
      const copy: Slide = {
        id: uid('s_'),
        background: src.background,
        elements: src.elements.map((el) => ({ ...structuredClone(el), id: uid('e_') })),
      };
      mutate((d) => {
        d.slides.splice(idx + 1, 0, copy);
      });
      set({ currentSlide: idx + 1, selectedId: null });
    },

    moveSlide(from, to) {
      if (from === to) return;
      mutate((d) => {
        const [s] = d.slides.splice(from, 1);
        d.slides.splice(to, 0, s);
      });
      set({ currentSlide: to });
    },

    setSlideBackground(color) {
      const { currentSlide } = get();
      mutate((d) => {
        const s = currentSlideOf(d, currentSlide);
        if (s) s.background = color;
      });
    },

    selectElement(id) {
      set({ selectedId: id });
    },

    addText(role = 'body') {
      const { deck, currentSlide } = get();
      if (!deck) return;
      const id = uid('e_');
      const sizes = deck.theme.sizes;
      const fontSize = role === 'title' ? sizes.title : role === 'caption' ? sizes.caption : sizes.body;
      const el: TextElement = {
        id,
        type: 'text',
        x: deck.format.width / 2 - 300,
        y: deck.format.height / 2 - 40,
        width: 600,
        height: 80,
        rotation: 0,
        z: nextZ(deck, currentSlide),
        content: role === 'title' ? 'Titel' : 'Text eingeben',
        styleRole: role,
        align: 'left',
      };
      mutate((d) => {
        currentSlideOf(d, currentSlide)?.elements.push(el);
      });
      void fontSize;
      set({ selectedId: id });
    },

    addShape(shape) {
      const { deck, currentSlide } = get();
      if (!deck) return;
      const id = uid('e_');
      const el: ShapeElement = {
        id,
        type: 'shape',
        x: deck.format.width / 2 - 150,
        y: deck.format.height / 2 - 100,
        width: shape === 'line' ? 300 : 300,
        height: shape === 'line' ? 0 : 200,
        rotation: 0,
        z: nextZ(deck, currentSlide),
        shape,
        fill: shape === 'line' ? undefined : deck.theme.palette[1],
        stroke: shape === 'line' ? deck.theme.palette[0] : undefined,
        strokeWidth: shape === 'line' ? 4 : 0,
      };
      mutate((d) => {
        currentSlideOf(d, currentSlide)?.elements.push(el);
      });
      set({ selectedId: id });
    },

    addImage(assetId, width, height) {
      const { deck, currentSlide } = get();
      if (!deck) return;
      const id = uid('e_');
      const maxW = deck.format.width * 0.6;
      const scale = width > maxW ? maxW / width : 1;
      const el: ImageElement = {
        id,
        type: 'image',
        x: deck.format.width / 2 - (width * scale) / 2,
        y: deck.format.height / 2 - (height * scale) / 2,
        width: width * scale,
        height: height * scale,
        rotation: 0,
        z: nextZ(deck, currentSlide),
        assetId,
        fit: 'contain',
      };
      mutate((d) => {
        currentSlideOf(d, currentSlide)?.elements.push(el);
      });
      set({ selectedId: id });
    },

    addTable(rows = 3, cols = 3) {
      const { deck, currentSlide } = get();
      if (!deck) return;
      const id = uid('e_');
      const width = Math.min(720, deck.format.width * 0.6);
      const height = Math.min(320, deck.format.height * 0.4);
      const el: TableElement = {
        id,
        type: 'table',
        x: deck.format.width / 2 - width / 2,
        y: deck.format.height / 2 - height / 2,
        width,
        height,
        rotation: 0,
        z: nextZ(deck, currentSlide),
        rows,
        cols,
        cells: makeCells(rows, cols),
        headerRow: true,
        borderColor: '#cbd5e1',
        borderWidth: 1,
        headerFill: '#f1f5f9',
        fontSize: 20,
        color: deck.theme.palette[0],
        align: 'left',
      };
      mutate((d) => {
        currentSlideOf(d, currentSlide)?.elements.push(el);
      });
      set({ selectedId: id });
    },

    resizeTable(id, rows, cols) {
      const { currentSlide } = get();
      const r = Math.max(1, Math.min(20, rows));
      const c = Math.max(1, Math.min(12, cols));
      mutate((d) => {
        const el = currentSlideOf(d, currentSlide)?.elements.find((e) => e.id === id);
        if (el?.type !== 'table') return;
        el.cells = makeCells(r, c, el.cells);
        el.rows = r;
        el.cols = c;
      });
    },

    updateTableCell(id, row, col, html) {
      const { currentSlide } = get();
      mutate((d) => {
        const el = currentSlideOf(d, currentSlide)?.elements.find((e) => e.id === id);
        if (el?.type !== 'table') return;
        if (!el.cells[row]) el.cells[row] = [];
        el.cells[row][col] = html;
      }, false); // live, kein History-Spam (Checkpoint setzt der Edit-Start)
    },

    updateElement(id, patch, opts) {
      const history = opts?.history ?? true;
      const { currentSlide } = get();
      mutate((d) => {
        const s = currentSlideOf(d, currentSlide);
        const el = s?.elements.find((e) => e.id === id);
        if (el) Object.assign(el, patch);
      }, history);
    },

    deleteElement(id) {
      const { currentSlide } = get();
      mutate((d) => {
        const s = currentSlideOf(d, currentSlide);
        if (s) s.elements = s.elements.filter((e) => e.id !== id);
      });
      if (get().selectedId === id) set({ selectedId: null });
    },

    duplicateElement(id) {
      const { currentSlide, deck } = get();
      const src = deck?.slides[currentSlide].elements.find((e) => e.id === id);
      if (!src) return;
      const newId = uid('e_');
      const clone = { ...structuredClone(src), id: newId, x: src.x + 24, y: src.y + 24 };
      mutate((d) => {
        const s = currentSlideOf(d, currentSlide);
        if (s) {
          clone.z = nextZ(d, currentSlide);
          s.elements.push(clone);
        }
      });
      set({ selectedId: newId });
    },

    nudge(id, dx, dy) {
      const { currentSlide } = get();
      mutate((d) => {
        const el = currentSlideOf(d, currentSlide)?.elements.find((e) => e.id === id);
        if (el) {
          el.x += dx;
          el.y += dy;
        }
      });
    },

    bringForward(id) {
      reorder(get, mutate, id, +1);
    },

    sendBackward(id) {
      reorder(get, mutate, id, -1);
    },
  };
});

function nextZ(deck: Deck, slideIdx: number): number {
  const els = deck.slides[slideIdx]?.elements ?? [];
  return els.reduce((m, e) => Math.max(m, e.z), 0) + 1;
}

// Z-Order: tausche z mit dem in Stapelrichtung nächsten Element.
function reorder(
  get: () => DeckState,
  mutate: (recipe: (d: Draft<Deck>) => void, history?: boolean) => void,
  id: string,
  dir: 1 | -1,
) {
  const { currentSlide } = get();
  mutate((d) => {
    const els = currentSlideOf(d, currentSlide)?.elements;
    if (!els) return;
    const sorted = [...els].sort((a, b) => a.z - b.z);
    const i = sorted.findIndex((e) => e.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sorted.length) return;
    const a = els.find((e) => e.id === sorted[i].id)!;
    const b = els.find((e) => e.id === sorted[j].id)!;
    const tmp = a.z;
    a.z = b.z;
    b.z = tmp;
  });
}

// Baut eine rows×cols-Zellenmatrix und übernimmt dabei vorhandene Inhalte
// (beim Vergrößern/Verkleinern der Tabelle).
function makeCells(rows: number, cols: number, existing?: string[][]): string[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => existing?.[r]?.[c] ?? ''),
  );
}

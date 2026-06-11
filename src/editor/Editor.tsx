import { useEffect, useState } from 'react';
import { useDeck } from '../store/deckStore';
import { Toolbar } from './Toolbar';
import { SlidePanel } from './SlidePanel';
import { Canvas } from './Canvas';
import { Inspector } from './Inspector';

const INSPECTOR_KEY = 'slides:inspectorOpen';

interface Props {
  onPresent: () => void;
}

// Setzt das Editor-Layout zusammen und verdrahtet globale Shortcuts.
export function Editor({ onPresent }: Props) {
  const undo = useDeck((s) => s.undo);
  const redo = useDeck((s) => s.redo);
  const selectedId = useDeck((s) => s.selectedId);
  const deleteElement = useDeck((s) => s.deleteElement);
  const duplicateElement = useDeck((s) => s.duplicateElement);
  const nudge = useDeck((s) => s.nudge);

  const [inspectorOpen, setInspectorOpen] = useState(
    () => localStorage.getItem(INSPECTOR_KEY) !== 'false',
  );
  useEffect(() => {
    localStorage.setItem(INSPECTOR_KEY, String(inspectorOpen));
  }, [inspectorOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Nicht eingreifen, während in einem Eingabefeld / contenteditable getippt wird.
      const t = e.target as HTMLElement;
      const typing =
        t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA';

      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (typing) return;

      if (mod && e.key.toLowerCase() === 'd' && selectedId) {
        e.preventDefault();
        duplicateElement(selectedId);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        deleteElement(selectedId);
        return;
      }
      if (selectedId && e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const map: Record<string, [number, number]> = {
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
          ArrowUp: [0, -step],
          ArrowDown: [0, step],
        };
        const d = map[e.key];
        if (d) nudge(selectedId, d[0], d[1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, selectedId, deleteElement, duplicateElement, nudge]);

  return (
    <div className="editor">
      <Toolbar
        onPresent={onPresent}
        inspectorOpen={inspectorOpen}
        onToggleInspector={() => setInspectorOpen((v) => !v)}
      />
      <div className={`editor-body${inspectorOpen ? '' : ' no-inspector'}`}>
        <SlidePanel />
        <Canvas />
        {inspectorOpen && <Inspector />}
      </div>
    </div>
  );
}

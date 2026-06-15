import { useEffect, useMemo, useRef, useState } from 'react';
import Moveable from 'react-moveable';
import type { OnDrag, OnResize, OnRotate } from 'react-moveable';
import { useDeck } from '../store/deckStore';
import { SlideRenderer } from '../renderer/SlideRenderer';
import { useStageScale } from './useStageScale';
import { TextEditorOverlay } from './TextEditorOverlay';
import { TableEditorOverlay } from './TableEditorOverlay';

interface CanvasProps {
  snapEnabled: boolean;
}

// Editor-Bühne: skalierte Folie + Moveable-Handles auf dem selektierten Element.
// Moveable rechnet die Container-Skalierung selbst heraus; seine Werte sind
// bereits in logischen Einheiten.
export function Canvas({ snapEnabled }: CanvasProps) {
  const deck = useDeck((s) => s.deck)!;
  const currentSlide = useDeck((s) => s.currentSlide);
  const selectedId = useDeck((s) => s.selectedId);
  const selectElement = useDeck((s) => s.selectElement);
  const updateElement = useDeck((s) => s.updateElement);
  const updateTableCell = useDeck((s) => s.updateTableCell);
  const checkpoint = useDeck((s) => s.checkpoint);

  const slide = deck.slides[currentSlide];
  const { containerRef, scale } = useStageScale(deck.format.width, deck.format.height);
  const stageRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);

  // Geometrie zu Gesten-Beginn. Wir wenden Moveables ABSOLUTE Werte darauf an,
  // statt pro Frame inkrementell zu addieren — das verhindert das Wegdriften
  // beim Resize (besonders an den West-/Nord-Handles).
  const gesture = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  // Liest das aktuell selektierte Element frisch aus dem Store.
  const liveEl = (id: string) =>
    useDeck.getState().deck!.slides[useDeck.getState().currentSlide].elements.find(
      (x) => x.id === id,
    );

  function beginGesture() {
    checkpoint();
    const el = selectedId ? liveEl(selectedId) : undefined;
    gesture.current = el ? { x: el.x, y: el.y, width: el.width, height: el.height } : null;
  }

  // Ziel-DOM-Knoten für Moveable. Hängt nur an Selektion/Folie — NICHT am sich bei
  // jeder Mutation ändernden slide-Objekt, sonst würde Moveable mitten in der
  // Geste re-initialisiert.
  const elementCount = slide.elements.length;
  useEffect(() => {
    if (!selectedId) {
      setTarget(null);
      return;
    }
    const node = stageRef.current?.querySelector<HTMLElement>(
      `[data-element-id="${selectedId}"]`,
    );
    setTarget(node ?? null);
  }, [selectedId, currentSlide, elementCount]);

  // Verlasse Text-Edit, wenn Selektion wechselt.
  useEffect(() => {
    if (editingId && editingId !== selectedId) setEditingId(null);
  }, [selectedId, editingId]);

  // Andere Elemente als Snapping-Guidelines (stabile Liste, nicht pro Frame).
  const guidelines = useMemo(
    () =>
      Array.from(
        stageRef.current?.querySelectorAll<HTMLElement>('[data-element-id]') ?? [],
      ).filter((n) => n.dataset.elementId !== selectedId),
    [selectedId, currentSlide, elementCount],
  );

  const selEl = slide.elements.find((e) => e.id === selectedId);
  const editable = selEl?.type === 'text' || selEl?.type === 'table';
  const editing = editable && editingId === selectedId;

  return (
    <div ref={containerRef} className="stage-container">
      <div
        ref={stageRef}
        className="stage"
        style={{
          width: deck.format.width,
          height: deck.format.height,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        onDoubleClick={(e) => {
          const node = (e.target as HTMLElement).closest('[data-element-id]');
          const id = node?.getAttribute('data-element-id');
          const t = id ? liveEl(id)?.type : undefined;
          if (id && (t === 'text' || t === 'table')) {
            selectElement(id);
            checkpoint(); // ein Undo-Schritt für die gesamte Edit-Session
            setEditingId(id);
          }
        }}
      >
        <SlideRenderer
          slide={slide}
          deck={deck}
          onBackgroundPointerDown={() => {
            selectElement(null);
            setEditingId(null);
          }}
          onElementPointerDown={(id, e) => {
            e.stopPropagation();
            if (id !== selectedId) {
              selectElement(id);
              setEditingId(null);
            }
          }}
        />
        {editing && selEl?.type === 'text' && (
          <TextEditorOverlay
            key={selEl.id}
            element={selEl}
            theme={deck.theme}
            onCommit={(html) => updateElement(selEl.id, { content: html }, { history: false })}
          />
        )}
        {editing && selEl?.type === 'table' && (
          <TableEditorOverlay
            key={`${selEl.id}:${selEl.rows}x${selEl.cols}`}
            element={selEl}
            theme={deck.theme}
            onCellInput={(r, c, html) => updateTableCell(selEl.id, r, c, html)}
          />
        )}
      </div>

      {target && !editing && (
        <Moveable
          target={target}
          draggable
          resizable
          rotatable
          throttleDrag={0}
          throttleResize={0}
          throttleRotate={0}
          // --- Snapping ---
          snappable={snapEnabled}
          // Guideline-Werte in logischen Folien-Koordinaten interpretieren.
          snapContainer={stageRef.current ?? undefined}
          snapThreshold={7}
          isDisplaySnapDigit
          snapDirections={{ top: true, left: true, bottom: true, right: true, center: true, middle: true }}
          elementSnapDirections={{ top: true, left: true, bottom: true, right: true, center: true, middle: true }}
          // An anderen Elementen (Kanten + Mitten) ausrichten …
          elementGuidelines={guidelines}
          // … und an Folien-Rändern + Mittelachsen.
          verticalGuidelines={[0, deck.format.width / 2, deck.format.width]}
          horizontalGuidelines={[0, deck.format.height / 2, deck.format.height]}
          onDragStart={beginGesture}
          onDrag={(e: OnDrag) => {
            const s = gesture.current;
            if (!s || !selectedId) return;
            // Moveable rechnet die Skalierung des Eltern-Containers selbst heraus
            // (es invertiert die Matrix aller Vorfahren). beforeTranslate ist daher
            // bereits in logischen Einheiten — NICHT durch scale teilen.
            updateElement(
              selectedId,
              { x: s.x + e.beforeTranslate[0], y: s.y + e.beforeTranslate[1] },
              { history: false },
            );
          }}
          onResizeStart={beginGesture}
          onResize={(e: OnResize) => {
            const s = gesture.current;
            if (!s || !selectedId) return;
            const el = liveEl(selectedId);
            const minH = el?.type === 'shape' && el.shape === 'line' ? 0 : 8;
            // e.width/e.height = absolute neue Größe (logisch); e.drag.beforeTranslate
            // = zugehörige Positionsverschiebung (für West-/Nord-Handles).
            updateElement(
              selectedId,
              {
                width: Math.max(8, e.width),
                height: Math.max(minH, e.height),
                x: s.x + e.drag.beforeTranslate[0],
                y: s.y + e.drag.beforeTranslate[1],
              },
              { history: false },
            );
          }}
          onRotateStart={beginGesture}
          onRotate={(e: OnRotate) => {
            if (!selectedId) return;
            const el = liveEl(selectedId);
            if (!el) return;
            // Rotation ist skalierungsunabhängig → inkrementelles Delta genügt.
            updateElement(selectedId, { rotation: el.rotation + e.delta }, { history: false });
          }}
        />
      )}
    </div>
  );
}

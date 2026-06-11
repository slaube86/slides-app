import { useEffect, useMemo, useRef, useState } from 'react';
import Moveable from 'react-moveable';
import type { OnDrag, OnResize, OnRotate } from 'react-moveable';
import { useDeck } from '../store/deckStore';
import { SlideRenderer } from '../renderer/SlideRenderer';
import { useStageScale } from './useStageScale';
import { TextEditorOverlay } from './TextEditorOverlay';

// Editor-Bühne: skalierte Folie + Moveable-Handles auf dem selektierten Element.
// Moveable-Deltas kommen in Bildschirm-Pixeln — wir teilen durch scale, um auf
// logische Einheiten zu kommen.
export function Canvas() {
  const deck = useDeck((s) => s.deck)!;
  const currentSlide = useDeck((s) => s.currentSlide);
  const selectedId = useDeck((s) => s.selectedId);
  const selectElement = useDeck((s) => s.selectElement);
  const updateElement = useDeck((s) => s.updateElement);
  const checkpoint = useDeck((s) => s.checkpoint);

  const slide = deck.slides[currentSlide];
  const { containerRef, scale } = useStageScale(deck.format.width, deck.format.height);
  const stageRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);

  // Liest das aktuell selektierte Element frisch aus dem Store (für Delta-Basis).
  const liveEl = (id: string) =>
    useDeck.getState().deck!.slides[useDeck.getState().currentSlide].elements.find(
      (x) => x.id === id,
    );

  // Ziel-DOM-Knoten für Moveable aus der selektierten ID.
  useEffect(() => {
    if (!selectedId) {
      setTarget(null);
      return;
    }
    const node = stageRef.current?.querySelector<HTMLElement>(
      `[data-element-id="${selectedId}"]`,
    );
    setTarget(node ?? null);
  }, [selectedId, currentSlide, slide]);

  // Verlasse Text-Edit, wenn Selektion wechselt.
  useEffect(() => {
    if (editingId && editingId !== selectedId) setEditingId(null);
  }, [selectedId, editingId]);

  // Andere Elemente als Snapping-Guidelines.
  const guidelines = useMemo(
    () =>
      Array.from(
        stageRef.current?.querySelectorAll<HTMLElement>('[data-element-id]') ?? [],
      ).filter((n) => n.dataset.elementId !== selectedId),
    [selectedId, slide, currentSlide],
  );

  const selEl = slide.elements.find((e) => e.id === selectedId);
  const editing = selEl?.type === 'text' && editingId === selectedId;

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
          if (id && liveEl(id)?.type === 'text') {
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
          snappable
          snapThreshold={6}
          elementGuidelines={guidelines}
          snapDirections={{ top: true, left: true, bottom: true, right: true, center: true, middle: true }}
          elementSnapDirections={{ top: true, left: true, bottom: true, right: true, center: true, middle: true }}
          onDragStart={checkpoint}
          onDrag={(e: OnDrag) => {
            const el = selectedId && liveEl(selectedId);
            if (!el) return;
            updateElement(
              el.id,
              { x: el.x + e.delta[0] / scale, y: el.y + e.delta[1] / scale },
              { history: false },
            );
          }}
          onResizeStart={checkpoint}
          onResize={(e: OnResize) => {
            const el = selectedId && liveEl(selectedId);
            if (!el) return;
            const minH = el.type === 'shape' && el.shape === 'line' ? 0 : 8;
            updateElement(
              el.id,
              {
                width: Math.max(8, el.width + e.delta[0] / scale),
                height: Math.max(minH, el.height + e.delta[1] / scale),
                x: el.x + (e.drag.delta[0] ?? 0) / scale,
                y: el.y + (e.drag.delta[1] ?? 0) / scale,
              },
              { history: false },
            );
          }}
          onRotateStart={checkpoint}
          onRotate={(e: OnRotate) => {
            const el = selectedId && liveEl(selectedId);
            if (!el) return;
            updateElement(el.id, { rotation: el.rotation + e.delta }, { history: false });
          }}
        />
      )}
    </div>
  );
}

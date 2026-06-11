import { useState } from 'react';
import { useDeck } from '../store/deckStore';
import { SlideRenderer } from '../renderer/SlideRenderer';
import { IconPlus, IconCopy, IconTrash } from '../ui/icons';

const THUMB_W = 210;

// Folien-Liste mit echten Thumbnails (derselbe SlideRenderer, nur klein skaliert).
export function SlidePanel() {
  const deck = useDeck((s) => s.deck)!;
  const current = useDeck((s) => s.currentSlide);
  const selectSlide = useDeck((s) => s.selectSlide);
  const addSlide = useDeck((s) => s.addSlide);
  const deleteSlide = useDeck((s) => s.deleteSlide);
  const duplicateSlide = useDeck((s) => s.duplicateSlide);
  const moveSlide = useDeck((s) => s.moveSlide);

  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const scale = THUMB_W / deck.format.width;
  const thumbH = deck.format.height * scale;

  return (
    <aside className="slide-panel">
      <div className="slide-panel-head">
        <span>Folien</span>
        <button className="btn-icon" title="Folie hinzufügen" aria-label="Folie hinzufügen" onClick={addSlide}>
          <IconPlus />
        </button>
      </div>
      <div className="slide-list">
        {deck.slides.map((slide, i) => (
          <div
            key={slide.id}
            className={`thumb-row${i === current ? ' active' : ''}`}
            draggable
            onDragStart={() => setDragFrom(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragFrom !== null) moveSlide(dragFrom, i);
              setDragFrom(null);
            }}
            onClick={() => selectSlide(i)}
          >
            <div className="thumb-top">
              <span className="thumb-num">{i + 1}</span>
              <div className="thumb-actions">
                <button
                  className="btn-icon sm"
                  title="Duplizieren"
                  aria-label="Folie duplizieren"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateSlide(i);
                  }}
                >
                  <IconCopy size={14} />
                </button>
                <button
                  className="btn-icon sm"
                  title="Löschen"
                  aria-label="Folie löschen"
                  disabled={deck.slides.length <= 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSlide(i);
                  }}
                >
                  <IconTrash size={14} />
                </button>
              </div>
            </div>
            <div className="thumb" style={{ width: THUMB_W, height: thumbH }}>
              <div
                style={{
                  width: deck.format.width,
                  height: deck.format.height,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  pointerEvents: 'none',
                }}
              >
                <SlideRenderer slide={slide} deck={deck} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

import { useEffect, useState } from 'react';
import { useDeck } from './store/deckStore';
import { Editor } from './editor/Editor';
import { Presentation } from './present/Presentation';
import { requestPersistentStorage } from './db/db';

const LAST_DECK_KEY = 'slides:lastDeckId';

export function App() {
  const deck = useDeck((s) => s.deck);
  const loadOrCreate = useDeck((s) => s.loadOrCreate);
  const currentSlide = useDeck((s) => s.currentSlide);
  const [presenting, setPresenting] = useState(false);

  // Initial laden + Speicher als persistent markieren (Durability-Sicherheitsnetz).
  useEffect(() => {
    requestPersistentStorage();
    const last = localStorage.getItem(LAST_DECK_KEY) ?? undefined;
    loadOrCreate(last);
  }, [loadOrCreate]);

  // Zuletzt geöffnetes Deck merken.
  useEffect(() => {
    if (deck) localStorage.setItem(LAST_DECK_KEY, deck.id);
  }, [deck?.id]);

  if (!deck) {
    return <div className="loading">Lade …</div>;
  }

  if (presenting) {
    return (
      <Presentation deck={deck} startIndex={currentSlide} onExit={() => setPresenting(false)} />
    );
  }

  return <Editor onPresent={() => setPresenting(true)} />;
}

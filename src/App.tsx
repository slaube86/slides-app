import { useEffect, useRef, useState } from 'react';
import { useDeck } from './store/deckStore';
import { Editor } from './editor/Editor';
import { Presentation } from './present/Presentation';
import { requestPersistentStorage } from './db/db';
import { clearSharedHash, hasSharedDeck, readSharedDeck } from './export/share';

const LAST_DECK_KEY = 'slides:lastDeckId';

export function App() {
  const deck = useDeck((s) => s.deck);
  const loadOrCreate = useDeck((s) => s.loadOrCreate);
  const setDeck = useDeck((s) => s.setDeck);
  const currentSlide = useDeck((s) => s.currentSlide);
  const [presenting, setPresenting] = useState(false);
  const initialized = useRef(false);

  // Initial laden + Speicher als persistent markieren (Durability-Sicherheitsnetz).
  useEffect(() => {
    if (initialized.current) return; // StrictMode/Doppel-Mount nur einmal
    initialized.current = true;
    requestPersistentStorage();
    const openLast = () => loadOrCreate(localStorage.getItem(LAST_DECK_KEY) ?? undefined);

    // Geteilten Link bevorzugen: Deck aus dem URL-Hash importieren.
    if (hasSharedDeck()) {
      readSharedDeck()
        .then((shared) => (shared ? setDeck(shared) : openLast()))
        .catch((err) => {
          console.error('Share-Link konnte nicht gelesen werden:', err);
          const hint =
            location.hash.length > 60_000
              ? '\n\nDer Link ist sehr lang (vermutlich Bilder) und wurde evtl. abgeschnitten. Für bildlastige Decks bitte die JSON-Datei teilen.'
              : '';
          alert('Der geteilte Link konnte nicht gelesen werden:\n' + (err as Error).message + hint);
          openLast();
        })
        .finally(clearSharedHash);
      return;
    }
    openLast();
  }, [loadOrCreate, setDeck]);

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

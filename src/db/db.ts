import Dexie, { type Table } from 'dexie';
import type { Asset, Deck } from '../types';

// Zwei Tabellen: decks (Metadaten + komplettes Slide-JSON) und assets (Bild-Blobs).
// Bilder NICHT als base64 ins Deck-JSON — nur die assetId referenzieren.
class SlidesDB extends Dexie {
  decks!: Table<Deck, string>;
  assets!: Table<Asset, string>;

  constructor() {
    super('slides-app');
    this.version(1).stores({
      decks: 'id, updatedAt, title',
      assets: 'id, createdAt',
    });
  }
}

export const db = new SlidesDB();

export async function saveDeck(deck: Deck): Promise<void> {
  await db.decks.put(deck);
}

export async function loadDeck(id: string): Promise<Deck | undefined> {
  return db.decks.get(id);
}

export async function loadAllDecks(): Promise<Deck[]> {
  return db.decks.orderBy('updatedAt').reverse().toArray();
}

export async function deleteDeck(id: string): Promise<void> {
  await db.decks.delete(id);
}

export async function putAsset(asset: Asset): Promise<void> {
  await db.assets.put(asset);
}

export async function getAsset(id: string): Promise<Asset | undefined> {
  return db.assets.get(id);
}

// Bittet den Browser, den Speicher als persistent zu markieren — reduziert
// Auto-Eviction unter Speicherdruck stark. Bestes-Bemühen, niemals werfen.
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      const already = await navigator.storage.persisted();
      if (already) return true;
      return await navigator.storage.persist();
    }
  } catch {
    /* ignore */
  }
  return false;
}

import type { Deck } from '../types';
import { getAsset, putAsset } from '../db/db';
import { uid } from '../utils/id';

// Portables Backup-Format: Deck + alle referenzierten Assets als Data-URL.
// (Im LIVE-Deck bleiben Bilder Blobs in der assets-Tabelle — nur beim Export
// werden sie eingebettet, damit die .json-Datei ein echtes Sicherungsnetz ist.)
interface DeckBundle {
  version: 1;
  deck: Deck;
  assets: { id: string; type: string; dataUrl: string }[];
}

function collectAssetIds(deck: Deck): Set<string> {
  const ids = new Set<string>();
  for (const slide of deck.slides) {
    if (slide.background && !slide.background.startsWith('#')) ids.add(slide.background);
    for (const el of slide.elements) {
      if (el.type === 'image') ids.add(el.assetId);
    }
  }
  return ids;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

export async function exportDeckJson(deck: Deck): Promise<void> {
  const assets: DeckBundle['assets'] = [];
  for (const id of collectAssetIds(deck)) {
    const asset = await getAsset(id);
    if (asset) assets.push({ id, type: asset.type, dataUrl: await blobToDataUrl(asset.blob) });
  }
  const bundle: DeckBundle = { version: 1, deck, assets };
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  triggerDownload(blob, `${sanitize(deck.title)}.json`);
}

export async function importDeckJson(file: File): Promise<Deck> {
  const bundle = JSON.parse(await file.text()) as DeckBundle;
  if (!bundle.deck || !Array.isArray(bundle.assets)) {
    throw new Error('Keine gültige Slides-Datei.');
  }
  // Assets wieder in die DB schreiben (IDs aus dem Bundle behalten).
  for (const a of bundle.assets) {
    await putAsset({ id: a.id, blob: await dataUrlToBlob(a.dataUrl), type: a.type, createdAt: Date.now() });
  }
  // Frische ID, damit Import nicht ein vorhandenes Deck überschreibt.
  return { ...bundle.deck, id: uid('d_'), updatedAt: Date.now() };
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sanitize(name: string): string {
  return name.replace(/[^\w\- ]+/g, '').trim() || 'praesentation';
}

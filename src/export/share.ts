import type { Deck } from '../types';
import { bundleDeck, restoreBundle, type DeckBundle } from './json';

// Teilen ohne Backend: das komplette Deck (inkl. Bilder) wird komprimiert und in
// den URL-Hash gepackt. Der Empfänger lädt es lokal aus dem Link.
//
// Hash statt Query-Parameter, weil der Fragment-Teil (#…) nicht an Server gesendet
// wird (privat) und längere Daten erlaubt.

const HASH_KEY = 'deck';
// Ab dieser Link-Länge wird gewarnt — Chat-/Mail-Dienste kürzen sehr lange URLs.
export const SHARE_SOFT_LIMIT = 32_000;

// ---- gzip via native CompressionStream (keine Dependency) ----
async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

// ---- base64url (URL-sicher, ohne +/=) ----
function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64: string): Uint8Array {
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Erstes Zeichen des Payloads kennzeichnet das Format:
//   '1' = gzip + base64url, '0' = unkomprimiert (UTF-8) + base64url.
// Ältere Links ohne Kennung werden als gzip interpretiert.
const FMT_GZIP = '1';
const FMT_RAW = '0';

// Baut den teilbaren Link für ein Deck.
export async function buildShareUrl(deck: Deck): Promise<string> {
  const json = JSON.stringify(await bundleDeck(deck));
  let payload: string;
  if (typeof CompressionStream !== 'undefined') {
    payload = FMT_GZIP + bytesToBase64Url(await gzip(json));
  } else {
    payload = FMT_RAW + bytesToBase64Url(new TextEncoder().encode(json));
  }
  const base = `${location.origin}${location.pathname}`;
  return `${base}#${HASH_KEY}=${payload}`;
}

// Liest ein geteiltes Deck aus dem aktuellen URL-Hash (falls vorhanden).
export function hasSharedDeck(): boolean {
  return new URLSearchParams(location.hash.slice(1)).has(HASH_KEY);
}

export async function readSharedDeck(): Promise<Deck | null> {
  const payload = new URLSearchParams(location.hash.slice(1)).get(HASH_KEY);
  if (!payload) return null;

  const fmt = payload[0];
  let json: string;
  if (fmt === FMT_RAW) {
    json = new TextDecoder().decode(base64UrlToBytes(payload.slice(1)));
  } else {
    // FMT_GZIP oder Alt-Link ohne Kennung.
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('Dieser Browser kann komprimierte Links nicht entpacken (zu alt).');
    }
    const body = fmt === FMT_GZIP ? payload.slice(1) : payload;
    json = await gunzip(base64UrlToBytes(body));
  }

  const bundle = JSON.parse(json) as DeckBundle;
  return restoreBundle(bundle);
}

// Entfernt den Share-Payload aus der Adresszeile, ohne neu zu laden.
export function clearSharedHash(): void {
  history.replaceState(null, '', `${location.origin}${location.pathname}${location.search}`);
}

export function shareSupported(): boolean {
  return typeof CompressionStream !== 'undefined';
}

// Robustes Kopieren: erst die Clipboard-API (sicherer Kontext + Geste nötig),
// sonst Fallback über ein temporäres Textfeld + execCommand.
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fällt unten auf execCommand zurück */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

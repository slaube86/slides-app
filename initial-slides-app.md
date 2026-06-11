# Slides-App — Projekt-Spec

Eine WYSIWYG-Web-App zum Erstellen von Präsentationsfolien. Läuft komplett im Browser, ohne Backend, ohne fremde Datenbank.

---

## Festgelegte Entscheidungen

| Thema | Entscheidung |
|---|---|
| Bearbeitung | WYSIWYG (Drag & Drop) |
| Wo es läuft | Nur lokal (im Browser) |
| Nutzung | Einzelperson, keine Kollaboration |
| Speicherung | Dateibasiert / leichtgewichtig, keine relationale DB |

Daraus folgt: reine **Frontend-SPA**, hostbar als statische Dateien (oder als PWA installierbar). Kein Server, keine Auth, keine Sync-Logik.

---

## Tech-Stack

- **React + Vite + TypeScript** — TS ist wegen des strukturierten Datenmodells wichtig.
- **zustand** — leichtgewichtiges State-Management, wenig Boilerplate.
- **immer** — unveränderliche Updates; macht Undo/Redo fast geschenkt.
- **moveable** — Drag-/Resize-/Rotate-Handles inkl. Snapping-Guides.
- **dexie** — angenehmer Wrapper um IndexedDB.

---

## Architektur

Drei Schichten, mit dem State als einziger Quelle der Wahrheit:

```
┌─────────────────────────────────────────────┐
│ UI-Schicht                                   │
│   Editor  ──  SlideRenderer (geteilt)  ──  Präsentation │
└─────────────────────────────────────────────┘
                      ↕  liest & mutiert
              zustand + immer  (State + Undo/Redo)
                      ↕  autosave / laden
┌─────────────────────────────────────────────┐
│ Persistenz — Dexie → IndexedDB               │
│   decks (Metadaten + Slide-JSON)   assets (Bild-Blobs) │
└─────────────────────────────────────────────┘
```

**Zentrale Idee — ein Renderer für alles:** Eine `SlideRenderer`-Komponente rendert eine Folie aus dem JSON. Sie wird an *allen* drei Stellen wiederverwendet — im Editor (mit Selektion drumherum), im Präsentationsmodus (read-only) und beim Export. So gibt es keine Abweichungen zwischen Bearbeiten und Präsentieren.

---

## Datenmodell

Ein Deck ist ein verschachteltes JSON-Objekt — serialisiert sauber, ganz ohne DB.

```ts
type ElementType = 'text' | 'image' | 'shape';

interface BaseElement {
  id: string;
  type: ElementType;
  x: number;        // logische Einheiten (0..format.width)
  y: number;        // logische Einheiten (0..format.height)
  width: number;
  height: number;
  rotation: number; // Grad
  z: number;        // Stapelreihenfolge
}

interface TextElement extends BaseElement {
  type: 'text';
  content: string;                 // Rich-Text / HTML
  styleRole?: 'title' | 'body' | 'caption';  // referenziert das Theme
  fontSize?: number;               // optionaler Override
  color?: string;
  align?: 'left' | 'center' | 'right';
}

interface ImageElement extends BaseElement {
  type: 'image';
  assetId: string;                 // Referenz auf assets-Tabelle (Blob)
  fit?: 'cover' | 'contain';
}

interface ShapeElement extends BaseElement {
  type: 'shape';
  shape: 'rect' | 'ellipse' | 'line';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

type SlideElement = TextElement | ImageElement | ShapeElement;

interface Slide {
  id: string;
  background?: string;             // Farbe oder assetId
  elements: SlideElement[];
}

interface Theme {
  palette: string[];
  fontFamily: string;
  sizes: { title: number; body: number; caption: number };
}

interface Deck {
  id: string;
  title: string;
  format: { width: number; height: number };  // z.B. 1280x720
  theme: Theme;
  slides: Slide[];
  createdAt: number;
  updatedAt: number;
}
```

Das `type`-Feld macht das Modell erweiterbar — neue Element-Typen (Tabelle, Diagramm) lassen sich später ergänzen, ohne das Schema zu sprengen.

---

## Koordinatensystem

Positionen werden **nicht in Pixeln** gespeichert, sondern in logischen Einheiten relativ zur festen Folien-Größe (`deck.format`, z.B. 1280×720).

Die Folie auf dem Bildschirm ist nur ein skalierter Container: ein einzelner `scale`-Faktor wird berechnet, alles darin skaliert mit.

Vorteile:
- Editor, Präsentationsmodus und Export nutzen dieselben Koordinaten — unabhängig von der Fenstergröße.
- Zoomen im Editor = nur den Skalierungsfaktor ändern.
- Keine „Element sitzt im Export woanders"-Probleme.

---

## Speicherung

Zwei Dexie-Tabellen in IndexedDB:

- **`decks`** — Metadaten + komplettes Slide-JSON.
- **`assets`** — Bilder als `Blob`, referenziert per `assetId`.

> **Wichtig:** Bilder **nicht** als base64 ins Deck-JSON packen. Das bläht das JSON auf und macht jedes Speichern langsam. Stattdessen als Blob in `assets`, im Element nur die `assetId`.

**Autosave:** debounced Schreiben ins IndexedDB bei Änderungen.

### Durability-Caveat (kritisch bei lokal-only)

IndexedDB ist **nicht garantiert dauerhaft** — der Browser darf es unter Speicherdruck löschen, und der Nutzer killt es beim „Browserdaten löschen". Zwei Sicherheitsnetze:

1. **`navigator.storage.persist()`** aufrufen — bittet den Browser, den Speicher als persistent zu markieren (reduziert Auto-Eviction stark).
2. **Export/Import als `.json`-Datei** als Kernfeature behandeln, nicht als Nice-to-have. Regelmäßig zum Sichern nudgen. Das ist der eigentliche Schutz gegen Datenverlust.

---

## Theme-System

Ein leichtes Konzept, das „brauchbar" von „Spielzeug" trennt:

- Ein Deck hat eine **Palette** (paar Farben), eine **Schriftart** und drei **Größen-Rollen** (Titel / Body / Caption).
- Elemente referenzieren diese Rollen (`styleRole`) statt fixe Werte zu speichern.
- Dann lässt sich das ganze Deck mit einem Klick umfärben und bleibt konsistent.

Relativ wenig Aufwand, großer Effekt auf das Ergebnis.

---

## Element-Typen

**MVP:** Text, Bild, einfache Formen (Rechteck, Ellipse, Linie/Pfeil). Deckt ~90 % ab.

**Bewusst später:** Tabellen, Diagramme, Icons, Code-Blöcke — jeweils ein eigenes kleines Projekt.

---

## Export

PDF-/Bild-Export aus HTML ist fummeliger als gedacht.

- Gängiger Weg: **`html2canvas` + `jsPDF`**.
- Fallstricke: Web-Fonts müssen geladen *und* eingebettet sein (sonst falsche Schrift im PDF); manche CSS-Effekte rendern nicht sauber.
- Dank festem Koordinatensystem + geteiltem `SlideRenderer` ist es machbar: jede Folie in fester Größe rendern, „Screenshot" schießen.
- **Echtes `.pptx`-Export** (via `pptxgenjs`) ist eine ganz andere Liga — fürs Erste außen vor lassen.

---

## PWA

Da alles lokal läuft, bietet sich an, die App als **PWA** installierbar und voll offline-fähig zu machen:

- Service Worker cached die Assets.
- IndexedDB hält die Daten.
- Fühlt sich an wie eine native Desktop-App.

---

## Bau-Reihenfolge

Jeder Schritt ist für sich vorzeigbar:

1. Datenmodell + `SlideRenderer` für eine einzelne statische Folie
2. Slide-Liste mit Thumbnails, neue Folie hinzufügen, navigieren
3. Elemente hinzufügen, Selektion, `moveable` (Drag/Resize/Rotate)
4. Text-Editing (`contenteditable`) und Bild-Upload
5. Persistenz mit Dexie + Autosave
6. Undo/Redo
7. Präsentationsmodus (Fullscreen, Pfeiltasten)
8. Export — erst JSON (Import/Export), dann PDF

---

## Offene Punkte / später

- Speaker-Notes + Presenter-View
- Alignment-Guides, Grouping, Z-Order-Controls (nach vorn/hinten)
- Keyboard-Shortcuts (Copy/Paste/Duplicate, Arrow-Nudge)
- Template-Galerie als Startpunkt
- Performance bei großen Decks (Thumbnail-Caching, virtualisierte Slide-Liste)

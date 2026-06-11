# Slides

Eine WYSIWYG-Web-App zum Erstellen von Präsentationsfolien. Läuft komplett im
Browser — **ohne Backend, ohne Login, ohne fremde Datenbank**. Deine Decks liegen
lokal in IndexedDB; das einzige, was die App verlässt, sind die Dateien, die du
selbst exportierst.

> Reine Frontend-SPA, hostbar als statische Dateien.

---

## Features

- **WYSIWYG-Editor** mit Drag, Resize und Rotate (inkl. Snapping-Guides zu anderen
  Elementen).
- **Element-Typen:** Text, Bild, Formen (Rechteck, Ellipse, Linie).
- **Inline-Text-Editing** direkt auf der Folie (`contenteditable`), live gespeichert.
- **Folien-Verwaltung:** Liste mit echten Thumbnails, hinzufügen, duplizieren,
  löschen, per Drag & Drop umsortieren.
- **Theme-System:** Palette, Schriftart und Größen-Rollen (Titel / Body / Caption) —
  Elemente referenzieren Rollen statt fixer Werte, also lässt sich das ganze Deck
  konsistent umfärben.
- **Undo / Redo** über die gesamte Bearbeitung.
- **Präsentationsmodus:** Vollbild, Navigation per Pfeiltasten, Klick oder
  Leertaste.
- **Export / Import:**
  - `.json` als vollständiges, portables Backup (inkl. eingebetteter Bilder).
  - `.pdf` (eine Folie pro Seite).
- **Autosave:** debounced Schreiben nach IndexedDB; `navigator.storage.persist()`
  reduziert das Risiko, dass der Browser die Daten verwirft.
- **Cleanes Schwarz-Weiß-UI** mit flachem SVG-Icon-Set und ausblendbarem Inspector.

---

## Tech-Stack

| Bibliothek | Zweck |
|---|---|
| **React + Vite + TypeScript** | UI & strukturiertes, typisiertes Datenmodell |
| **zustand** | leichtgewichtiges State-Management |
| **immer** | unveränderliche Updates → Undo/Redo fast geschenkt |
| **react-moveable** | Drag-/Resize-/Rotate-Handles inkl. Snapping |
| **dexie** | komfortabler Wrapper um IndexedDB |
| **html2canvas + jsPDF** | PDF-Export (lazy geladen) |

---

## Schnellstart

Voraussetzung: Node.js (getestet mit Node 26).

```bash
npm install
npm run dev      # Dev-Server (Vite), Standard-Port 5173
```

Weitere Scripts:

```bash
npm run build      # tsc --noEmit && vite build  →  Production-Build nach dist/
npm run preview    # Production-Build lokal serven
npm run typecheck  # nur Typprüfung
```

---

## Architektur

Drei Schichten, mit dem zustand-State als einziger Quelle der Wahrheit:

```
┌──────────────────────────────────────────────────────────┐
│ UI:  Editor  ──  SlideRenderer (geteilt)  ──  Präsentation │
└──────────────────────────────────────────────────────────┘
                        ↕  liest & mutiert
                zustand + immer  (State + Undo/Redo)
                        ↕  autosave / laden
┌──────────────────────────────────────────────────────────┐
│ Persistenz:  Dexie → IndexedDB                             │
│   decks (Metadaten + Slide-JSON)      assets (Bild-Blobs)  │
└──────────────────────────────────────────────────────────┘
```

**Ein Renderer für alles.** Die `SlideRenderer`-Komponente rendert eine Folie aus
dem JSON und wird an *jeder* Stelle wiederverwendet — im Editor (mit Selektion
drumherum), in den Thumbnails, im Präsentationsmodus und beim PDF-Export. Dadurch
gibt es keine Abweichungen zwischen Bearbeiten und Präsentieren.

**Logisches Koordinatensystem.** Positionen werden nicht in Pixeln gespeichert,
sondern in logischen Einheiten relativ zur festen Folien-Größe (`deck.format`,
z. B. 1280 × 720). Auf dem Bildschirm ist die Folie nur ein per CSS-`transform`
skalierter Container — ein einziger `scale`-Faktor, alles skaliert mit. Zoom =
Faktor ändern; nichts „sitzt im Export woanders".

---

## Datenmodell (Kurzfassung)

```ts
Deck   { id, title, format {width,height}, theme, slides[], createdAt, updatedAt }
Theme  { palette[], fontFamily, sizes {title, body, caption} }
Slide  { id, background?, elements[] }

// gemeinsame Basis: id, type, x, y, width, height, rotation, z
TextElement   { type:'text',  content, styleRole?, fontSize?, color?, align? }
ImageElement  { type:'image', assetId, fit? }          // Blob in assets-Tabelle
ShapeElement  { type:'shape', shape, fill?, stroke?, strokeWidth? }
```

Das `type`-Feld macht das Modell erweiterbar — neue Element-Typen (Tabelle,
Diagramm) lassen sich ergänzen, ohne das Schema zu sprengen. Vollständige
Definition: [`src/types.ts`](src/types.ts).

---

## Tastenkürzel

| Aktion | Kürzel |
|---|---|
| Rückgängig / Wiederholen | `⌘Z` / `⌘⇧Z` (auch `⌘Y`) |
| Element duplizieren | `⌘D` |
| Element löschen | `Delete` / `Backspace` |
| Element verschieben | Pfeiltasten (`⇧` = 10er-Schritte) |
| Text bearbeiten | Doppelklick auf Text |
| Text-Edit beenden | `Esc` oder `⌘↵` |
| Präsentation: weiter / zurück | `→ ↓ Leertaste` / `← ↑` |
| Präsentation beenden | `Esc` |

---

## Speicherung & Datensicherheit

Daten liegen ausschließlich lokal in IndexedDB (zwei Tabellen: `decks` und
`assets`). Bilder werden als `Blob` in `assets` gehalten und im Deck nur per
`assetId` referenziert — **nie** als base64 im JSON, das würde das Speichern
verlangsamen.

> ⚠️ **IndexedDB ist nicht garantiert dauerhaft.** Der Browser darf den Speicher
> unter Speicherdruck löschen, und „Browserdaten löschen" entfernt ihn ebenfalls.
> Die App ruft `navigator.storage.persist()` auf, um das Risiko zu senken — der
> eigentliche Schutz ist aber der **JSON-Export**. Sichere wichtige Decks
> regelmäßig als `.json`.

Ein `.json`-Backup enthält das komplette Deck *plus* alle verwendeten Bilder
(eingebettet), ist also vollständig portabel. Beim Import wird es als neues Deck
angelegt; das aktuelle Deck bleibt unberührt.

Eine Beispiel-Datei zum Ausprobieren liegt bei:
[`example-claude-code.json`](example-claude-code.json) — über **Import** in der
Toolbar laden.

---

## Projektstruktur

```
src/
├─ types.ts                 Datenmodell (Deck, Slide, Elemente, Theme, Asset)
├─ App.tsx                  Einstieg: laden, Editor ↔ Präsentation
├─ store/deckStore.ts       zustand + immer: State, Mutationen, Undo/Redo, Autosave
├─ db/
│  ├─ db.ts                 Dexie-Setup, CRUD, persist()
│  └─ assetCache.ts         Blob-URL-Cache & Bild-Upload
├─ renderer/                der geteilte Renderer
│  ├─ SlideRenderer.tsx     rendert eine Folie aus JSON (überall wiederverwendet)
│  ├─ ElementView.tsx       Rendering pro Element-Typ
│  └─ AssetImage.tsx        Bild aus dem Asset-Cache
├─ editor/
│  ├─ Editor.tsx            Layout + globale Shortcuts + Inspector-Toggle
│  ├─ Toolbar.tsx           Titel, Elemente einfügen, Undo/Redo, Export, Präsentieren
│  ├─ SlidePanel.tsx        Folien-Liste mit Thumbnails
│  ├─ Canvas.tsx            skalierte Bühne + Moveable-Handles
│  ├─ TextEditorOverlay.tsx contenteditable-Overlay
│  ├─ Inspector.tsx         Eigenschaften-Panel (Element / Folie / Theme)
│  └─ useStageScale.ts      Skalierungs-Faktor für die Bühne
├─ present/Presentation.tsx Vollbild-Wiedergabe
├─ export/
│  ├─ json.ts               Export/Import als portables Bundle
│  └─ pdf.ts                PDF-Export via html2canvas + jsPDF
├─ ui/icons.tsx             flaches SVG-Icon-Set
└─ utils/                   IDs, Defaults
```

---

## Bewusst (noch) nicht dabei

Speaker-Notes / Presenter-View, Grouping, Tabellen & Diagramme, Icon-Bibliothek,
Code-Blöcke, Template-Galerie, virtualisierte Slide-Liste für sehr große Decks,
echter `.pptx`-Export.

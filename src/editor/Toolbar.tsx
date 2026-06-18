import { useRef, useState } from 'react';
import { useDeck } from '../store/deckStore';
import { storeImageFile } from '../db/assetCache';
import { exportDeckJson, importDeckJson } from '../export/json';
import { buildShareUrl, copyToClipboard, shareSupported, SHARE_SOFT_LIMIT } from '../export/share';
import {
  IconLogo,
  IconHeading,
  IconText,
  IconSquare,
  IconCircle,
  IconLine,
  IconImage,
  IconTable,
  IconList,
  IconListOrdered,
  IconUndo,
  IconRedo,
  IconPlay,
  IconPanelRight,
  IconMagnet,
  IconShare,
} from '../ui/icons';

interface Props {
  onPresent: () => void;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  snapEnabled: boolean;
  onToggleSnap: () => void;
}

export function Toolbar({
  onPresent,
  inspectorOpen,
  onToggleInspector,
  snapEnabled,
  onToggleSnap,
}: Props) {
  const deck = useDeck((s) => s.deck)!;
  const setTitle = useDeck((s) => s.setTitle);
  const addText = useDeck((s) => s.addText);
  const addShape = useDeck((s) => s.addShape);
  const addImage = useDeck((s) => s.addImage);
  const addTable = useDeck((s) => s.addTable);
  const addList = useDeck((s) => s.addList);
  const setDeck = useDeck((s) => s.setDeck);
  const undo = useDeck((s) => s.undo);
  const redo = useDeck((s) => s.redo);
  const canUndo = useDeck((s) => s.past.length > 0);
  const canRedo = useDeck((s) => s.future.length > 0);
  const dirty = useDeck((s) => s.dirty);

  const fileRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const shareInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  async function onShare() {
    try {
      const url = await buildShareUrl(deck);
      setShareUrl(url);
      // Auto-Kopieren versuchen; klappt es nicht (Geste nach await verfallen),
      // kann der Nutzer den angezeigten Link manuell per Button kopieren.
      const ok = await copyToClipboard(url);
      setShareMsg(
        url.length > SHARE_SOFT_LIMIT
          ? 'Sehr langer Link (Bilder) – für große Decks lieber JSON teilen.'
          : ok
            ? 'Link in die Zwischenablage kopiert!'
            : 'Link erstellt – unten manuell kopieren.',
      );
    } catch {
      setShareUrl(null);
      setShareMsg('Link konnte nicht erstellt werden.');
    }
  }

  async function onCopyShare() {
    if (!shareUrl) return;
    const ok = await copyToClipboard(shareUrl);
    setShareMsg(ok ? 'Link kopiert!' : 'Bitte den Link manuell markieren und kopieren (⌘C).');
  }

  async function onPickImage(file: File) {
    const asset = await storeImageFile(file);
    const dims = await imageDimensions(file);
    addImage(asset.id, dims.width, dims.height);
  }

  async function onImportFile(file: File) {
    try {
      const imported = await importDeckJson(file);
      setDeck(imported);
    } catch (err) {
      alert('Import fehlgeschlagen: ' + (err as Error).message);
    }
  }

  return (
    <header className="toolbar">
      <div className="toolbar-group">
        <strong className="brand">
          <IconLogo size={18} />
          Slides
        </strong>
        <input
          className="title-input"
          value={deck.title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Titel"
        />
        <span className={`save-dot${dirty ? ' dirty' : ''}`} title={dirty ? 'Speichern…' : 'Gespeichert'} />
      </div>

      <div className="toolbar-group">
        <button className="btn" onClick={() => addText('title')}>
          <IconHeading /> Titel
        </button>
        <button className="btn" onClick={() => addText('body')}>
          <IconText /> Text
        </button>
        <button className="btn icon-only" title="Rechteck" aria-label="Rechteck" onClick={() => addShape('rect')}>
          <IconSquare />
        </button>
        <button className="btn icon-only" title="Ellipse" aria-label="Ellipse" onClick={() => addShape('ellipse')}>
          <IconCircle />
        </button>
        <button className="btn icon-only" title="Linie" aria-label="Linie" onClick={() => addShape('line')}>
          <IconLine />
        </button>
        <button className="btn icon-only" title="Tabelle" aria-label="Tabelle" onClick={() => addTable()}>
          <IconTable />
        </button>
        <button className="btn icon-only" title="Aufzählungsliste" aria-label="Aufzählungsliste" onClick={() => addList(false)}>
          <IconList />
        </button>
        <button className="btn icon-only" title="Nummerierte Liste" aria-label="Nummerierte Liste" onClick={() => addList(true)}>
          <IconListOrdered />
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          <IconImage /> Bild
        </button>
      </div>

      <div className="toolbar-group">
        <button className="btn icon-only" onClick={undo} disabled={!canUndo} title="Rückgängig (⌘Z)" aria-label="Rückgängig">
          <IconUndo />
        </button>
        <button className="btn icon-only" onClick={redo} disabled={!canRedo} title="Wiederholen (⌘⇧Z)" aria-label="Wiederholen">
          <IconRedo />
        </button>
        <button
          className={`btn icon-only${snapEnabled ? ' on' : ''}`}
          onClick={onToggleSnap}
          title={snapEnabled ? 'Snapping aus' : 'Snapping an'}
          aria-label="Snapping umschalten"
          aria-pressed={snapEnabled}
        >
          <IconMagnet />
        </button>
      </div>

      <div className="toolbar-group right">
        {shareSupported() && (
          <button className="btn" onClick={onShare} title="Teilbaren Link erstellen">
            <IconShare /> Teilen
          </button>
        )}
        <button className="btn" onClick={() => importRef.current?.click()}>Import</button>
        <button className="btn" onClick={() => exportDeckJson(deck)}>JSON</button>
        <button
          className="btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const { exportDeckPdf } = await import('../export/pdf');
              await exportDeckPdf(deck);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'PDF…' : 'PDF'}
        </button>
        <button className="btn primary" onClick={onPresent}>
          <IconPlay /> Präsentieren
        </button>
        <button
          className={`btn icon-only${inspectorOpen ? ' on' : ''}`}
          onClick={onToggleInspector}
          title={inspectorOpen ? 'Inspector ausblenden' : 'Inspector einblenden'}
          aria-label="Inspector umschalten"
          aria-pressed={inspectorOpen}
        >
          <IconPanelRight />
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPickImage(f);
          e.target.value = '';
        }}
      />
      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImportFile(f);
          e.target.value = '';
        }}
      />

      {shareUrl && (
        <div className="share-panel" role="dialog" aria-label="Präsentation teilen">
          <div className="share-head">
            <strong>Teilbarer Link</strong>
            <button className="btn-icon sm" title="Schließen" aria-label="Schließen" onClick={() => setShareUrl(null)}>✕</button>
          </div>
          <p className="hint">
            Wer den Link öffnet, lädt diese Präsentation lokal – ganz ohne Server.
          </p>
          <div className="share-row">
            <input
              ref={shareInputRef}
              className="share-input"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
            />
            <button className="btn primary" onClick={onCopyShare}>Kopieren</button>
          </div>
          {shareMsg && <div className="share-msg">{shareMsg}</div>}
        </div>
      )}
    </header>
  );
}

function imageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 400, height: 300 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

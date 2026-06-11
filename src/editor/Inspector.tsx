import { useDeck } from '../store/deckStore';
import type { ShapeElement, TextElement } from '../types';
import {
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconBringForward,
  IconSendBackward,
  IconCopy,
  IconTrash,
} from '../ui/icons';

// Kontext-Inspektor: Eigenschaften des selektierten Elements, sonst Folien-/Theme-
// Einstellungen.
export function Inspector() {
  const deck = useDeck((s) => s.deck)!;
  const current = useDeck((s) => s.currentSlide);
  const selectedId = useDeck((s) => s.selectedId);
  const update = useDeck((s) => s.updateElement);
  const del = useDeck((s) => s.deleteElement);
  const dup = useDeck((s) => s.duplicateElement);
  const bringForward = useDeck((s) => s.bringForward);
  const sendBackward = useDeck((s) => s.sendBackward);
  const setBg = useDeck((s) => s.setSlideBackground);

  const el = deck.slides[current].elements.find((e) => e.id === selectedId);

  if (!el) return <SlideInspector deck={deck} background={deck.slides[current].background} setBg={setBg} />;

  return (
    <aside className="inspector">
      <div className="insp-head">
        {el.type === 'text' ? 'Text' : el.type === 'image' ? 'Bild' : 'Form'}
      </div>

      <Field label="Position">
        <NumIn value={el.x} onChange={(v) => update(el.id, { x: v })} suffix="x" />
        <NumIn value={el.y} onChange={(v) => update(el.id, { y: v })} suffix="y" />
      </Field>
      <Field label="Größe">
        <NumIn value={el.width} onChange={(v) => update(el.id, { width: v })} suffix="b" />
        <NumIn value={el.height} onChange={(v) => update(el.id, { height: v })} suffix="h" />
      </Field>
      <Field label="Drehung">
        <NumIn value={Math.round(el.rotation)} onChange={(v) => update(el.id, { rotation: v })} suffix="°" />
      </Field>

      {el.type === 'text' && <TextProps el={el} />}
      {el.type === 'shape' && <ShapeProps el={el} />}
      {el.type === 'image' && (
        <Field label="Füllung">
          <select
            value={el.fit ?? 'contain'}
            onChange={(e) => update(el.id, { fit: e.target.value as 'cover' | 'contain' })}
          >
            <option value="contain">contain</option>
            <option value="cover">cover</option>
          </select>
        </Field>
      )}

      <Field label="Anordnung">
        <button className="btn sm" onClick={() => bringForward(el.id)}>
          <IconBringForward size={15} /> Nach vorn
        </button>
        <button className="btn sm" onClick={() => sendBackward(el.id)}>
          <IconSendBackward size={15} /> Nach hinten
        </button>
      </Field>

      <div className="insp-actions">
        <button className="btn" onClick={() => dup(el.id)}>
          <IconCopy size={15} /> Duplizieren
        </button>
        <button className="btn danger icon-only" title="Löschen" aria-label="Löschen" onClick={() => del(el.id)}>
          <IconTrash size={15} />
        </button>
      </div>
    </aside>
  );
}

function TextProps({ el }: { el: TextElement }) {
  const update = useDeck((s) => s.updateElement);
  const deck = useDeck((s) => s.deck)!;
  const roleSize =
    el.styleRole === 'title' ? deck.theme.sizes.title
    : el.styleRole === 'caption' ? deck.theme.sizes.caption
    : deck.theme.sizes.body;
  return (
    <>
      <Field label="Rolle">
        <select
          value={el.styleRole ?? 'body'}
          onChange={(e) => update(el.id, { styleRole: e.target.value as TextElement['styleRole'] })}
        >
          <option value="title">Titel</option>
          <option value="body">Body</option>
          <option value="caption">Caption</option>
        </select>
      </Field>
      <Field label="Größe">
        <NumIn value={el.fontSize ?? roleSize} onChange={(v) => update(el.id, { fontSize: v })} suffix="px" />
      </Field>
      <Field label="Ausrichtung">
        {(['left', 'center', 'right'] as const).map((a) => (
          <button
            key={a}
            className={`btn sm icon-only${(el.align ?? 'left') === a ? ' on' : ''}`}
            title={a === 'left' ? 'Linksbündig' : a === 'center' ? 'Zentriert' : 'Rechtsbündig'}
            aria-label={a}
            onClick={() => update(el.id, { align: a })}
          >
            {a === 'left' ? <IconAlignLeft size={15} /> : a === 'center' ? <IconAlignCenter size={15} /> : <IconAlignRight size={15} />}
          </button>
        ))}
      </Field>
      <Field label="Farbe">
        <ColorIn value={el.color ?? deck.theme.palette[0]} onChange={(v) => update(el.id, { color: v })} />
      </Field>
    </>
  );
}

function ShapeProps({ el }: { el: ShapeElement }) {
  const update = useDeck((s) => s.updateElement);
  return (
    <>
      {el.shape !== 'line' && (
        <Field label="Füllung">
          <ColorIn value={el.fill ?? '#000000'} onChange={(v) => update(el.id, { fill: v })} />
        </Field>
      )}
      <Field label="Rand">
        <ColorIn value={el.stroke ?? '#000000'} onChange={(v) => update(el.id, { stroke: v })} />
        <NumIn value={el.strokeWidth ?? 0} onChange={(v) => update(el.id, { strokeWidth: v })} suffix="px" />
      </Field>
    </>
  );
}

function SlideInspector({
  deck,
  background,
  setBg,
}: {
  deck: ReturnType<typeof useDeck.getState>['deck'];
  background?: string;
  setBg: (c: string) => void;
}) {
  const applyTheme = useDeck((s) => s.applyTheme);
  if (!deck) return null;
  return (
    <aside className="inspector">
      <div className="insp-head">Folie</div>
      <Field label="Hintergrund">
        <ColorIn value={background?.startsWith('#') ? background : '#ffffff'} onChange={setBg} />
      </Field>

      <div className="insp-head">Theme-Palette</div>
      <div className="palette-row">
        {deck.theme.palette.map((c, i) => (
          <input
            key={i}
            type="color"
            value={c}
            title={`Palette ${i + 1}`}
            onChange={(e) => {
              const palette = [...deck.theme.palette];
              palette[i] = e.target.value;
              applyTheme({ ...deck.theme, palette });
            }}
          />
        ))}
      </div>
      <p className="hint">Klick auf eine Folie wählt sie. Doppelklick auf Text zum Bearbeiten.</p>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-controls">{children}</span>
    </label>
  );
}

function NumIn({
  value,
  onChange,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <span className="num-in">
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {suffix && <em>{suffix}</em>}
    </span>
  );
}

function ColorIn({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />;
}

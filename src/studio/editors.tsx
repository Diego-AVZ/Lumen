import { useState, type ReactNode } from 'react';
import { AttachPicker } from '@/attach/AttachPicker';
import { coordsLabel, parseLatLngPair } from '@/universe/coords';
import { putPhoto } from '@/lib/cloud';
import { VoiceNote } from '@/studio/VoiceNote';
import { compressImage } from '@/lib/images';
import { uid } from '@/lib/motion';
import {
  THEMES,
  createBeat,
  createListItem,
  createSlide,
  themeFromColors,
  type ArchivoStar,
  type CartaStar,
  type HistoriaStar,
  type ListaStar,
  type LugaresStar,
  type NotasStar,
  type SecretoStar,
  type SobreStar,
  type Star,
  type UniverseDocument,
} from '@/schema/universe';

const input =
  'mt-1.5 w-full rounded-2xl border border-black/10 bg-white px-3.5 py-2.5 text-[15px] text-inkwell outline-none transition placeholder:text-inkwell/30 focus:border-brass/60';

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.16em] text-inkwell/45">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12.5px] leading-relaxed text-inkwell/45">{hint}</span>}
    </label>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex gap-2">{children}</div>;
}

export function PortadaEditor({
  doc,
  onChange,
}: {
  doc: UniverseDocument;
  onChange: (recipe: (doc: UniverseDocument) => UniverseDocument) => void;
}) {
  const setIntro = (patch: Partial<UniverseDocument['intro']>) =>
    onChange((current) => ({ ...current, intro: { ...current.intro, ...patch } }));
  const setGate = (patch: Partial<UniverseDocument['gate']>) =>
    onChange((current) => ({ ...current, gate: { ...current.gate, ...patch } }));
  const setSound = (patch: Partial<UniverseDocument['soundtrack']>) =>
    onChange((current) => ({ ...current, soundtrack: { ...current.soundtrack, ...patch } }));

  return (
    <div className="grid gap-5">
      <Field label="Para" hint="El nombre grande, antes de entrar.">
        <input className={input} value={doc.intro.forName} placeholder="Su nombre" onChange={(e) => setIntro({ forName: e.target.value })} />
      </Field>
      <Field label="De">
        <input className={input} value={doc.intro.fromName} placeholder="Tu nombre" onChange={(e) => setIntro({ fromName: e.target.value })} />
      </Field>
      <Field label="Dedicatoria">
        <textarea className={`${input} min-h-20 resize-none`} value={doc.intro.dedication} placeholder="una línea, debajo del nombre" onChange={(e) => setIntro({ dedication: e.target.value })} />
      </Field>
      <Field label="Frase del cielo">
        <input className={input} value={doc.intro.motto} onChange={(e) => setIntro({ motto: e.target.value })} />
      </Field>
      <Field label="Botón para entrar">
        <input className={input} value={doc.intro.cta} onChange={(e) => setIntro({ cta: e.target.value })} />
      </Field>
      <Field label="Nombre dentro del cielo" hint="Si lo dejas vacío, se usa el nombre de la portada.">
        <input className={input} value={doc.intro.skyTitle} placeholder={doc.intro.forName || 'El mismo nombre'} onChange={(e) => setIntro({ skyTitle: e.target.value })} />
      </Field>

      <div className="h-px bg-black/5" />

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-inkwell/45">Puerta</p>
          <p className="mt-1 text-[13px] leading-relaxed text-inkwell/55">Una frase antes de dejar ver el cielo.</p>
        </div>
        <button
          type="button"
          onClick={() => setGate({ enabled: !doc.gate.enabled })}
          className={['h-7 w-12 rounded-full p-1 transition', doc.gate.enabled ? 'bg-inkwell' : 'bg-black/15'].join(' ')}
          aria-pressed={doc.gate.enabled}
        >
          <span className={['block h-5 w-5 rounded-full bg-white transition', doc.gate.enabled ? 'translate-x-5' : ''].join(' ')} />
        </button>
      </div>
      {doc.gate.enabled && (
        <>
          <Field label="Frase" hint="No distingue mayúsculas ni tildes.">
            <input className={input} value={doc.gate.phrase} placeholder="una palabra que solo esa persona sabe" onChange={(e) => setGate({ phrase: e.target.value })} />
          </Field>
          <Field label="Texto de la puerta">
            <input className={input} value={doc.gate.line} onChange={(e) => setGate({ line: e.target.value })} />
          </Field>
          <Field label="Línea pequeña" hint="Opcional. Encima del nombre.">
            <input className={input} value={doc.gate.eyebrow} onChange={(e) => setGate({ eyebrow: e.target.value })} />
          </Field>
        </>
      )}

      <div className="h-px bg-black/5" />
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-inkwell/45">Cielo</p>
        <div className="mt-3 flex gap-2">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              aria-label={theme.id}
              onClick={() => onChange((current) => ({ ...current, theme }))}
              className={['h-9 w-9 rounded-full ring-offset-2 ring-offset-linen', doc.theme.id === theme.id ? 'ring-2 ring-inkwell' : ''].join(' ')}
              style={{ background: `radial-gradient(circle at 40% 35%, ${theme.gold}, ${theme.ink} 70%)` }}
            />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <ColorChip label="Noche" value={doc.theme.ink} onChange={(ink) => onChange((d) => ({ ...d, theme: themeFromColors(ink, d.theme.paper, d.theme.gold) }))} />
          <ColorChip label="Papel" value={doc.theme.paper} onChange={(paper) => onChange((d) => ({ ...d, theme: themeFromColors(d.theme.ink, paper, d.theme.gold) }))} />
          <ColorChip label="Luz" value={doc.theme.gold} onChange={(gold) => onChange((d) => ({ ...d, theme: themeFromColors(d.theme.ink, d.theme.paper, gold) }))} />
        </div>
      </div>

      <div className="h-px bg-black/5" />
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-inkwell/45">Música</p>
        <p className="mt-1 text-[13px] leading-relaxed text-inkwell/55">Un botón en el cielo. Se pega un enlace de Spotify y suena, sin clave ni plan de pago.</p>
      </div>
      <Field label="Texto del botón">
        <input className={input} value={doc.soundtrack.label} placeholder="Música" onChange={(e) => setSound({ label: e.target.value })} />
      </Field>
      <Field label="Enlace" hint="Canción, álbum, episodio o lista. open.spotify.com/…">
        <input className={input} value={doc.soundtrack.url} placeholder="https://open.spotify.com/playlist/…" onChange={(e) => setSound({ url: e.target.value })} />
      </Field>
    </div>
  );
}

function ColorChip({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="rounded-2xl border border-black/10 bg-white px-2 py-2 text-center">
      <input type="color" value={safeHex(value)} onChange={(e) => onChange(e.target.value)} className="mx-auto h-8 w-full cursor-pointer border-0 bg-transparent" />
      <span className="mt-1 block text-[10px] uppercase tracking-[0.14em] text-inkwell/45">{label}</span>
    </label>
  );
}

function safeHex(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000';
}

const GLYPHS = ['✦', '▴', '—', '🌿', '◎', '◈', '⌖', '❦', '★', '✶'];

export function StarEditor({
  star,
  onChange,
  onCommit,
  onDelete,
}: {
  star: Star;
  onChange: (star: Star) => void;
  onCommit: (star: Star) => void;
  onDelete: () => void;
}) {
  return (
    <div className="grid gap-5">
      <Field label="Nombre en el cielo">
        <input className={input} value={star.label} onChange={(e) => onChange({ ...star, label: e.target.value })} />
      </Field>
      <Row>
        <Field label="Etiqueta">
          <input className={input} value={star.kicker} onChange={(e) => onChange({ ...star, kicker: e.target.value })} />
        </Field>
        <Field label="Símbolo">
          <input className={input} value={star.glyph} onChange={(e) => onChange({ ...star, glyph: e.target.value })} />
        </Field>
      </Row>
      <div className="flex flex-wrap gap-1.5">
        {GLYPHS.map((glyph) => (
          <button key={glyph} type="button" onClick={() => onCommit({ ...star, glyph })} className="grid h-9 w-9 place-items-center rounded-full bg-white text-lg ring-1 ring-black/10">
            {glyph}
          </button>
        ))}
      </div>
      <div className="h-px bg-black/5" />
      {star.type === 'historia' && <HistoriaEditor star={star} onChange={onChange} onCommit={onCommit} />}
      {star.type === 'lista' && <ListaEditor star={star} onChange={onChange} onCommit={onCommit} />}
      {star.type === 'carta' && <CartaEditor star={star} onChange={onChange} />}
      {star.type === 'notas' && <NotasEditor star={star} onChange={onChange} onCommit={onCommit} />}
      {star.type === 'archivo' && <ArchivoEditor star={star} onChange={onChange} onCommit={onCommit} />}
      {star.type === 'secreto' && <SecretoEditor star={star} onChange={onChange} onCommit={onCommit} />}
      {star.type === 'lugares' && <LugaresEditor star={star} onChange={onChange} onCommit={onCommit} />}
      {star.type === 'sobre' && <SobreEditor star={star} onChange={onChange} />}
      <button type="button" onClick={onDelete} className="justify-self-start text-[13px] text-inkwell/45 underline-offset-4 hover:text-inkwell hover:underline">
        Quitar esta estrella
      </button>
    </div>
  );
}

function SobreEditor({ star, onChange }: { star: SobreStar; onChange: (star: Star) => void }) {
  return (
    <div className="grid gap-3">
      <Field label="Una frase">
        <input className={input} value={star.line} placeholder="Ábrelo cuando mires al cielo." onChange={(event) => onChange({ ...star, line: event.target.value })} />
      </Field>
      <p className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">El sobre</p>
      <AttachPicker kind="cita" value={star.cita} onChange={(cita) => onChange({ ...star, cita })} />
    </div>
  );
}

function Mini({ children, onUp, onDown, onRemove }: { children: ReactNode; onUp?: () => void; onDown?: () => void; onRemove?: () => void }) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-black/10">
      <div className="mb-2 flex justify-end gap-2 text-[11px] uppercase tracking-[0.14em] text-inkwell/40">
        {onUp && <button type="button" onClick={onUp}>Subir</button>}
        {onDown && <button type="button" onClick={onDown}>Bajar</button>}
        {onRemove && <button type="button" onClick={onRemove}>Quitar</button>}
      </div>
      {children}
    </div>
  );
}

function move<T>(list: T[], index: number, dir: -1 | 1) {
  const next = index + dir;
  if (next < 0 || next >= list.length) return list;
  const copy = list.slice();
  const [item] = copy.splice(index, 1);
  if (!item) return list;
  copy.splice(next, 0, item);
  return copy;
}

function HistoriaEditor({
  star,
  onChange,
  onCommit,
}: {
  star: HistoriaStar;
  onChange: (star: Star) => void;
  onCommit: (star: Star) => void;
}) {
  const setBeat = (id: string, patch: Partial<HistoriaStar['beats'][number]>, structural = false) => {
    const next = { ...star, beats: star.beats.map((beat) => (beat.id === id ? { ...beat, ...patch } : beat)) };
    if (structural) onCommit(next);
    else onChange(next);
  };
  return (
    <div className="grid gap-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-inkwell/45">Capítulos</p>
      {star.beats.map((beat, index) => (
        <Mini
          key={beat.id}
          onUp={() => onCommit({ ...star, beats: move(star.beats, index, -1) })}
          onDown={() => onCommit({ ...star, beats: move(star.beats, index, 1) })}
          onRemove={() => onCommit({ ...star, beats: star.beats.filter((item) => item.id !== beat.id) })}
        >
          <div className="grid grid-cols-[4.5rem_1fr] gap-2">
            <input className={input} value={beat.emoji} onChange={(e) => setBeat(beat.id, { emoji: e.target.value })} />
            <input className={input} value={beat.title} placeholder="Título" onChange={(e) => setBeat(beat.id, { title: e.target.value })} />
          </div>
          <input className={input} value={beat.date} placeholder="Cuándo" onChange={(e) => setBeat(beat.id, { date: e.target.value })} />
          <input className={input} value={beat.track} placeholder="Enlace de Spotify para este capítulo" onChange={(e) => setBeat(beat.id, { track: e.target.value })} />
          <VoiceNote url={beat.voiceUrl} onChange={(voiceUrl) => setBeat(beat.id, { voiceUrl }, true)} />
          <textarea className={`${input} min-h-20 resize-none`} value={beat.lead} placeholder="El arranque de este capítulo" onChange={(e) => setBeat(beat.id, { lead: e.target.value })} />
          <textarea className={`${input} min-h-16 resize-none`} value={beat.quote} placeholder="Una frase suya, si la hubo" onChange={(e) => setBeat(beat.id, { quote: e.target.value })} />
          <div className="mt-3 grid gap-2">
            {beat.slides.map((slide, slideIndex) => (
              <div key={slide.id} className="rounded-xl bg-linen px-3 py-2">
                <div className="mb-1 flex justify-end gap-2 text-[11px] uppercase tracking-[0.12em] text-inkwell/35">
                  <button type="button" onClick={() => setBeat(beat.id, { slides: move(beat.slides, slideIndex, -1) }, true)}>↑</button>
                  <button type="button" onClick={() => setBeat(beat.id, { slides: move(beat.slides, slideIndex, 1) }, true)}>↓</button>
                  <button type="button" onClick={() => setBeat(beat.id, { slides: beat.slides.filter((item) => item.id !== slide.id) }, true)}>Quitar</button>
                </div>
                <input className={input} value={slide.title} placeholder="Momento" onChange={(e) => {
                  const slides = beat.slides.map((item) => (item.id === slide.id ? { ...item, title: e.target.value } : item));
                  setBeat(beat.id, { slides });
                }} />
                <textarea className={`${input} min-h-16 resize-none`} value={slide.body} placeholder="Qué pasó" onChange={(e) => {
                  const slides = beat.slides.map((item) => (item.id === slide.id ? { ...item, body: e.target.value } : item));
                  setBeat(beat.id, { slides });
                }} />
              </div>
            ))}
            <button type="button" className="text-left text-[13px] text-brass" onClick={() => setBeat(beat.id, { slides: [...beat.slides, createSlide(beat.slides.length)] }, true)}>
              + Añadir momento
            </button>
          </div>
        </Mini>
      ))}
      <button type="button" className="text-left text-[14px] text-brass" onClick={() => onCommit({ ...star, beats: [...star.beats, createBeat(star.beats.length)] })}>
        + Añadir capítulo
      </button>
    </div>
  );
}

function ListaEditor({
  star,
  onChange,
  onCommit,
}: {
  star: ListaStar;
  onChange: (star: Star) => void;
  onCommit: (star: Star) => void;
}) {
  const setItem = (id: string, patch: Partial<ListaStar['items'][number]>, structural = false) => {
    const next = { ...star, items: star.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) };
    if (structural) onCommit(next);
    else onChange(next);
  };
  return (
    <div className="grid gap-3">
      <Field label="Introducción" hint="Una línea sobre la órbita.">
        <input className={input} value={star.intro} onChange={(e) => onChange({ ...star, intro: e.target.value })} />
      </Field>
      {star.items.map((item, index) => (
        <Mini
          key={item.id}
          onUp={() => onCommit({ ...star, items: move(star.items, index, -1) })}
          onDown={() => onCommit({ ...star, items: move(star.items, index, 1) })}
          onRemove={() => onCommit({ ...star, items: star.items.filter((entry) => entry.id !== item.id) })}
        >
          <div className="grid grid-cols-[4.5rem_1fr] gap-2">
            <input className={input} value={item.emoji} onChange={(e) => setItem(item.id, { emoji: e.target.value })} />
            <input className={input} value={item.title} placeholder="Nombre" onChange={(e) => setItem(item.id, { title: e.target.value })} />
          </div>
          <input className={input} value={item.when} placeholder="Una frase corta, si quieres" onChange={(e) => setItem(item.id, { when: e.target.value })} />
          <label className="mt-2 block">
            <span className="text-[11px] uppercase tracking-[0.14em] text-inkwell/40">Cae el</span>
            <input type="date" className={input} value={item.fallsOn} onChange={(e) => setItem(item.id, { fallsOn: e.target.value })} />
          </label>
          <div className="mt-2 grid grid-cols-3 gap-1 rounded-2xl bg-linen p-1 text-[12px] leading-tight">
            {(
              [
                ['abierto', 'Esa fecha'],
                ['pronto', 'En el cielo'],
                ['vivido', 'Ya vivida'],
              ] as const
            ).map(([state, label]) => (
              <button
                key={state}
                type="button"
                onClick={() => setItem(item.id, { state }, true)}
                className={['rounded-xl px-1 py-2', item.state === state ? 'bg-white text-inkwell shadow-sm' : 'text-inkwell/45'].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-inkwell/45">
            {item.state === 'pronto'
              ? 'Sigue dando vueltas. No cae ni se abre.'
              : item.state === 'vivido'
                ? 'Ya está en tierra. Se puede leer.'
                : 'Hasta ese día orbita. Ese día cae, como una fugaz. Si la fecha ya pasó, cae al abrir la lista.'}
          </p>
          <textarea className={`${input} min-h-16 resize-none`} value={item.body} placeholder="Qué es" onChange={(e) => setItem(item.id, { body: e.target.value })} />
          {item.options.length >= 2 ? (
            <div className="mt-3 grid gap-2">
              {item.options.slice(0, 2).map((option, optionIndex) => (
                <div key={option.id} className="rounded-xl bg-linen p-2">
                  <p className="px-1 text-[11px] uppercase tracking-[0.14em] text-inkwell/40">Opción {optionIndex === 0 ? 'A' : 'B'}</p>
                  <div className="grid grid-cols-[4rem_1fr] gap-2">
                    <input className={input} value={option.emoji} onChange={(e) => {
                      const options = item.options.map((entry) => (entry.id === option.id ? { ...entry, emoji: e.target.value } : entry));
                      setItem(item.id, { options });
                    }} />
                    <input className={input} value={option.title} placeholder="Título" onChange={(e) => {
                      const options = item.options.map((entry) => (entry.id === option.id ? { ...entry, title: e.target.value } : entry));
                      setItem(item.id, { options });
                    }} />
                  </div>
                  <textarea className={`${input} min-h-14 resize-none`} value={option.body} onChange={(e) => {
                    const options = item.options.map((entry) => (entry.id === option.id ? { ...entry, body: e.target.value } : entry));
                    setItem(item.id, { options });
                  }} />
                </div>
              ))}
              <button type="button" className="text-left text-[13px] text-inkwell/45" onClick={() => setItem(item.id, { options: [] }, true)}>
                Quitar la elección
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="mt-2 text-left text-[13px] text-brass"
              onClick={() =>
                setItem(
                  item.id,
                  {
                    options: [
                      { id: uid('opt'), emoji: '✦', title: '', body: '' },
                      { id: uid('opt'), emoji: '✦', title: '', body: '' },
                    ],
                  },
                  true,
                )
              }
            >
              Que elija entre dos
            </button>
          )}
        </Mini>
      ))}
      <button type="button" className="text-left text-[14px] text-brass" onClick={() => onCommit({ ...star, items: [...star.items, createListItem()] })}>
        + Añadir a la lista
      </button>
    </div>
  );
}

function CartaEditor({ star, onChange }: { star: CartaStar; onChange: (star: Star) => void }) {
  return (
    <div className="grid gap-3">
      <Field label="Línea pequeña">
        <input className={input} value={star.kickerText} onChange={(e) => onChange({ ...star, kickerText: e.target.value })} />
      </Field>
      <Field label="Primera frase">
        <textarea className={`${input} min-h-20 resize-none`} value={star.headline} onChange={(e) => onChange({ ...star, headline: e.target.value })} />
      </Field>
      <Field label="Carta" hint="Una línea en blanco empieza otro párrafo.">
        <textarea className={`${input} min-h-40 resize-none`} value={star.body} onChange={(e) => onChange({ ...star, body: e.target.value })} />
      </Field>
      <Field label="Firma">
        <input className={input} value={star.signoff} onChange={(e) => onChange({ ...star, signoff: e.target.value })} />
      </Field>
      <VoiceNote url={star.voiceUrl} onChange={(voiceUrl) => onChange({ ...star, voiceUrl })} />
    </div>
  );
}

function NotasEditor({
  star,
  onChange,
  onCommit,
}: {
  star: NotasStar;
  onChange: (star: Star) => void;
  onCommit: (star: Star) => void;
}) {
  return (
    <div className="grid gap-3">
      {star.cards.map((card, index) => (
        <Mini
          key={card.id}
          onUp={() => onCommit({ ...star, cards: move(star.cards, index, -1) })}
          onDown={() => onCommit({ ...star, cards: move(star.cards, index, 1) })}
          onRemove={() => onCommit({ ...star, cards: star.cards.filter((item) => item.id !== card.id) })}
        >
          <div className="grid grid-cols-[4.5rem_1fr] gap-2">
            <input className={input} value={card.emoji} onChange={(e) => onChange({ ...star, cards: star.cards.map((item) => (item.id === card.id ? { ...item, emoji: e.target.value } : item)) })} />
            <input className={input} value={card.title} placeholder="Título" onChange={(e) => onChange({ ...star, cards: star.cards.map((item) => (item.id === card.id ? { ...item, title: e.target.value } : item)) })} />
          </div>
          <textarea className={`${input} min-h-24 resize-none`} value={card.text} placeholder={'Una línea por idea'} onChange={(e) => onChange({ ...star, cards: star.cards.map((item) => (item.id === card.id ? { ...item, text: e.target.value } : item)) })} />
        </Mini>
      ))}
      <button type="button" className="text-left text-[14px] text-brass" onClick={() => onCommit({ ...star, cards: [...star.cards, { id: uid('note'), emoji: '🌿', title: '', text: '' }] })}>
        + Añadir nota
      </button>
    </div>
  );
}

function ArchivoEditor({
  star,
  onChange,
  onCommit,
}: {
  star: ArchivoStar;
  onChange: (star: Star) => void;
  onCommit: (star: Star) => void;
}) {
  const take = async (files: FileList | null) => {
    if (!files?.length) return;
    const photos = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const id = uid('photo');
      photos.push({ id, src: await putPhoto(await compressImage(file), id), caption: '' });
    }
    if (photos.length) onCommit({ ...star, photos: [...star.photos, ...photos] });
  };
  return (
    <div className="grid gap-3">
      <label
        className="grid cursor-pointer place-items-center rounded-2xl border border-dashed border-brass/40 bg-white/60 px-4 py-8 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void take(e.dataTransfer.files);
        }}
      >
        <span className="font-display text-xl italic">Soltar fotos</span>
        <span className="mt-1 text-[13px] text-inkwell/50">o elegirlas de este ordenador</span>
        <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void take(e.target.files)} />
      </label>
      {star.photos.map((photo, index) => (
        <Mini
          key={photo.id}
          onUp={() => onCommit({ ...star, photos: move(star.photos, index, -1) })}
          onDown={() => onCommit({ ...star, photos: move(star.photos, index, 1) })}
          onRemove={() => onCommit({ ...star, photos: star.photos.filter((item) => item.id !== photo.id) })}
        >
          {photo.src && <img src={photo.src} alt="" className="mb-2 h-28 w-full rounded-xl object-cover" />}
          <input className={input} value={photo.caption} placeholder="Pie de foto" onChange={(e) => onChange({ ...star, photos: star.photos.map((item) => (item.id === photo.id ? { ...item, caption: e.target.value } : item)) })} />
          <input className={input} value={photo.src.startsWith('data:') ? '' : photo.src} placeholder="O pega un enlace de imagen" onChange={(e) => onChange({ ...star, photos: star.photos.map((item) => (item.id === photo.id ? { ...item, src: e.target.value } : item)) })} />
        </Mini>
      ))}
    </div>
  );
}

function SecretoEditor({
  star,
  onChange,
  onCommit,
}: {
  star: SecretoStar;
  onChange: (star: Star) => void;
  onCommit: (star: Star) => void;
}) {
  return (
    <div className="grid gap-3">
      <Field label="Frase para abrirlo">
        <input className={input} value={star.phrase} onChange={(e) => onChange({ ...star, phrase: e.target.value })} />
      </Field>
      <Field label="Pista">
        <input className={input} value={star.hint} onChange={(e) => onChange({ ...star, hint: e.target.value })} />
      </Field>
      {star.entries.map((entry, index) => (
        <Mini
          key={entry.id}
          onRemove={() => onCommit({ ...star, entries: star.entries.filter((item) => item.id !== entry.id) })}
          onUp={() => onCommit({ ...star, entries: move(star.entries, index, -1) })}
          onDown={() => onCommit({ ...star, entries: move(star.entries, index, 1) })}
        >
          <input className={input} value={entry.title} placeholder="Título" onChange={(e) => onChange({ ...star, entries: star.entries.map((item) => (item.id === entry.id ? { ...item, title: e.target.value } : item)) })} />
          <textarea className={`${input} min-h-20 resize-none`} value={entry.body} placeholder="Lo que solo se lee aquí" onChange={(e) => onChange({ ...star, entries: star.entries.map((item) => (item.id === entry.id ? { ...item, body: e.target.value } : item)) })} />
        </Mini>
      ))}
      <button type="button" className="text-left text-[14px] text-brass" onClick={() => onCommit({ ...star, entries: [...star.entries, { id: uid('sec'), title: '', body: '' }] })}>
        + Añadir secreto
      </button>
    </div>
  );
}

function LugaresEditor({
  star,
  onChange,
  onCommit,
}: {
  star: LugaresStar;
  onChange: (star: Star) => void;
  onCommit: (star: Star) => void;
}) {
  return (
    <div className="grid gap-3">
      <Field label="Introducción">
        <input className={input} value={star.intro} onChange={(e) => onChange({ ...star, intro: e.target.value })} />
      </Field>
      {star.places.map((place, index) => (
        <Mini
          key={place.id}
          onUp={() => onCommit({ ...star, places: move(star.places, index, -1) })}
          onDown={() => onCommit({ ...star, places: move(star.places, index, 1) })}
          onRemove={() => onCommit({ ...star, places: star.places.filter((item) => item.id !== place.id) })}
        >
          <div className="grid grid-cols-[4.5rem_1fr] gap-2">
            <input className={input} value={place.emoji} onChange={(e) => onChange({ ...star, places: star.places.map((item) => (item.id === place.id ? { ...item, emoji: e.target.value } : item)) })} />
            <input className={input} value={place.title} placeholder="Lugar" onChange={(e) => onChange({ ...star, places: star.places.map((item) => (item.id === place.id ? { ...item, title: e.target.value } : item)) })} />
          </div>
          <textarea className={`${input} min-h-16 resize-none`} value={place.body} placeholder="Qué pasó ahí" onChange={(e) => onChange({ ...star, places: star.places.map((item) => (item.id === place.id ? { ...item, body: e.target.value } : item)) })} />
          <CoordsField
            lat={place.lat}
            lng={place.lng}
            onChange={(coords) =>
              onChange({
                ...star,
                places: star.places.map((item) => (item.id === place.id ? { ...item, ...coords } : item)),
              })
            }
          />
        </Mini>
      ))}
      <p className="text-[12.5px] leading-relaxed text-inkwell/45">
        Pega las dos juntas, como salen al clic derecho en Google Maps: 40.5204, -3.7947. Sin coordenadas, el lugar se lee como una nota.
      </p>
      <button type="button" className="text-left text-[14px] text-brass" onClick={() => onCommit({ ...star, places: [...star.places, { id: uid('place'), emoji: '⌖', title: '', body: '', lat: '', lng: '' }] })}>
        + Añadir lugar
      </button>
    </div>
  );
}

function CoordsField({
  lat,
  lng,
  onChange,
}: {
  lat: string;
  lng: string;
  onChange: (next: { lat: string; lng: string }) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? coordsLabel({ lat, lng });
  const pinned = Boolean(parseLatLngPair(shown) ?? (lat && lng && parseLatLngPair(`${lat}, ${lng}`)));

  const apply = (raw: string) => {
    setDraft(raw);
    const pair = parseLatLngPair(raw);
    if (pair) {
      onChange(pair);
      setDraft(null);
      return;
    }
    if (!raw.trim()) onChange({ lat: '', lng: '' });
  };

  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">Coordenadas</span>
      <input
        className={input}
        value={shown}
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        placeholder="40.520417756649344, -3.7947109319926056"
        onChange={(event) => apply(event.target.value)}
        onPaste={(event) => {
          const text = event.clipboardData.getData('text');
          const pair = parseLatLngPair(text);
          if (!pair) return;
          event.preventDefault();
          onChange(pair);
          setDraft(null);
        }}
        onBlur={() => setDraft(null)}
      />
      {pinned && <p className="mt-1 text-[12px] text-brass">En el mapa</p>}
    </label>
  );
}

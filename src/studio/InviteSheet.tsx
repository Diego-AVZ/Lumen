import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { EmojiBar, insertEmoji } from '@/cita/EmojiBar';
import {
  CARD_H,
  CARD_W,
  FADES,
  MOTIFS,
  PAPERS,
  drawInvite,
  jpegToPdf,
  loadInviteFonts,
  type Fade,
  type Motif,
  type Paper,
} from '@/studio/invite';

type Design = {
  paper: string;
  fade: Fade;
  motif: Motif;
  seed: number;
  eyebrow: string;
  line: string;
  button: string;
};

function paperById(id: string): Paper {
  return PAPERS.find((item) => item.id === id) ?? PAPERS[0];
}

function readDesign(projectId: string, fallbackLine: string, fallbackEyebrow: string): Design {
  const base: Design = { paper: 'lino', fade: 'suave', motif: 'mix', seed: 4, eyebrow: fallbackEyebrow, line: fallbackLine, button: 'Ábrelo' };
  try {
    const raw = sessionStorage.getItem(`lumen.invite.${projectId}`);
    if (!raw) return base;
    const saved = JSON.parse(raw) as Partial<Design>;
    return {
      ...base,
      ...saved,
      paper: PAPERS.some((item) => item.id === saved.paper) ? String(saved.paper) : base.paper,
      fade: saved.fade === 'diagonal' || saved.fade === 'centro' ? saved.fade : 'suave',
      motif: MOTIFS.some((item) => item.id === saved.motif) ? (saved.motif as Motif) : 'mix',
      eyebrow: typeof saved.eyebrow === 'string' ? saved.eyebrow : base.eyebrow,
    };
  } catch {
    return base;
  }
}

export function InviteSheet({
  projectId,
  url,
  title,
  from,
  eyebrow,
  line,
  ready,
  onClose,
}: {
  projectId: string;
  url: string;
  title: string;
  from: string;
  eyebrow: string;
  line: string;
  ready: boolean;
  onClose: () => void;
}) {
  const view = useRef<HTMLCanvasElement>(null);
  const [design, setDesign] = useState<Design>(() => readDesign(projectId, line, eyebrow));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const paper = useMemo(() => paperById(design.paper), [design.paper]);

  useEffect(() => {
    sessionStorage.setItem(`lumen.invite.${projectId}`, JSON.stringify(design));
  }, [design, projectId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const canvas = view.current;
    if (!canvas) return;
    let cancel = false;
    const paint = async () => {
      await loadInviteFonts();
      const qr = document.createElement('canvas');
      try {
        await QRCode.toCanvas(qr, url, { margin: 1, width: 280, color: { dark: '#1b1612', light: '#ffffff' } });
      } catch {
        /* la tarjeta sigue sin el código */
      }
      if (cancel) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      drawInvite(ctx, {
        paper,
        fade: design.fade,
        motif: design.motif,
        seed: design.seed,
        eyebrow: design.eyebrow,
        title,
        line: design.line,
        button: design.button,
        from,
        url,
        qr,
      });
    };
    void paint();
    return () => {
      cancel = true;
    };
  }, [design, from, paper, title, url]);

  const renderFile = async () => {
    await loadInviteFonts();
    const canvas = document.createElement('canvas');
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No pude dibujar la invitación.');
    const qr = document.createElement('canvas');
    await QRCode.toCanvas(qr, url, { margin: 1, width: 280, color: { dark: '#1b1612', light: '#ffffff' } });
    const boxes = drawInvite(ctx, {
      paper,
      fade: design.fade,
      motif: design.motif,
      seed: design.seed,
      eyebrow: design.eyebrow,
      title,
      line: design.line,
      button: design.button,
      from,
      url,
      qr,
    });
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((file) => (file ? resolve(file) : reject(new Error('No pude guardar la imagen.'))), 'image/jpeg', 0.92);
    });
    return { blob, boxes };
  };

  const download = (bytes: BlobPart, name: string, type: string) => {
    const blob = bytes instanceof Blob ? bytes : new Blob([bytes], { type });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 1500);
  };

  const fileName = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'invitacion';

  const shareText = `${design.line.trim() || 'Hay algo que quiero que abras.'}\n\n${url}`;

  const shareFile = async (file: File) => {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: shareText, title: title || 'Invitación' });
      return true;
    }
    return false;
  };

  const onJpg = async () => {
    setBusy('jpg');
    setNote('');
    try {
      const { blob } = await renderFile();
      download(blob, `${fileName}.jpg`, 'image/jpeg');
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'No pude bajar el JPG.');
    } finally {
      setBusy('');
    }
  };

  const onPdf = async () => {
    setBusy('pdf');
    setNote('');
    try {
      const { blob, boxes } = await renderFile();
      const jpeg = new Uint8Array(await blob.arrayBuffer());
      const pdf = jpegToPdf(jpeg, CARD_W, CARD_H, [
        { box: boxes.button, url },
        { box: boxes.code, url },
      ]);
      download(pdf, `${fileName}.pdf`, 'application/pdf');
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'No pude bajar el PDF.');
    } finally {
      setBusy('');
    }
  };

  const onWhatsapp = async () => {
    setBusy('wa');
    setNote('');
    try {
      const { blob } = await renderFile();
      const file = new File([blob], `${fileName}.jpg`, { type: 'image/jpeg' });
      const shared = await shareFile(file);
      if (!shared) {
        download(blob, `${fileName}.jpg`, 'image/jpeg');
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener');
        setNote('WhatsApp abre el texto. El JPG ya se descargó para adjuntarlo.');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setNote(err instanceof Error ? err.message : 'No pude abrir WhatsApp.');
    } finally {
      setBusy('');
    }
  };

  const onMail = async () => {
    setBusy('mail');
    setNote('');
    try {
      const { blob, boxes } = await renderFile();
      const jpeg = new Uint8Array(await blob.arrayBuffer());
      const pdf = jpegToPdf(jpeg, CARD_W, CARD_H, [
        { box: boxes.button, url },
        { box: boxes.code, url },
      ]);
      const file = new File([pdf], `${fileName}.pdf`, { type: 'application/pdf' });
      const shared = await shareFile(file);
      if (!shared) {
        download(pdf, `${fileName}.pdf`, 'application/pdf');
        const subject = title || 'Una invitación';
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shareText)}`;
        setNote('El correo abre el texto. El PDF ya se descargó para adjuntarlo.');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setNote(err instanceof Error ? err.message : 'No pude abrir el correo.');
    } finally {
      setBusy('');
    }
  };

  const patch = (next: Partial<Design>) => setDesign((current) => ({ ...current, ...next }));

  return (
    <div className="fixed inset-0 z-[80] overflow-auto bg-linen text-inkwell" role="dialog" aria-labelledby="invite-title">
      <div className="mx-auto flex min-h-full max-w-5xl flex-col px-5 py-6 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Compartir</p>
            <h2 id="invite-title" className="mt-1 font-display text-4xl italic leading-none">
              La invitación
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-[14px] text-inkwell/60">
            Cerrar
          </button>
        </div>

        <div className="mt-6 grid items-start gap-8 lg:grid-cols-[340px_1fr]">
          <canvas
            ref={view}
            width={CARD_W}
            height={CARD_H}
            className="mx-auto w-full max-w-[340px] rounded-[28px] shadow-[0_24px_60px_rgba(40,28,16,0.16)]"
          />

          <div>
            <p className="max-w-xl text-[15px] leading-relaxed text-inkwell/60">
              El JPG es para enseñarlo en el móvil. El PDF es para enviarlo: el botón y el código abren el regalo.
            </p>
            {!ready && (
              <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-brass">
                El enlace queda escrito. Se abre de verdad cuando publiques.
              </p>
            )}

            <p className="mt-8 text-[11px] uppercase tracking-[0.16em] text-inkwell/40">Fondo</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PAPERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={item.name}
                  onClick={() => patch({ paper: item.id })}
                  className={`h-12 w-12 rounded-full ring-2 ring-offset-2 ring-offset-linen ${design.paper === item.id ? 'ring-inkwell' : 'ring-transparent'}`}
                  style={{ background: `linear-gradient(160deg, ${item.from}, ${item.to})` }}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {FADES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => patch({ fade: item.id })}
                  className={`rounded-full px-3 py-1.5 text-[13px] ${design.fade === item.id ? 'bg-inkwell text-linen' : 'bg-white ring-1 ring-black/10'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <p className="mt-7 text-[11px] uppercase tracking-[0.16em] text-inkwell/40">Iconos</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {MOTIFS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => patch({ motif: item.id })}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] ${design.motif === item.id ? 'bg-inkwell text-linen' : 'bg-white ring-1 ring-black/10'}`}
                >
                  {item.mark ? <span className="text-[16px] leading-none">{item.mark}</span> : null}
                  {item.label}
                </button>
              ))}
              {design.motif !== 'none' && (
                <button type="button" onClick={() => patch({ seed: design.seed + 1 })} className="rounded-full px-3 py-1.5 text-[13px] text-brass">
                  Moverlos
                </button>
              )}
            </div>

            <label className="mt-7 block">
              <span className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">Arriba, lo que quieras</span>
              <input
                value={design.eyebrow}
                maxLength={42}
                onChange={(event) => patch({ eyebrow: event.target.value })}
                placeholder="Una cita"
                className="mt-2 w-full rounded-2xl bg-white px-4 py-3 outline-none ring-1 ring-black/10"
              />
            </label>
            <EmojiBar onPick={(emoji) => patch({ eyebrow: `${design.eyebrow}${emoji}`.slice(0, 42) })} />
            <div className="mt-3 flex flex-wrap gap-2">
              {['Una cita', 'Un plan', 'Una quedada', 'Un café', 'Una salida', from.trim() ? `De ${from.trim()}` : '']
                .filter(Boolean)
                .map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => patch({ eyebrow: item })}
                    className={`rounded-full px-3 py-1.5 text-[13px] ${design.eyebrow === item ? 'bg-inkwell text-linen' : 'bg-white ring-1 ring-black/10'}`}
                  >
                    {item}
                  </button>
                ))}
            </div>

            <label className="mt-7 block">
              <span className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">Frase</span>
              <textarea
                value={design.line}
                onChange={(event) => patch({ line: event.target.value.slice(0, 180) })}
                rows={3}
                className="mt-2 w-full resize-none rounded-[22px] bg-white px-4 py-3 text-[16px] outline-none ring-1 ring-black/10"
              />
            </label>
            <EmojiBar onPick={(emoji) => patch({ line: insertEmoji(design.line, emoji).slice(0, 180) })} />
            <label className="mt-4 block">
              <span className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">El botón</span>
              <input
                value={design.button}
                onChange={(event) => patch({ button: event.target.value.slice(0, 28) })}
                className="mt-2 w-full rounded-2xl bg-white px-4 py-3 outline-none ring-1 ring-black/10"
              />
            </label>

            <div className="mt-8 flex flex-wrap gap-2">
              <button type="button" disabled={Boolean(busy)} onClick={() => void onJpg()} className="rounded-full bg-inkwell px-4 py-2.5 text-[14px] text-linen disabled:opacity-40">
                {busy === 'jpg' ? 'Preparando…' : 'Descargar JPG'}
              </button>
              <button type="button" disabled={Boolean(busy)} onClick={() => void onPdf()} className="rounded-full bg-inkwell px-4 py-2.5 text-[14px] text-linen disabled:opacity-40">
                {busy === 'pdf' ? 'Preparando…' : 'Descargar PDF'}
              </button>
              <button type="button" disabled={Boolean(busy)} onClick={() => void onWhatsapp()} className="rounded-full bg-white px-4 py-2.5 text-[14px] ring-1 ring-black/10 disabled:opacity-40">
                WhatsApp
              </button>
              <button type="button" disabled={Boolean(busy)} onClick={() => void onMail()} className="rounded-full bg-white px-4 py-2.5 text-[14px] ring-1 ring-black/10 disabled:opacity-40">
                Correo
              </button>
            </div>
            {note && <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-inkwell/60">{note}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

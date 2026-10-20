import { useEffect, useRef, useState } from 'react';
import { putAudio } from '@/lib/cloud';
import { uid } from '@/lib/motion';

const LIMIT = 90;

function mimeType() {
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return options.find((type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) ?? '';
}

export function VoiceNote({ url, onChange }: { url: string; onChange: (url: string) => void }) {
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number>(0);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState<'rec' | 'up' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => () => window.clearInterval(timer.current), []);

  const stop = () => {
    recorder.current?.stop();
    recorder.current?.stream.getTracks().forEach((track) => track.stop());
    recorder.current = null;
    window.clearInterval(timer.current);
  };

  const start = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Este navegador no deja grabar.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = mimeType();
      const rec = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };
      rec.onstop = () => {
        setBusy('up');
        const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' });
        void putAudio(blob, uid('voice'))
          .then((next) => {
            onChange(next);
            setBusy(null);
            setSeconds(0);
          })
          .catch((err) => {
            setError(err instanceof Error ? err.message : 'No se pudo guardar la voz.');
            setBusy(null);
          });
      };
      recorder.current = rec;
      rec.start();
      setBusy('rec');
      setSeconds(0);
      timer.current = window.setInterval(() => {
        setSeconds((n) => {
          if (n + 1 >= LIMIT) stop();
          return n + 1;
        });
      }, 1000);
    } catch {
      setError('Hace falta el micrófono.');
    }
  };

  return (
    <div className="rounded-2xl bg-linen px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">Tu voz</p>
      {url ? (
        <div className="mt-2">
          <audio src={url} controls preload="none" className="w-full" />
          <button type="button" className="mt-2 text-[13px] text-[#8a3d32]" onClick={() => onChange('')}>
            Quitar
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {busy === 'rec' ? (
            <button type="button" onClick={stop} className="rounded-full bg-[#8a3d32] px-4 py-2 text-[13px] text-linen">
              Parar · {seconds}s
            </button>
          ) : (
            <button
              type="button"
              disabled={busy === 'up'}
              onClick={() => void start()}
              className="rounded-full bg-inkwell px-4 py-2 text-[13px] text-linen disabled:opacity-40"
            >
              {busy === 'up' ? 'Guardando…' : 'Grabar'}
            </button>
          )}
          <span className="text-[12px] text-inkwell/45">Hasta {LIMIT} segundos. Se oye en el regalo.</span>
        </div>
      )}
      {error && <p className="mt-2 text-[13px] text-[#8a3d32]">{error}</p>}
    </div>
  );
}

export function VoicePlay({ url }: { url: string }) {
  if (!url) return null;
  return <audio src={url} controls preload="none" className="mt-5 w-full max-w-sm" />;
}

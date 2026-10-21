import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { listDrafts, loadDraft, purgeProject, saveDraft, type DraftSummary } from '@/lib/drafts';
import { AccountBar } from '@/studio/AccountBar';
import { isCita, isDeseos, isWeb, kindLabel, parseProject, projectTitle } from '@/schema/project';
import { exampleDocument } from '@/schema/example';
import { uid } from '@/lib/motion';
import { HubShell } from '@/hub/HubShell';
import { HUB_VISTAS, IDEA_SEEDS, type HubVista } from '@/hub/catalog';
import { addIdea, listIdeas, removeIdea, type IdeaNote } from '@/hub/ideas';
import { ConfirmDelete } from '@/hub/ConfirmDelete';
import { WaitMark } from '@/hub/WaitMark';
import { PlanShop } from '@/hub/PlanShop';
import { euros, familyOf } from '@/lib/plans';
import { usePurchases } from '@/lib/purchases';
import { ago, clock, lasted, loadVisitStats, type VisitStat } from '@/lib/stats';

export function Hub() {
  const [params] = useSearchParams();
  const raw = params.get('vista');
  const vista: HubVista = HUB_VISTAS.some((item) => item.id === raw) ? (raw as HubVista) : 'proyectos';

  useEffect(() => {
    void import('@/pages/Begin');
    void import('@/pages/Studio');
    void import('@/pages/DateAskStudio');
    void import('@/pages/DeseosStudio');
  }, []);

  return (
    <HubShell>
      {vista === 'proyectos' && <ProjectsPanel />}
      {vista === 'plan' && <PlanShop />}
      {vista === 'uso' && <UsoPanel />}
      {vista === 'seguimiento' && <TrackingPanel />}
      {vista === 'ideas' && <IdeasPanel />}
      {vista === 'instrucciones' && <GuidePanel />}
      {vista === 'crear' && <RedirectCrear />}
    </HubShell>
  );
}

function RedirectCrear() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/crear/nuevo', { replace: true });
  }, [navigate]);
  return null;
}

function ProjectsPanel() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<DraftSummary[] | null>(null);
  const [pending, setPending] = useState<{ id: string; slug: string; title: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const refresh = () => {
    void listDrafts().then(setRows);
  };

  useEffect(() => {
    refresh();
  }, []);

  const loading = rows === null;
  const list = rows ?? [];
  const empty = !loading && list.length === 0;

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <p className="text-[12px] uppercase tracking-[0.22em] text-brass">Centro de control</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="max-w-[14ch] font-display text-[clamp(2.6rem,6vw,4.4rem)] italic leading-[0.92]">
          Mis proyectos
        </h1>
        <Link to="/crear/nuevo" className="rounded-full bg-inkwell px-5 py-2.5 text-[14px] text-linen">
          Nuevo proyecto
        </Link>
      </div>
      <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-inkwell/60">
        Universos, webs, citas y listas de deseos. Si te invitan a una lista, aparece aquí al entrar con ese correo.
      </p>
      {note && <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#8a3d32]">{note}</p>}

      {loading && <WaitMark line="Trayendo tus proyectos" />}

      {empty && (
        <div className="mt-10 overflow-hidden rounded-[32px] bg-inkwell p-8 text-linen sm:p-10">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#e8b86d]">Todavía en silencio</p>
          <h2 className="mt-3 max-w-[12ch] font-display text-5xl italic leading-[0.95]">El cielo está vacío.</h2>
          <p className="mt-4 max-w-md text-[16px] leading-relaxed text-linen/60">
            Empieza con un universo, en modo fácil, o abre el ejemplo y cámbialo como si fuera vuestro.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/crear/nuevo" className="rounded-full bg-[#e8b86d] px-5 py-3 text-inkwell">
              Crear
            </Link>
            <button
              type="button"
              className="rounded-full px-5 py-3 text-linen ring-1 ring-white/15"
              onClick={() => {
                if (busy) return;
                void (async () => {
                  setBusy(true);
                  setNote('');
                  try {
                    const sample = exampleDocument();
                    sample.meta.id = uid('uni');
                    sample.meta.status = 'draft';
                    sample.meta.slug = '';
                    await saveDraft(sample);
                    navigate(`/crear/${sample.meta.id}`);
                  } catch (err) {
                    setBusy(false);
                    setNote(err instanceof Error ? err.message : 'No se pudo crear.');
                  }
                })();
              }}
            >
              Usar el ejemplo
            </button>
          </div>
        </div>
      )}

      {!loading && (
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {list.map((row) => (
          <li key={row.id} className="group relative overflow-hidden rounded-[28px] bg-white p-6 ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(40,28,16,0.08)]">
            <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(232,184,109,0.28),transparent_68%)]" />
            <Link to={`/crear/${row.id}`} className="block">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-linen px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-brass">
                  {kindLabel(row.kind)}
                </span>
                <span className="text-[11px] uppercase tracking-[0.14em] text-inkwell/40">
                  {row.status === 'published' ? 'Publicado' : 'Borrador'}
                </span>
              </div>
              <h2 className="mt-3 font-display text-[2.1rem] italic leading-tight">{row.title}</h2>
              <p className="mt-2 text-[13px] text-inkwell/45">Editado {when(row.updatedAt)}</p>
            </Link>
            <div className="mt-5 flex flex-wrap gap-4 text-[13px] text-inkwell/50">
              {row.slug && (
                <Link to={`/u/${row.slug}`} className="text-brass">
                  Abrir
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    setNote('');
                    try {
                      const source = await loadDraft(row.id);
                      if (!source) return;
                      const copy = parseProject(JSON.parse(JSON.stringify(source)));
                      copy.meta.id = isCita(copy) ? uid('cita') : isDeseos(copy) ? uid('deseos') : isWeb(copy) ? uid('web') : uid('uni');
                      copy.meta.slug = '';
                      copy.meta.status = 'draft';
                      copy.meta.publishedAt = undefined;
                      copy.meta.unlockHash = undefined;
                      copy.meta.plan = undefined;
                      copy.meta.purchaseId = undefined;
                      copy.meta.title = `${projectTitle(source)} copia`;
                      copy.meta.titleTouched = true;
                      await saveDraft(copy);
                      refresh();
                    } catch (err) {
                      setNote(err instanceof Error ? err.message : 'No se pudo duplicar.');
                    }
                  })();
                }}
              >
                Duplicar
              </button>
              <button
                type="button"
                className="text-[#8a3d32]"
                onClick={() => setPending({ id: row.id, slug: row.slug, title: row.title })}
              >
                Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>
      )}

      {pending && (
        <ConfirmDelete
          title={pending.title}
          busy={busy}
          onCancel={() => (busy ? undefined : setPending(null))}
          onConfirm={() => {
            void (async () => {
              setBusy(true);
              await purgeProject(pending.id, pending.slug);
              setBusy(false);
              setPending(null);
              refresh();
            })();
          }}
        />
      )}
      </main>
    );
  }

function UsoPanel() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<DraftSummary[] | null>(null);
  const { rows: bought, error, loading } = usePurchases();

  useEffect(() => {
    void listDrafts().then(setRows);
  }, []);

  const list = rows ?? [];
  const published = list.filter((row) => row.status === 'published').length;
  const waiting = rows === null || loading;

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <p className="text-[12px] uppercase tracking-[0.22em] text-brass">Uso</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-[clamp(2.6rem,6vw,4.4rem)] italic leading-[0.92]">Lo que has pagado</h1>
        <Link to="/crear?vista=plan" className="rounded-full bg-inkwell px-5 py-2.5 text-[14px] text-linen">
          Ver tarifas
        </Link>
      </div>
      <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-inkwell/60">
        El cobro llega al publicar. Si queda saldo de un plan anterior, se aplica solo y pagas la diferencia. Borrar un proyecto no lo devuelve.
      </p>
      {error && <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-[#8a3d32]">{error}</p>}
      {waiting ? (
        <WaitMark line="Contando lo que tienes" />
      ) : (
        <>
          {(bought ?? []).length === 0 ? (
            <p className="mt-8 max-w-md text-[16px] text-inkwell/55">Todavía no hay pagos. El primero llega cuando publiques un regalo.</p>
          ) : (
            <ul className="mt-8 grid gap-3">
              {(bought ?? []).map((row) => (
                <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-3 rounded-[24px] bg-white px-5 py-4 ring-1 ring-black/5">
                  <span>
                    <span className="font-display text-3xl italic">{familyOf(row.plan) === 'cita' ? 'Cita' : familyOf(row.plan) === 'deseos' ? 'Lista de deseos' : 'Universo'}</span>
                    <span className="ml-3 text-[13px] text-inkwell/45">
                      {row.status === 'used' ? 'Aplicado a un regalo' : 'Libre, se usa al publicar'}
                    </span>
                  </span>
                  <span className="font-display text-2xl italic">{euros(row.amountCents)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <article className="rounded-[28px] bg-white p-6 ring-1 ring-black/5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">En tu cuenta</p>
              <h2 className="mt-2 font-display text-4xl italic">Proyectos</h2>
              <p className="mt-3 text-[28px] tabular-nums">{list.length}</p>
            </article>
            <article className="rounded-[28px] bg-white p-6 ring-1 ring-black/5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">Listos para abrir</p>
              <h2 className="mt-2 font-display text-4xl italic">Publicados</h2>
              <p className="mt-3 text-[28px] tabular-nums">{published}</p>
            </article>
          </div>
        </>
      )}
      <AccountBar onOpen={(id) => navigate(`/crear/${id}`)} />
    </main>
  );
}

function TrackingPanel() {
  const [rows, setRows] = useState<DraftSummary[] | null>(null);
  const [stats, setStats] = useState<Record<string, VisitStat>>({});
  const [tick, setTick] = useState(0);
  const [pending, setPending] = useState<{ id: string; slug: string; title: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void listDrafts().then(setRows);
    void loadVisitStats().then(setStats);
    const refresh = window.setInterval(() => {
      void loadVisitStats().then(setStats);
      setTick((n) => n + 1);
    }, 15000);
    return () => window.clearInterval(refresh);
  }, []);

  const list = rows ?? [];
  const ordered = [...list].sort((a, b) => {
    const lastA = stats[a.id]?.lastAt ?? '';
    const lastB = stats[b.id]?.lastAt ?? '';
    if (lastA !== lastB) return lastA < lastB ? 1 : -1;
    return (stats[b.id]?.opens ?? 0) - (stats[a.id]?.opens ?? 0);
  });

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-[12px] uppercase tracking-[0.22em] text-brass">Seguimiento</p>
      <h1 className="mt-3 font-display text-[clamp(2.6rem,6vw,4.4rem)] italic leading-[0.92]">Quién ha abierto cada regalo</h1>
      <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-inkwell/60">
        Visitas, última vez, y si era una cita: si dijo que sí y qué día eligió.
      </p>
      {rows === null ? (
        <WaitMark line="Mirando quién ha abierto" />
      ) : ordered.length === 0 ? (
        <p className="mt-10 max-w-md text-[16px] text-inkwell/55">Todavía no hay proyectos. Cuando existan, las visitas aparecerán en esta tabla.</p>
      ) : (
        <div className="mt-10 overflow-x-auto rounded-[28px] bg-white ring-1 ring-black/5">
            <table className="w-full min-w-[48rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-black/10 text-[11px] uppercase tracking-[0.16em] text-inkwell/40">
                <th className="px-5 py-4 font-normal">Proyecto</th>
                <th className="px-3 py-4 font-normal">Estado</th>
                <th className="px-3 py-4 font-normal">Visitas</th>
                <th className="px-3 py-4 font-normal">Última visita</th>
                <th className="px-3 py-4 font-normal">Hace</th>
                <th className="px-3 py-4 font-normal">Estuvo</th>
                <th className="px-5 py-4 font-normal">Respuesta</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((row) => {
                const stat = stats[row.id];
                return (
                  <tr key={row.id} className="border-b border-black/5 last:border-0">
                    <td className="px-5 py-4">
                      <Link to={`/crear/${row.id}`} className="font-display text-[1.45rem] italic leading-tight">
                        {row.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px]">
                        {row.slug && (
                          <Link to={`/u/${row.slug}`} className="text-brass">
                            /u/{row.slug}
                          </Link>
                        )}
                        <button
                          type="button"
                          className="text-[#8a3d32]"
                          onClick={() => setPending({ id: row.id, slug: row.slug, title: row.title })}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-[13px] text-inkwell/55">
                      {row.status === 'published' ? 'Publicado' : 'Borrador'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 tabular-nums text-[17px]">{stat?.opens ?? 0}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-[14px] text-inkwell/70">{clock(stat?.lastAt)}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-[14px] text-inkwell/55" data-tick={tick}>
                      {ago(stat?.lastAt)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-[14px] text-inkwell/55">{lasted(stat?.lastMs, stat?.opens)}</td>
                    <td className="px-5 py-4 text-[14px] text-inkwell/70">{replyLine(row.kind, stat)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {pending && (
        <ConfirmDelete
          title={pending.title}
          busy={busy}
          onCancel={() => (busy ? undefined : setPending(null))}
          onConfirm={() => {
            void (async () => {
              setBusy(true);
              await purgeProject(pending.id, pending.slug);
              setRows(await listDrafts());
              setBusy(false);
              setPending(null);
            })();
          }}
        />
      )}
    </main>
  );
}

function IdeasPanel() {
  const [notes, setNotes] = useState<IdeaNote[]>(() => listIdeas());
  const [text, setText] = useState('');

  const save = () => {
    if (!text.trim()) return;
    addIdea(text);
    setText('');
    setNotes(listIdeas());
  };

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <p className="text-[12px] uppercase tracking-[0.22em] text-brass">Ideas</p>
      <h1 className="mt-3 font-display text-[clamp(2.6rem,6vw,4.4rem)] italic leading-[0.92]">Antes de que se escapen</h1>
      <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-inkwell/60">
        Frases sueltas, sitios, fechas. Luego el wizard te las pregunta con calma.
      </p>
      <div className="mt-8 rounded-[28px] bg-white p-5 ring-1 ring-black/5 sm:p-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Un martes en la orilla, o la frase del primer mensaje…"
          rows={3}
          className="w-full resize-none bg-transparent text-[17px] outline-none placeholder:text-inkwell/30"
        />
        <div className="mt-3 flex justify-end">
          <button type="button" onClick={save} disabled={!text.trim()} className="rounded-full bg-inkwell px-5 py-2.5 text-[14px] text-linen disabled:opacity-30">
            Guardar idea
          </button>
        </div>
      </div>
      {notes.length > 0 && (
        <ul className="mt-6 grid gap-3">
          {notes.map((note) => (
            <li key={note.id} className="flex items-start justify-between gap-4 rounded-[22px] bg-white px-5 py-4 ring-1 ring-black/5">
              <p className="text-[16px] leading-relaxed">{note.text}</p>
              <button type="button" className="shrink-0 text-[13px] text-inkwell/40" onClick={() => { removeIdea(note.id); setNotes(listIdeas()); }}>
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
      <h2 className="mt-14 font-display text-3xl italic">Por si te quedas en blanco</h2>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {IDEA_SEEDS.map((seed) => (
          <li key={seed.title} className="rounded-[24px] bg-white p-5 ring-1 ring-black/5">
            <p className="font-display text-2xl italic">{seed.title}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-inkwell/55">{seed.body}</p>
            <Link to="/crear/nuevo?modo=facil&plantilla=universo" className="mt-4 inline-block text-[13px] uppercase tracking-[0.14em] text-brass">
              Empezar con esto
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

function GuidePanel() {
  const steps = [
    { n: '01', title: 'Crea', body: 'Elige el regalo y constrúyelo. Crear es gratis. El precio se actualiza con lo que añades: fotos, texto, música, audios.' },
    { n: '02', title: 'Elige el modo', body: 'Fácil: un wizard de pocos pasos. Máxima: el estudio entero, estrella a estrella.' },
    { n: '03', title: 'El cielo', body: 'Su nombre en el centro. Cada estrella es un capítulo: historia, carta, lista, archivo…' },
    { n: '04', title: 'Publicar', body: 'Ahí se cobra. Si ya habías pagado un plan, cuenta a favor y solo falta la diferencia. Sale un enlace /u/… para el móvil.' },
  ];
  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <p className="text-[12px] uppercase tracking-[0.22em] text-brass">Instrucciones</p>
      <h1 className="mt-3 font-display text-[clamp(2.6rem,6vw,4.4rem)] italic leading-[0.92]">Cómo se construye</h1>
      <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-inkwell/60">
        No hace falta saber diseño. Hace falta recordar. El resto es un cielo que se abre.
      </p>
      <ol className="mt-10 grid gap-4">
        {steps.map((step) => (
          <li key={step.n} className="grid gap-4 rounded-[28px] bg-white p-6 ring-1 ring-black/5 sm:grid-cols-[4.5rem_1fr] sm:items-start">
            <span className="font-display text-3xl italic text-brass">{step.n}</span>
            <div>
              <h2 className="font-display text-3xl italic">{step.title}</h2>
              <p className="mt-2 max-w-xl text-[16px] leading-relaxed text-inkwell/60">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link to="/crear/nuevo" className="mt-10 inline-block rounded-full bg-inkwell px-6 py-3 text-linen">
        Crear ahora
      </Link>
    </main>
  );
}

function when(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

function replyLine(kind: DraftSummary['kind'] | undefined, stat?: VisitStat) {
  if (kind !== 'cita') return '—';
  if (stat?.reply?.dateLabel) return `Sí · ${stat.reply.dateLabel}`;
  if (stat?.reply) return 'Sí';
  if (stat?.noTries) return `Todavía no · ${stat.noTries} ${stat.noTries === 1 ? 'intento' : 'intentos'}`;
  if (stat?.opens) return 'Esperando';
  return '—';
}

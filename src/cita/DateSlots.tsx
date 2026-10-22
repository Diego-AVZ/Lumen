import { fromDateTime, nearbySlots, prettyWhen, toDateInput, toTimeInput, type DateOption } from '@/schema/cita';
import { uid } from '@/lib/motion';

const TIMES = ['10:00', '12:00', '14:00', '16:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

function padLocal(n: number) {
  return String(n).padStart(2, '0');
}

function todayStamp() {
  const now = new Date();
  return `${now.getFullYear()}-${padLocal(now.getMonth() + 1)}-${padLocal(now.getDate())}`;
}

export function DateSlots({
  dates,
  onChange,
}: {
  dates: DateOption[];
  onChange: (dates: DateOption[]) => void;
}) {
  const slots = nearbySlots();
  const picked = new Set(dates.map((item) => item.when).filter(Boolean));

  const toggle = (when: string) => {
    if (picked.has(when)) {
      onChange(dates.filter((item) => item.when !== when));
      return;
    }
    onChange([...dates.filter((item) => item.when || item.label.trim()), { id: uid('when'), label: prettyWhen(when), when }]);
  };

  const patch = (id: string, next: Partial<DateOption>) => {
    onChange(dates.map((item) => (item.id === id ? { ...item, ...next } : item)));
  };

  const setDayTime = (id: string, day: string, time: string) => {
    const when = fromDateTime(day, time);
    onChange(
      dates.map((item) => {
        if (item.id !== id) return item;
        const auto = prettyWhen(item.when);
        const keep = item.label.trim() && item.label !== auto;
        return { ...item, when, label: keep ? item.label : prettyWhen(when) };
      }),
    );
  };

  const addPicked = () => {
    const extra = slots.find((slot) => !picked.has(slot.when));
    const when = extra?.when ?? fromDateTime(todayStamp(), '20:00');
    onChange([...dates, { id: uid('when'), label: prettyWhen(when), when }]);
  };

  const addWritten = () => {
    onChange([...dates, { id: uid('when'), label: '', when: '' }]);
  };

  return (
    <div>
      <p className="text-[13px] text-inkwell/55">Toca un rato, o elige otro día y otra hora.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {slots.map((slot) => (
          <button
            key={slot.when}
            type="button"
            onClick={() => toggle(slot.when)}
            className={`rounded-full px-4 py-2 text-left text-[14px] leading-snug ${
              picked.has(slot.when) ? 'bg-inkwell text-linen' : 'bg-white ring-1 ring-black/10'
            }`}
          >
            {slot.label}
          </button>
        ))}
      </div>
      <ul className="mt-5 grid gap-3">
        {dates.map((item) => {
          const day = toDateInput(item.when);
          const time = toTimeInput(item.when);
          const known = TIMES.includes(time);
          return (
            <li key={item.id} className="rounded-[22px] bg-white p-4 ring-1 ring-black/10">
              <p className="font-display text-2xl italic leading-tight">{prettyWhen(item.when) || item.label || 'Elige día y hora'}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={day}
                  onChange={(e) => setDayTime(item.id, e.target.value, time || '20:00')}
                  className="rounded-full bg-linen px-3 py-2 text-[14px] outline-none"
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setDayTime(item.id, day || todayStamp(), e.target.value || '12:00')}
                  className="rounded-full bg-linen px-3 py-2 text-[14px] outline-none"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TIMES.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => setDayTime(item.id, day || todayStamp(), hour)}
                    className={`rounded-full px-3 py-1.5 text-[13px] ${
                      time === hour ? 'bg-inkwell text-linen' : 'bg-linen text-inkwell/70'
                    }`}
                  >
                    {hour}
                  </button>
                ))}
                {!known && time && (
                  <span className="rounded-full bg-inkwell px-3 py-1.5 text-[13px] text-linen">{time}</span>
                )}
              </div>
              <label className="mt-3 block">
                <span className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">O escríbela</span>
                <input
                  value={item.label}
                  placeholder="El sábado por la mañana"
                  onChange={(e) => patch(item.id, { label: e.target.value })}
                  className="mt-1.5 w-full rounded-2xl bg-linen px-3 py-2 text-[14px] outline-none"
                />
              </label>
              {dates.length > 1 && (
                <button type="button" className="mt-3 text-[13px] text-[#8a3d32]" onClick={() => onChange(dates.filter((row) => row.id !== item.id))}>
                  Quitar
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="rounded-full bg-inkwell px-4 py-2 text-[14px] text-linen" onClick={addPicked}>
          Elegir otra fecha
        </button>
        <button type="button" className="rounded-full bg-white px-4 py-2 text-[14px] ring-1 ring-black/10" onClick={addWritten}>
          Escribirla
        </button>
      </div>
    </div>
  );
}

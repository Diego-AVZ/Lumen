import { fromDateTime, nearbySlots, prettyWhen, toDateInput, toTimeInput, type DateOption } from '@/schema/cita';
import { uid } from '@/lib/motion';

const TIMES = ['18:00', '19:00', '20:00', '21:00', '22:00'];

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

  const patch = (id: string, day: string, time: string) => {
    const when = fromDateTime(day, time);
    onChange(dates.map((item) => (item.id === id ? { ...item, when, label: prettyWhen(when) } : item)));
  };

  const add = () => {
    const extra = slots.find((slot) => !picked.has(slot.when));
    const now = new Date();
    const today = `${now.getFullYear()}-${padLocal(now.getMonth() + 1)}-${padLocal(now.getDate())}`;
    const when = extra?.when ?? fromDateTime(today, '20:00');
    onChange([...dates, { id: uid('when'), label: prettyWhen(when), when }]);
  };

  return (
    <div>
      <p className="text-[13px] text-inkwell/55">Toca un rato. El nombre del día se escribe solo.</p>
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
        {dates.map((item) => (
          <li key={item.id} className="rounded-[22px] bg-white p-4 ring-1 ring-black/10">
            <p className="font-display text-2xl italic leading-tight">{prettyWhen(item.when) || item.label || 'Elige día y hora'}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                type="date"
                value={toDateInput(item.when)}
                onChange={(e) => patch(item.id, e.target.value, toTimeInput(item.when) || '20:00')}
                className="rounded-full bg-linen px-3 py-2 text-[14px] outline-none"
              />
              <div className="flex flex-wrap gap-1.5">
                {TIMES.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => patch(item.id, toDateInput(item.when) || todayStamp(), time)}
                    className={`rounded-full px-3 py-2 text-[13px] ${
                      toTimeInput(item.when) === time ? 'bg-inkwell text-linen' : 'bg-linen text-inkwell/70'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
            {dates.length > 1 && (
              <button type="button" className="mt-3 text-[13px] text-[#8a3d32]" onClick={() => onChange(dates.filter((row) => row.id !== item.id))}>
                Quitar
              </button>
            )}
          </li>
        ))}
      </ul>
      <button type="button" className="mt-4 text-[14px] text-brass" onClick={add}>
        Otra fecha
      </button>
    </div>
  );
}

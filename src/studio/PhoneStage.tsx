import { useEffect, useRef, useState, type ReactNode } from 'react';

const W = 414;
const H = 868;

export function PhoneStage({ children, chrome }: { children: ReactNode; chrome?: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.62);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth - 28;
      const h = el.clientHeight - 20;
      if (w < 80 || h < 80) return;
      setScale(Math.min(w / W, h / H, 0.94));
    };
    fit();
    const watcher = new ResizeObserver(fit);
    watcher.observe(el);
    return () => watcher.disconnect();
  }, []);

  return (
    <div ref={box} className="relative min-h-0 flex-1">
      {chrome}
      <div className="absolute inset-0 grid place-items-center">
        <div style={{ width: W * scale, height: H * scale }}>
          <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <PhoneChrome>{children}</PhoneChrome>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PhoneRack({
  items,
}: {
  items: { key: string; label: string; node: ReactNode }[];
}) {
  const box = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.42);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      const h = el.clientHeight - 44;
      if (h < 80) return;
      setScale(Math.min(h / H, 0.58));
    };
    fit();
    const watcher = new ResizeObserver(fit);
    watcher.observe(el);
    return () => watcher.disconnect();
  }, [items.length]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      el.scrollLeft += event.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [items.length]);

  return (
    <div ref={box} className="relative min-h-0 flex-1 overflow-hidden">
      <div ref={scroller} className="phone-rack absolute inset-0 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full w-max items-center gap-6 px-5 pb-6">
          {items.map((item) => (
            <div key={item.key} className="shrink-0">
              <div style={{ width: W * scale, height: H * scale }}>
                <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                  <PhoneChrome>{item.node}</PhoneChrome>
                </div>
              </div>
              <p className="mt-2 text-center text-[11px] uppercase tracking-[0.16em] text-white/55">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PhoneChrome({ children }: { children: ReactNode }) {
  return (
    <div className="h-[868px] w-[414px] rounded-[2.8rem] bg-[#141210] p-3 shadow-phone ring-1 ring-white/10">
      <div className="relative h-[844px] w-[390px] overflow-hidden rounded-[2.15rem] bg-[#0c0b0a]">
        <div className="pointer-events-none absolute left-1/2 top-[9px] z-[70] h-[25px] w-[108px] -translate-x-1/2 rounded-full bg-black" />
        <div className="absolute inset-0">{children}</div>
      </div>
    </div>
  );
}

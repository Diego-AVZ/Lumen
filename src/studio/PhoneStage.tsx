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

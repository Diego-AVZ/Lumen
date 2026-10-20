import { useMemo } from 'react';

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function Starfield() {
  const stars = useMemo(() => {
    const rand = mulberry32(7);
    return Array.from({ length: 72 }, () => ({
      x: rand() * 100,
      y: rand() * 100,
      r: rand() * 1.5 + 0.4,
      d: 2.4 + rand() * 4.5,
      delay: -rand() * 6,
      o: 0.25 + rand() * 0.7,
    }));
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {stars.map((star, i) => (
        <span
          key={i}
          className="sky-star"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.r,
            height: star.r,
            animationDuration: `${star.d}s`,
            animationDelay: `${star.delay}s`,
            opacity: star.o,
          }}
        />
      ))}
      <span className="sky-moon" style={{ right: '11%', top: '13%' }}>
        <span className="sky-moon-glow" />
        <span className="sky-moon-face">
          <i className="sky-crater sky-crater-a" />
          <i className="sky-crater sky-crater-b" />
          <i className="sky-crater sky-crater-c" />
        </span>
      </span>
    </div>
  );
}

export function Grain() {
  return <div className="grain" aria-hidden />;
}

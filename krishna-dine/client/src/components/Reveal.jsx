import { useEffect, useRef, useState } from 'react';

/** Fades and lifts its child into view the first time it scrolls on screen. */
export default function Reveal({ children, className = '' }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (seen || !ref.current) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          obs.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [seen]);
  return (
    <div ref={ref} className={`reveal ${seen ? 'reveal-in' : ''} ${className}`}>
      {children}
    </div>
  );
}

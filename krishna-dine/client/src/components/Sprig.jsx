/** Hand-drawn style sprig that sways gently. */
export default function Sprig({ flip = false, className = '' }) {
  return (
    <svg viewBox="0 0 60 180" className={`poster-sway ${className}`} style={flip ? { transform: 'scaleX(-1)' } : undefined} aria-hidden="true">
      <g fill="none" stroke="#C99B78" strokeWidth="2" strokeLinecap="round">
        <path d="M30 175 C 38 120, 22 60, 32 8" />
      </g>
      <g fill="#C99B78">
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const y = 150 - i * 24;
          const x = 30 + (i % 2 ? 2 : 4) * (i < 3 ? 1 : -1) * 0.5;
          return (
            <g key={i}>
              <path d={`M${x} ${y} q-22 -6 -26 -26 q 22 -2 26 26`} opacity="0.95" />
              <path d={`M${x} ${y - 8} q22 -6 24 -26 q -22 -2 -24 26`} opacity="0.95" />
            </g>
          );
        })}
        <path d="M32 8 q-8 14 0 26 q 8 -12 0 -26" />
      </g>
    </svg>
  );
}


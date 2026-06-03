const SHIP_C  = '#00e5ff';
const ENEMY_C = '#ff3344';
const STAR_C  = '#ffc844';
const BASE_C  = '#39ff14';

function ShipGlyph({ size = 26 }) {
  const fill = 'rgba(0,229,255,0.1)';
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      {/* Saucer section */}
      <ellipse cx="16" cy="12" rx="10" ry="7"
        fill={fill} stroke={SHIP_C} strokeWidth="1.5" />
      {/* Bridge dome */}
      <circle cx="16" cy="11" r="2.2" fill={SHIP_C} />
      {/* Left nacelle pylon */}
      <line x1="12" y1="18.5" x2="10" y2="21.5" stroke={SHIP_C} strokeWidth="1" />
      {/* Right nacelle pylon */}
      <line x1="20" y1="18.5" x2="22" y2="21.5" stroke={SHIP_C} strokeWidth="1" />
      {/* Secondary hull */}
      <path d="M14 18 L13.5 25 Q16 27.5 18.5 25 L18 18 Z"
        fill={fill} stroke={SHIP_C} strokeWidth="1.3" />
      {/* Left nacelle */}
      <rect x="2" y="20" width="9.5" height="2.8" rx="1.4"
        fill={fill} stroke={SHIP_C} strokeWidth="1.2" />
      {/* Right nacelle */}
      <rect x="20.5" y="20" width="9.5" height="2.8" rx="1.4"
        fill={fill} stroke={SHIP_C} strokeWidth="1.2" />
    </svg>
  );
}

function EnemyGlyph({ size = 26 }) {
  const fill = 'rgba(255,51,68,0.1)';
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      {/* Central body — forward-pointing diamond */}
      <polygon points="16,4 21,15 16,20 11,15"
        fill={fill} stroke={ENEMY_C} strokeWidth="1.5" />
      {/* Left wing — sweeps back */}
      <polygon points="11,15 2,22 5,27 14,19"
        fill={fill} stroke={ENEMY_C} strokeWidth="1.2" />
      {/* Right wing — sweeps back */}
      <polygon points="21,15 30,22 27,27 18,19"
        fill={fill} stroke={ENEMY_C} strokeWidth="1.2" />
      {/* Tail boom */}
      <path d="M14.5 20 L15 28 L16 26 L17 28 L17.5 20"
        fill={fill} stroke={ENEMY_C} strokeWidth="1.1" strokeLinejoin="round" />
      {/* Forward cannon */}
      <line x1="16" y1="4" x2="16" y2="1.5" stroke={ENEMY_C} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function StarGlyph({ size = 26 }) {
  // 8-pointed star polygon
  const outerR = 12.5;
  const innerR = 5.5;
  const cx = 16, cy = 16;
  const points = Array.from({ length: 16 }, (_, i) => {
    const angle = (i * Math.PI) / 8 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    return `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      {/* Outer corona */}
      <circle cx="16" cy="16" r="14" fill="rgba(255,200,68,0.04)" />
      {/* Star body */}
      <polygon points={points}
        fill="rgba(255,200,68,0.18)" stroke={STAR_C} strokeWidth="1.1" strokeLinejoin="round" />
      {/* Hot core */}
      <circle cx="16" cy="16" r="3.8" fill={STAR_C} opacity="0.85" />
    </svg>
  );
}

function BaseGlyph({ size = 26 }) {
  const fill = 'rgba(57,255,20,0.1)';
  // Six spokes at 60° intervals
  const spokes = Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3 - Math.PI / 2;
    return {
      x1: (16 + 4.5 * Math.cos(a)).toFixed(2),
      y1: (16 + 4.5 * Math.sin(a)).toFixed(2),
      x2: (16 + 12 * Math.cos(a)).toFixed(2),
      y2: (16 + 12 * Math.sin(a)).toFixed(2),
    };
  });
  // Docking port squares at cardinal ring positions
  const ports = [0, 90, 180, 270].map((deg) => {
    const a = (deg * Math.PI) / 180 - Math.PI / 2;
    return {
      x: (16 + 12.5 * Math.cos(a) - 1.5).toFixed(2),
      y: (16 + 12.5 * Math.sin(a) - 1.5).toFixed(2),
    };
  });
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      {/* Outer ring */}
      <circle cx="16" cy="16" r="12.5"
        fill="none" stroke={BASE_C} strokeWidth="1.8" />
      {/* Spokes */}
      {spokes.map((s, i) => (
        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          stroke={BASE_C} strokeWidth="1.1" />
      ))}
      {/* Hub */}
      <circle cx="16" cy="16" r="4"
        fill={fill} stroke={BASE_C} strokeWidth="1.5" />
      {/* Docking ports */}
      {ports.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width="3" height="3" fill={BASE_C} />
      ))}
    </svg>
  );
}

export function CellGlyph({ type }) {
  switch (type) {
    case 'ship':  return <ShipGlyph />;
    case 'enemy': return <EnemyGlyph />;
    case 'star':  return <StarGlyph />;
    case 'base':  return <BaseGlyph />;
    default:      return null;
  }
}

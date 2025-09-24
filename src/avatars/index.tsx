import React from 'react';

/**
 * Pixel-art avatar set (tasteful, abstract faces with festive hats/masks).
 * - Pure SVG, no external assets.
 * - Scales cleanly; we hint “pixelated” via crisp edges.
 * - All avatars share the same 16x16 virtual grid for consistency.
 */

export type AvatarId =
  | 'sombrero1'
  | 'sombrero2'
  | 'charro'
  | 'mariachi'
  | 'luchadorRed'
  | 'luchadorBlue'
  | 'folklorico'
  | 'poncho';

export const AVATAR_IDS: AvatarId[] = [
  'sombrero1',
  'sombrero2',
  'charro',
  'mariachi',
  'luchadorRed',
  'luchadorBlue',
  'folklorico',
  'poncho',
];

export function avatarLabel(id: AvatarId): string {
  switch (id) {
    case 'sombrero1':    return 'Sombrero (vert)';
    case 'sombrero2':    return 'Sombrero (jaune)';
    case 'charro':       return 'Charro';
    case 'mariachi':     return 'Mariachi';
    case 'luchadorRed':  return 'Luchador (rouge)';
    case 'luchadorBlue': return 'Luchador (bleu)';
    case 'folklorico':   return 'Folk';
    case 'poncho':       return 'Poncho';
  }
}

/** Common wrapper so everything renders crisp/pixel-ish */
function PixelSVG({
  size = 56,
  children,
}: {
  size?: number;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      style={{
        imageRendering: 'pixelated',
        shapeRendering: 'crispEdges',
      }}
      aria-hidden
      focusable="false"
    >
      {/* subtle circular clip to feel like a badge */}
      <defs>
        <clipPath id="px-clip">
          <circle cx="8" cy="8" r="7.8" />
        </clipPath>
      </defs>
      <g clipPath="url(#px-clip)">{children}</g>
      {/* outline ring */}
      <circle cx="8" cy="8" r="7.5" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="0.5" />
    </svg>
  );
}

/* ============== Tiny helpers (rects on a 16x16 grid) ============== */
const R = (x: number, y: number, w: number, h: number, fill: string) => (
  <rect key={`${x},${y},${w},${h},${fill}`} x={x} y={y} width={w} height={h} fill={fill} />
);

/* ====================== Avatars (16x16 grid) ====================== */

/** Sombrero (green brim), warm face */
function A_Sombrero1() {
  const skin = '#f2c196';
  const hair = '#3b2f2f';
  const brim = '#22c55e';
  const hat  = '#166534';
  const outline = '#1f2937';
  return (
    <PixelSVG>
      {/* bg */}
      {R(0,0,16,16,'#0b1220')}
      {/* brim */}
      {R(1,4,14,2,brim)}
      {/* crown */}
      {R(6,1,4,3,hat)}
      {/* hair */}
      {R(3,6,10,2,hair)}
      {/* face */}
      {R(4,8,8,5,skin)}
      {/* eyes */}
      {R(6,9,1,1,outline)}
      {R(9,9,1,1,outline)}
      {/* mouth */}
      {R(7,12,2,1,outline)}
    </PixelSVG>
  );
}

/** Sombrero (yellow brim), cool face */
function A_Sombrero2() {
  const skin = '#edc4a4';
  const hair = '#2a2525';
  const brim = '#facc15';
  const hat  = '#a16207';
  const outline = '#111827';
  return (
    <PixelSVG>
      {R(0,0,16,16,'#0b1220')}
      {R(1,4,14,2,brim)}
      {R(6,1,4,3,hat)}
      {R(3,6,10,2,hair)}
      {R(4,8,8,5,skin)}
      {R(6,9,1,1,outline)}
      {R(9,9,1,1,outline)}
      {R(7,12,2,1,outline)}
    </PixelSVG>
  );
}

/** Charro hat + suit collar */
function A_Charro() {
  const skin = '#f1c19e';
  const hat  = '#1f2937';
  const band = '#e5e7eb';
  const suit = '#111827';
  const outline = '#0b0f16';
  return (
    <PixelSVG>
      {R(0,0,16,16,'#0b1220')}
      {/* wide hat */}
      {R(2,3,12,2,hat)}
      {R(6,1,4,3,hat)}
      {R(7,2,2,1,band)}
      {/* face */}
      {R(4,7,8,6,skin)}
      {/* collar */}
      {R(5,13,6,1,suit)}
      {/* eyes/mouth */}
      {R(6,9,1,1,outline)}
      {R(9,9,1,1,outline)}
      {R(7,12,2,1,outline)}
    </PixelSVG>
  );
}

/** Mariachi (small hat, red bow) */
function A_Mariachi() {
  const skin = '#f2c6a6';
  const hat  = '#0f172a';
  const band = '#94a3b8';
  const bow  = '#ef4444';
  const outline = '#0b0f16';
  return (
    <PixelSVG>
      {R(0,0,16,16,'#0b1220')}
      {R(4,2,8,2,hat)}
      {R(7,2,2,1,band)}
      {/* face */}
      {R(4,6,8,7,skin)}
      {/* bow */}
      {R(7,13,2,1,bow)}
      {R(6,13,1,1,'#7f1d1d')}
      {R(9,13,1,1,'#7f1d1d')}
      {/* eyes/mouth */}
      {R(6,8,1,1,outline)}
      {R(9,8,1,1,outline)}
      {R(7,11,2,1,outline)}
    </PixelSVG>
  );
}

/** Luchador mask (red) */
function A_LuchadorRed() {
  const mask = '#dc2626';
  const trim = '#fca5a5';
  const eye  = '#0b0f16';
  return (
    <PixelSVG>
      {R(0,0,16,16,'#0b1220')}
      {/* mask base */}
      {R(3,5,10,8,mask)}
      {/* trim */}
      {R(3,5,10,1,trim)}
      {R(3,12,10,1,trim)}
      {/* eye holes */}
      {R(5,8,2,2,eye)}
      {R(9,8,2,2,eye)}
      {/* mouth slit */}
      {R(7,11,2,1,eye)}
    </PixelSVG>
  );
}

/** Luchador mask (blue) */
function A_LuchadorBlue() {
  const mask = '#2563eb';
  const trim = '#93c5fd';
  const eye  = '#0b0f16';
  return (
    <PixelSVG>
      {R(0,0,16,16,'#0b1220')}
      {R(3,5,10,8,mask)}
      {R(3,5,10,1,trim)}
      {R(3,12,10,1,trim)}
      {R(5,8,2,2,eye)}
      {R(9,8,2,2,eye)}
      {R(7,11,2,1,eye)}
    </PixelSVG>
  );
}

/** Folklórico headwrap */
function A_Folklorico() {
  const skin = '#f3c7a8';
  const wrap1 = '#a855f7';
  const wrap2 = '#f472b6';
  const outline = '#0b0f16';
  return (
    <PixelSVG>
      {R(0,0,16,16,'#0b1220')}
      {/* headwrap */}
      {R(2,3,12,3,wrap1)}
      {R(1,4,14,1,wrap2)}
      {/* hair band */}
      {R(3,6,10,1,'#1f2937')}
      {/* face */}
      {R(4,7,8,6,skin)}
      {/* eyes/mouth */}
      {R(6,9,1,1,outline)}
      {R(9,9,1,1,outline)}
      {R(7,12,2,1,outline)}
    </PixelSVG>
  );
}

/** Poncho hood + stripes */
function A_Poncho() {
  const skin = '#efc3a2';
  const hood = '#374151';
  const p1   = '#f59e0b';
  const p2   = '#10b981';
  const p3   = '#3b82f6';
  const outline = '#0b0f16';
  return (
    <PixelSVG>
      {R(0,0,16,16,'#0b1220')}
      {/* hood */}
      {R(3,3,10,5,hood)}
      {/* face */}
      {R(5,7,6,5,skin)}
      {/* poncho stripes */}
      {R(4,13,8,1,p1)}
      {R(4,14,8,1,p2)}
      {R(4,15,8,1,p3)}
      {/* eyes/mouth */}
      {R(6,9,1,1,outline)}
      {R(9,9,1,1,outline)}
      {R(7,11,2,1,outline)}
    </PixelSVG>
  );
}

export function AvatarIcon({ id, size = 56 }: { id: AvatarId; size?: number }) {
  switch (id) {
    case 'sombrero1':   return <A_Sombrero1 />;
    case 'sombrero2':   return <A_Sombrero2 />;
    case 'charro':      return <A_Charro />;
    case 'mariachi':    return <A_Mariachi />;
    case 'luchadorRed': return <A_LuchadorRed />;
    case 'luchadorBlue':return <A_LuchadorBlue />;
    case 'folklorico':  return <A_Folklorico />;
    case 'poncho':      return <A_Poncho />;
    default:            return <A_Sombrero1 />;
  }
}

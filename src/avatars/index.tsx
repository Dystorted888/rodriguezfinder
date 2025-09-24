import React from 'react';

export const AVATAR_IDS = [
  'sombrero',
  'luchador',
  'pinata',
  'guitar',
  'maracas',
  'taco',
  'chili',
  'cactusHat',
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

export function avatarLabel(id: AvatarId) {
  switch (id) {
    case 'sombrero': return 'Sombrero';
    case 'luchador': return 'Luchador mask';
    case 'pinata': return 'Piñata';
    case 'guitar': return 'Guitar';
    case 'maracas': return 'Maracas';
    case 'taco': return 'Taco';
    case 'chili': return 'Chili';
    case 'cactusHat': return 'Cactus with hat';
    default: return 'Avatar';
  }
}

type Props = {
  id: AvatarId;
  size?: number;            // px (width = height)
  className?: string;       // optional wrapper classes
  title?: string;           // accessible label override
};

export function AvatarIcon({ id, size = 48, className, title }: Props) {
  const common = { width: size, height: size, viewBox: '0 0 64 64', role: 'img' } as const;

  switch (id) {
    case 'sombrero': return (
      <svg {...common} className={className}>
        <title>{title || avatarLabel('sombrero')}</title>
        {/* brim */}
        <ellipse cx="32" cy="44" rx="26" ry="8" fill="#C27C2C" />
        {/* crown */}
        <path d="M18 40 C20 28, 27 22, 32 22 C37 22, 44 28, 46 40 Z" fill="#E3A64B"/>
        {/* trim */}
        <rect x="18" y="38" width="28" height="4" fill="#2DD4BF"/>
        <circle cx="22" cy="40" r="2" fill="#EF4444"/>
        <circle cx="28" cy="40" r="2" fill="#22C55E"/>
        <circle cx="34" cy="40" r="2" fill="#3B82F6"/>
        <circle cx="40" cy="40" r="2" fill="#A855F7"/>
      </svg>
    );

    case 'luchador': return (
      <svg {...common} className={className}>
        <title>{title || avatarLabel('luchador')}</title>
        {/* mask base */}
        <circle cx="32" cy="32" r="20" fill="#10B981"/>
        {/* eye shapes */}
        <path d="M20 28 l8 -6 v12 z" fill="#111827"/>
        <path d="M44 28 l-8 -6 v12 z" fill="#111827"/>
        {/* mouth stripe */}
        <rect x="22" y="40" width="20" height="4" rx="2" fill="#F59E0B"/>
        {/* forehead flare */}
        <path d="M28 16 h8 l-4 6 z" fill="#F43F5E"/>
      </svg>
    );

    case 'pinata': return (
      <svg {...common} className={className}>
        <title>{title || avatarLabel('pinata')}</title>
        {/* body */}
        <rect x="16" y="26" width="32" height="16" rx="4" fill="#F472B6"/>
        {/* head */}
        <rect x="40" y="20" width="12" height="10" rx="3" fill="#60A5FA"/>
        {/* ear */}
        <rect x="48" y="14" width="4" height="8" rx="2" fill="#F59E0B"/>
        {/* stripes */}
        <rect x="16" y="30" width="32" height="3" fill="#34D399"/>
        <rect x="16" y="35" width="32" height="3" fill="#FBBF24"/>
        <rect x="16" y="40" width="32" height="3" fill="#3B82F6"/>
        {/* legs */}
        <rect x="20" y="42" width="4" height="8" fill="#A78BFA"/>
        <rect x="28" y="42" width="4" height="8" fill="#A78BFA"/>
        <rect x="36" y="42" width="4" height="8" fill="#A78BFA"/>
        <rect x="44" y="42" width="4" height="8" fill="#A78BFA"/>
        {/* eye */}
        <circle cx="46" cy="24" r="2" fill="#111827"/>
      </svg>
    );

    case 'guitar': return (
      <svg {...common} className={className}>
        <title>{title || avatarLabel('guitar')}</title>
        {/* body */}
        <circle cx="24" cy="40" r="12" fill="#D97706"/>
        <circle cx="36" cy="38" r="10" fill="#EAB308"/>
        {/* sound hole */}
        <circle cx="30" cy="38" r="3" fill="#111827"/>
        {/* neck */}
        <rect x="38" y="28" width="16" height="6" rx="3" fill="#A16207"/>
        {/* headstock */}
        <rect x="54" y="27" width="6" height="8" rx="2" fill="#92400E"/>
        {/* strings */}
        <rect x="40" y="30" width="18" height="1" fill="#F3F4F6"/>
        <rect x="40" y="31.5" width="18" height="1" fill="#F3F4F6"/>
        <rect x="40" y="33" width="18" height="1" fill="#F3F4F6"/>
      </svg>
    );

    case 'maracas': return (
      <svg {...common} className={className}>
        <title>{title || avatarLabel('maracas')}</title>
        {/* left maraca */}
        <ellipse cx="24" cy="26" rx="8" ry="10" fill="#F87171"/>
        <rect x="22" y="34" width="4" height="14" rx="2" fill="#92400E"/>
        {/* right maraca */}
        <ellipse cx="40" cy="26" rx="8" ry="10" fill="#34D399"/>
        <rect x="38" y="34" width="4" height="14" rx="2" fill="#92400E"/>
        {/* trims */}
        <rect x="18" y="24" width="12" height="3" fill="#FBBF24"/>
        <rect x="34" y="24" width="12" height="3" fill="#60A5FA"/>
        <circle cx="24" cy="26" r="2" fill="#111827"/>
        <circle cx="40" cy="26" r="2" fill="#111827"/>
      </svg>
    );

    case 'taco': return (
      <svg {...common} className={className}>
        <title>{title || avatarLabel('taco')}</title>
        {/* shell */}
        <path d="M12 40 q20 -24 40 0 v6 H12 Z" fill="#F4C15D" />
        {/* fillings */}
        <circle cx="24" cy="34" r="4" fill="#84CC16"/>
        <circle cx="32" cy="32" r="4" fill="#F87171"/>
        <circle cx="40" cy="34" r="4" fill="#22C55E"/>
        <rect x="18" y="36" width="28" height="2" fill="#EAB308"/>
      </svg>
    );

    case 'chili': return (
      <svg {...common} className={className}>
        <title>{title || avatarLabel('chili')}</title>
        {/* chili body */}
        <path d="M22 26 c6 14, 18 14, 24 8 c2 -2, 2 -6, -2 -8 c-4 -2 -14 -4 -22 0 z" fill="#EF4444"/>
        {/* stem */}
        <path d="M42 28 c-2 -5, -6 -8, -10 -8" stroke="#16A34A" strokeWidth="3" fill="none" />
      </svg>
    );

    case 'cactusHat': return (
      <svg {...common} className={className}>
        <title>{title || avatarLabel('cactusHat')}</title>
        {/* cactus */}
        <rect x="28" y="22" width="8" height="24" rx="4" fill="#22C55E"/>
        <rect x="20" y="30" width="6" height="12" rx="3" fill="#22C55E"/>
        <rect x="38" y="30" width="6" height="12" rx="3" fill="#22C55E"/>
        {/* thorns */}
        <circle cx="30" cy="28" r="1" fill="#14532D"/>
        <circle cx="34" cy="32" r="1" fill="#14532D"/>
        <circle cx="30" cy="36" r="1" fill="#14532D"/>
        <circle cx="34" cy="40" r="1" fill="#14532D"/>
        {/* pot */}
        <rect x="24" y="44" width="16" height="6" rx="2" fill="#B45309"/>
        {/* small sombrero hat on top */}
        <ellipse cx="32" cy="20" rx="10" ry="3" fill="#D97706"/>
        <path d="M26 20 h12 l-6 -4 z" fill="#F59E0B"/>
      </svg>
    );

    default:
      return (
        <svg {...common} className={className}>
          <rect x="8" y="8" width="48" height="48" rx="8" fill="#9CA3AF" />
        </svg>
      );
  }
}

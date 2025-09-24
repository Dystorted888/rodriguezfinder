import React, { useState, useMemo } from 'react';

/**
 * File-based avatars (JPEG):
 * - Put your files in /public/avatars/
 * - Use the filename (without extension) as the avatarId
 * - We try `${id}.jpg`, and if that 404s we auto-fallback to `${id}.jpeg`.
 */

export type AvatarId = string;

// EDIT this list to match your filenames (without extension)
export const AVATAR_IDS: AvatarId[] = [
  'sombrero',
  'charro',
  'luchador-red',
  'luchador-blue',
  'guitar',
  'trumpet',
  'cactus',
  'pinata',
];

// Optional: pretty label from the filename
export function avatarLabel(id: AvatarId): string {
  const base = id.replace(/[-_]+/g, ' ');
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function AvatarIcon({
  id,
  size = 56,
  className,
}: {
  id: AvatarId;
  size?: number;
  className?: string;
}) {
  // try .jpg, then .jpeg if it fails
  const [ext, setExt] = useState<'.jpg' | '.jpeg'>('.jpg');
  const src = useMemo(() => `/avatars/${id}${ext}`, [id, ext]);

  return (
    <img
      src={src}
      alt={avatarLabel(id)}
      width={size}
      height={size}
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        imageRendering: 'crisp-edges',
        // small rounding looks nicer in chips
        borderRadius: 6,
      }}
      draggable={false}
      onError={() => {
        if (ext === '.jpg') setExt('.jpeg'); // fallback once
      }}
    />
  );
}

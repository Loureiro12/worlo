import type { AvatarProps } from '@worlo/ui';
import { initialsOf } from '@worlo/ui';
import { FRIENDS } from '@/mocks/data.generated';

export const ME = 'me';

/**
 * Avatar props for a person by name. Colors cycle by their position in the
 * friends list (01_COMPONENTS → Avatares), so a person keeps the same color.
 */
export function avatarFor(name: string, photoUrl?: string | null): Omit<AvatarProps, 'size'> {
  if (name === ME) return { name, isMe: true, photoUrl };
  const index = FRIENDS.findIndex((f) => f.name === name);
  const friend = FRIENDS[index];
  return {
    name,
    initials: friend?.ini ?? initialsOf(name),
    colorIndex: Math.max(0, index),
    photoUrl,
  };
}

export function firstName(name: string): string {
  return name.split(' ')[0] ?? name;
}

/** "Marina", "Marina e João", "Ana, Caio e Bia" with the localized "and". */
export function joinNames(names: readonly string[], and: string): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} ${and} ${names[names.length - 1]}`;
}

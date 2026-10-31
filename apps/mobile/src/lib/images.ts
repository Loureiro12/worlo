/**
 * Placeholder photos (picsum, seeded so every screen shows the same image for
 * the same thing). Replace with real user/content photos when integrating.
 */
export function img(seed: string | number, width: number, height: number): string {
  const slug = String(seed)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-');
  return `https://picsum.photos/seed/worlo-${slug}/${width}/${height}`;
}

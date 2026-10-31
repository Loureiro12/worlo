import { formatMoney, matchesQuery } from './format';
import { img } from './images';
import { avatarFor, joinNames } from './people';

describe('lib helpers', () => {
  it('formats money the pt-BR way', () => {
    expect(formatMoney(4860)).toBe('R$ 4.860');
    expect(formatMoney(12.5, 'S/', 2)).toBe('S/ 12,50');
  });

  it('matches every word without accents', () => {
    expect(matchesQuery('Pastéis de Belém', 'pasteis belem')).toBe(true);
    expect(matchesQuery('Pastéis de Belém', 'pasteis porto')).toBe(false);
  });

  it('joins names with the localized "and"', () => {
    expect(joinNames(['Marina'], 'e')).toBe('Marina');
    expect(joinNames(['Ana', 'Caio', 'Bia'], 'e')).toBe('Ana, Caio e Bia');
  });

  it('keeps a stable avatar color per friend', () => {
    expect(avatarFor('João Pereira')).toMatchObject({ initials: 'JP', colorIndex: 1 });
    expect(avatarFor('me')).toMatchObject({ isMe: true });
  });

  it('builds seeded placeholder urls', () => {
    expect(img('Lisboa sem pressa', 400, 300)).toBe(
      'https://picsum.photos/seed/worlo-lisboa-sem-pressa/400/300',
    );
  });
});

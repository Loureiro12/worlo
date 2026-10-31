import { screen } from '@testing-library/react-native';
import { renderUi } from '../test-utils';
import { Globe } from './Globe';
import {
  angleDelta,
  buildPaths,
  countries,
  makeProjection,
  pickCountry,
  rotationFor,
  statusOf,
} from './geo';

describe('geo', () => {
  it('loads the 110m countries with ISO numeric ids', () => {
    const ids = countries().map((c) => c.id);
    expect(ids.length).toBeGreaterThan(170);
    expect(ids).toEqual(expect.arrayContaining(['076', '620', '392']));
  });

  it('picks the country under a point facing the viewer', () => {
    const rotation = rotationFor([-52, -11]);
    const projection = makeProjection({ rotation, radius: 180, cx: 195, cy: 250 });
    // The center of the disc is the point we rotated to: Brazil.
    expect(pickCountry(projection, rotation, 195, 250)?.id).toBe('076');
    // Far outside the sphere = nothing.
    expect(pickCountry(projection, rotation, 2, 2)).toBeNull();
  });

  it('resolves layer precedence like the prototype', () => {
    const layers = { visited: ['076'], planned: ['076', '604'], wishlist: ['604', '392'] };
    expect(statusOf('076', layers)).toBe('visited');
    expect(statusOf('604', layers)).toBe('planned');
    expect(statusOf('392', layers)).toBe('wishlist');
    expect(statusOf('250', layers)).toBe('none');
  });

  it('groups countries into one path per status', () => {
    const projection = makeProjection({
      rotation: rotationFor([-52, -11]),
      radius: 180,
      cx: 195,
      cy: 250,
    });
    const paths = buildPaths(projection, { visited: ['076'] }, '076');
    expect(paths.fills.visited.length).toBeGreaterThan(0);
    expect(paths.selected).toBe(paths.fills.visited);
    expect(paths.fills.wishlist).toBe('');
  });

  it('takes the shortest way around when rotating', () => {
    expect(angleDelta(170, -170)).toBe(20);
    expect(angleDelta(-170, 170)).toBe(-20);
  });
});

describe('Globe', () => {
  it('renders an accessible image', async () => {
    await renderUi(
      <Globe
        width={390}
        height={500}
        visited={['076', '620']}
        wishlist={['392']}
        accessibilityLabel="Seu mapa: 2 países"
      />,
    );
    expect(screen.getByLabelText('Seu mapa: 2 países')).toBeOnTheScreen();
  });
});

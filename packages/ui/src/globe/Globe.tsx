import {
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type GestureResponderEvent, PanResponder, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { palette } from '../tokens/colors';
import { fontFamily } from '../tokens/typography';
import {
  angleDelta,
  buildPaths,
  clampLat,
  clampZoom,
  countryById,
  type GlobeLayers,
  isFacing,
  type LonLat,
  makeProjection,
  pickCountry,
  rotationFor,
} from './geo';

export type GlobeCity = { name: string; coordinates: LonLat; photos?: number };

export type GlobeHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  recenter: () => void;
  /** Rotate smoothly until the country faces the viewer. */
  focusCountry: (id: string) => void;
};

export type GlobeProps = GlobeLayers & {
  width: number;
  height: number;
  selected?: string | null;
  /** Degrees per frame (60fps). 0 disables auto-rotation. */
  autoRotate?: number;
  /**
   * Stops every animation (auto-rotation, inertia, pulse). Screens pass it when
   * they are not visible: tab screens stay mounted, and a spinning globe there
   * redraws the whole world on the JS thread behind every other screen.
   */
  paused?: boolean;
  initialRotation?: LonLat;
  /** Multiplies the base radius (0.46 × min(width, height)). */
  scale?: number;
  /** Vertical offset of the center; animated (map sheet pushes it up by 150). */
  offsetY?: number;
  markers?: boolean;
  /** Shown from zoom 1.6; photo pills from zoom 2.3. */
  cities?: readonly GlobeCity[];
  photosLabel?: (count: number) => string;
  glow?: boolean;
  /** 'light' on the Mapa tab; 'dark' (carvão) elsewhere. */
  theme?: GlobeTheme;
  /** Pulsing coral ring on a country until the first tap (onboarding). */
  pulse?: string | null;
  interactive?: boolean;
  onPickCountry?: (id: string, name: string) => void;
  centerOnPick?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  ref?: Ref<GlobeHandle>;
};

/** Carvão globe (onboarding, perfil) and the light one of the Mapa tab. */
const THEMES = {
  dark: {
    ocean: palette.globoOceano,
    graticule: 'rgba(255,253,252,0.05)',
    none: palette.cinza800,
    wishlist: palette.cinza600,
    planned: palette.linha,
    visited: palette.coral,
    border: palette.globoOceano,
    outline: 'rgba(255,253,252,0.75)',
    selected: palette.branco,
    city: palette.branco,
    shadeLight: 0.1,
    shadeDark: 0.5,
  },
  light: {
    ocean: palette.globoOceanoClaro,
    graticule: 'rgba(19,19,17,0.05)',
    none: palette.branco,
    wishlist: palette.cinza600,
    planned: palette.linha,
    visited: palette.coral,
    border: palette.linha,
    outline: 'rgba(19,19,17,0.55)',
    selected: palette.carvao,
    city: palette.carvao,
    shadeLight: 0.35,
    shadeDark: 0.12,
  },
} as const;
export type GlobeTheme = keyof typeof THEMES;

// Animations are pointless (and noisy) under Jest; read on each use so a test can turn them on.
const animates = () => process.env.NODE_ENV !== 'test';

type Motion = {
  rotation: LonLat;
  velocity: LonLat;
  zoom: number;
  target: LonLat | null;
  offsetY: number;
  dragging: boolean;
};

/**
 * Orthographic globe (02_SCREENS / 01_COMPONENTS → Globo 3D): drag with inertia
 * (×0.94), pinch zoom 0.8–4.5×, tap to pick a country, slow auto-rotation.
 */
export function Globe({
  width,
  height,
  visited,
  planned,
  wishlist,
  selected = null,
  autoRotate = 0,
  paused = false,
  initialRotation = [30, -15],
  scale = 1,
  offsetY = 0,
  markers = true,
  cities,
  photosLabel = (n) => `${n}`,
  glow = true,
  theme = 'dark',
  pulse = null,
  interactive = true,
  onPickCountry,
  centerOnPick = false,
  accessibilityLabel,
  testID,
  ref,
}: GlobeProps) {
  const look = THEMES[theme];
  const motion = useRef<Motion>({
    rotation: [...initialRotation] as LonLat,
    velocity: [0, 0],
    zoom: 1,
    target: null,
    offsetY,
    dragging: false,
  });
  const [, setFrame] = useState(0);
  const raf = useRef<number | null>(null);
  const pulsePhase = useRef(0);
  /** Idle auto-rotation renders every other frame (30fps) to spare the JS thread. */
  const idleFrame = useRef(false);
  const props = useRef({ autoRotate, offsetY, pulse, paused });
  props.current = { autoRotate, offsetY, pulse, paused };

  const step = useCallback(() => {
    raf.current = null;
    const m = motion.current;
    const p = props.current;
    if (p.paused) return;
    let busy = false;
    if (!m.dragging) {
      if (m.target) {
        const d0 = angleDelta(m.rotation[0], m.target[0]);
        const d1 = m.target[1] - m.rotation[1];
        m.rotation = [m.rotation[0] + d0 * 0.09, m.rotation[1] + d1 * 0.09];
        if (Math.abs(d0) < 0.1 && Math.abs(d1) < 0.1) m.target = null;
        busy = true;
      } else if (Math.abs(m.velocity[0]) + Math.abs(m.velocity[1]) > 0.02) {
        m.rotation = [m.rotation[0] + m.velocity[0], clampLat(m.rotation[1] + m.velocity[1])];
        m.velocity = [m.velocity[0] * 0.94, m.velocity[1] * 0.94];
        busy = true;
      } else if (p.autoRotate) {
        idleFrame.current = !idleFrame.current;
        if (idleFrame.current && !p.pulse) {
          schedule();
          return;
        }
        m.rotation = [m.rotation[0] + p.autoRotate * 2, m.rotation[1]];
        busy = true;
      }
    }
    if (Math.abs(p.offsetY - m.offsetY) > 0.5) {
      m.offsetY += (p.offsetY - m.offsetY) * 0.12;
      busy = true;
    } else {
      m.offsetY = p.offsetY;
    }
    if (p.pulse) {
      pulsePhase.current = (pulsePhase.current + 16 / 1400) % 1;
      busy = true;
    }
    setFrame((f) => f + 1);
    if (busy || m.dragging) schedule();
  }, []);

  const schedule = useCallback(() => {
    if (!animates() || raf.current !== null || props.current.paused) return;
    raf.current = requestAnimationFrame(step);
  }, [step]);

  useEffect(() => {
    schedule();
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      raf.current = null;
    };
  }, [schedule]);

  // Restart the loop whenever something animatable changes; stop it when paused.
  useEffect(() => {
    if (paused) {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      raf.current = null;
      return;
    }
    schedule();
  }, [autoRotate, offsetY, pulse, paused, schedule]);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => {
        motion.current.zoom = clampZoom(motion.current.zoom * 1.5);
        setFrame((f) => f + 1);
      },
      zoomOut: () => {
        motion.current.zoom = clampZoom(motion.current.zoom / 1.5);
        setFrame((f) => f + 1);
      },
      recenter: () => {
        motion.current.zoom = 1;
        motion.current.target = [...initialRotation] as LonLat;
        schedule();
        setFrame((f) => f + 1);
      },
      focusCountry: (id: string) => {
        const country = countryById(id);
        if (!country) return;
        motion.current.target = rotationFor(country.centroid);
        schedule();
      },
    }),
    [initialRotation, schedule],
  );

  const baseRadius = Math.min(width, height) * 0.46 * scale;
  const m = motion.current;
  const radius = baseRadius * m.zoom;
  const cx = width / 2;
  const cy = height / 2 + m.offsetY;
  const projection = makeProjection({ rotation: m.rotation, radius, cx, cy });
  // Country paths are the expensive part (~177 shapes). Rebuild them only when
  // the camera or the layers change — not on frames that only move the pulse.
  const cameraKey = `${m.rotation[0].toFixed(2)}|${m.rotation[1].toFixed(2)}|${radius.toFixed(1)}|${cy.toFixed(1)}|${cx}`;
  const layersKey = `${visited?.join()}|${planned?.join()}|${wishlist?.join()}|${selected}`;
  const pathsCache = useRef<{ key: string; paths: ReturnType<typeof buildPaths> } | null>(null);
  const pathsKey = `${cameraKey}#${layersKey}`;
  if (pathsCache.current?.key !== pathsKey) {
    pathsCache.current = {
      key: pathsKey,
      paths: buildPaths(projection, { visited, planned, wishlist }, selected),
    };
  }
  const paths = pathsCache.current.paths;

  const gesture = useRef({
    x: 0,
    y: 0,
    lastX: 0,
    lastY: 0,
    moved: 0,
    pinch: 0,
    zoom0: 1,
    rot0: [0, 0] as LonLat,
  });
  const onPick = useRef(onPickCountry);
  onPick.current = onPickCountry;
  const pickOptions = useRef({ centerOnPick, width, height, baseRadius });
  pickOptions.current = { centerOnPick, width, height, baseRadius };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => interactive,
        onMoveShouldSetPanResponder: () => interactive,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          const { locationX, locationY } = e.nativeEvent;
          const g = gesture.current;
          Object.assign(g, {
            x: locationX,
            y: locationY,
            lastX: locationX,
            lastY: locationY,
            moved: 0,
            pinch: 0,
            rot0: [...motion.current.rotation] as LonLat,
          });
          motion.current.dragging = true;
          motion.current.target = null;
          motion.current.velocity = [0, 0];
          schedule();
        },
        onPanResponderMove: (e, state) => {
          const g = gesture.current;
          const mm = motion.current;
          const touches = e.nativeEvent.touches;
          if (touches.length >= 2) {
            const [a, b] = touches;
            const distance = Math.hypot(
              (a?.pageX ?? 0) - (b?.pageX ?? 0),
              (a?.pageY ?? 0) - (b?.pageY ?? 0),
            );
            if (!g.pinch) {
              g.pinch = distance;
              g.zoom0 = mm.zoom;
            } else {
              mm.zoom = clampZoom(g.zoom0 * (distance / g.pinch));
            }
            g.moved = 99;
            return;
          }
          const sensitivity = 0.3 / mm.zoom;
          g.moved = Math.max(g.moved, Math.abs(state.dx), Math.abs(state.dy));
          mm.rotation = [
            g.rot0[0] + state.dx * sensitivity,
            clampLat(g.rot0[1] - state.dy * sensitivity),
          ];
          const x = g.x + state.dx;
          const y = g.y + state.dy;
          mm.velocity = [(x - g.lastX) * sensitivity, -(y - g.lastY) * sensitivity];
          g.lastX = x;
          g.lastY = y;
        },
        onPanResponderRelease: () => {
          const g = gesture.current;
          const mm = motion.current;
          mm.dragging = false;
          if (g.moved >= 5) {
            schedule();
            return;
          }
          mm.velocity = [0, 0];
          const opts = pickOptions.current;
          const proj = makeProjection({
            rotation: mm.rotation,
            radius: opts.baseRadius * mm.zoom,
            cx: opts.width / 2,
            cy: opts.height / 2 + mm.offsetY,
          });
          const country = pickCountry(proj, mm.rotation, g.x, g.y);
          if (country && onPick.current) {
            onPick.current(country.id, country.properties.name);
            if (opts.centerOnPick) mm.target = rotationFor(country.centroid);
          }
          schedule();
        },
        onPanResponderTerminate: () => {
          motion.current.dragging = false;
        },
      }),
    [interactive, schedule],
  );

  const facing = (point: LonLat) => isFacing(point, m.rotation);
  const showCities = Boolean(cities) && m.zoom > 1.6;
  const markerFor = (id: string, kind: 'visited' | 'planned' | 'wishlist') => {
    const country = countryById(id);
    if (!country || !facing(country.centroid)) return null;
    const [x, y] = projection(country.centroid) ?? [0, 0];
    return <Marker key={`${kind}-${id}`} x={x} y={y} kind={kind} />;
  };
  const pulseCountry = pulse ? countryById(pulse) : undefined;
  const pulsePoint =
    pulseCountry && facing(pulseCountry.centroid) ? projection(pulseCountry.centroid) : null;
  const phase = pulsePhase.current;

  return (
    <View
      testID={testID}
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{ width, height }}
      {...responder.panHandlers}
    >
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient
            id="glow"
            cx={cx}
            cy={cy}
            r={radius * 1.32}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset={0.68} stopColor={palette.coral} stopOpacity={0.22} />
            <Stop offset={1} stopColor={palette.coral} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient
            id="shade"
            cx={cx}
            cy={cy}
            fx={cx - radius * 0.4}
            fy={cy - radius * 0.45}
            r={radius * 1.02}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset={0} stopColor={palette.branco} stopOpacity={look.shadeLight} />
            <Stop offset={0.55} stopColor={palette.carvao} stopOpacity={0} />
            <Stop offset={1} stopColor={palette.carvao} stopOpacity={look.shadeDark} />
          </RadialGradient>
        </Defs>
        {glow ? <Rect x={0} y={0} width={width} height={height} fill="url(#glow)" /> : null}
        <Path d={paths.sphere} fill={look.ocean} />
        <Path d={paths.graticule} stroke={look.graticule} strokeWidth={0.6} fill="none" />
        <Path d={paths.fills.none} fill={look.none} />
        <Path d={paths.fills.wishlist} fill={look.wishlist} />
        <Path d={paths.fills.planned} fill={look.planned} />
        <Path d={paths.fills.visited} fill={look.visited} />
        <Path d={paths.borders} stroke={look.border} strokeWidth={0.6} fill="none" />
        {paths.wishlistOutline ? (
          <Path
            d={paths.wishlistOutline}
            stroke={look.outline}
            strokeWidth={1}
            strokeDasharray="3,2"
            fill="none"
          />
        ) : null}
        {paths.selected ? (
          <Path d={paths.selected} stroke={look.selected} strokeWidth={2} fill="none" />
        ) : null}
        <Path d={paths.sphere} fill="url(#shade)" />
        {showCities
          ? cities?.map((city) => {
              if (!facing(city.coordinates)) return null;
              const [x, y] = projection(city.coordinates) ?? [0, 0];
              const label = city.photos && m.zoom > 2.3 ? photosLabel(city.photos) : null;
              return (
                <G key={city.name}>
                  <Circle cx={x} cy={y} r={3} fill={look.city} />
                  <SvgText
                    x={x + 7}
                    y={y + 4}
                    fill={look.city}
                    fontSize={11}
                    fontFamily={fontFamily.ui600}
                  >
                    {city.name}
                  </SvgText>
                  {label ? (
                    <G>
                      <Rect
                        x={x + 6}
                        y={y + 8}
                        width={label.length * 6.4 + 14}
                        height={20}
                        rx={10}
                        fill={palette.coral}
                      />
                      <SvgText
                        x={x + 13}
                        y={y + 22}
                        fill={palette.carvao}
                        fontSize={11}
                        fontFamily={fontFamily.ui700}
                      >
                        {label}
                      </SvgText>
                    </G>
                  ) : null}
                </G>
              );
            })
          : null}
        {markers && !showCities ? (
          <G>
            {wishlist?.map((id) => markerFor(id, 'wishlist'))}
            {planned?.map((id) => markerFor(id, 'planned'))}
            {visited?.map((id) => markerFor(id, 'visited'))}
          </G>
        ) : null}
        {pulsePoint ? (
          <G>
            <Circle
              cx={pulsePoint[0]}
              cy={pulsePoint[1]}
              r={8 + phase * 28}
              stroke={palette.coral}
              strokeOpacity={1 - phase}
              strokeWidth={2}
              fill="none"
            />
            <Circle cx={pulsePoint[0]} cy={pulsePoint[1]} r={5} fill={palette.coral} />
          </G>
        ) : null}
      </Svg>
    </View>
  );
}

function Marker({
  x,
  y,
  kind,
}: {
  x: number;
  y: number;
  kind: 'visited' | 'planned' | 'wishlist';
}) {
  if (kind === 'visited') {
    return (
      <G>
        <Circle
          cx={x}
          cy={y}
          r={7}
          fill={palette.coral}
          stroke={palette.branco}
          strokeWidth={1.5}
        />
        <Path
          d={`M${x - 3} ${y} L${x - 0.8} ${y + 2.4} L${x + 3.2} ${y - 2.4}`}
          stroke={palette.carvao}
          strokeWidth={1.8}
          fill="none"
        />
      </G>
    );
  }
  if (kind === 'planned') {
    return (
      <G>
        <Rect
          x={x - 6}
          y={y - 6}
          width={12}
          height={12}
          fill={palette.carvao}
          stroke={palette.branco}
          strokeWidth={1.5}
        />
        <Path
          d={`M${x - 3} ${y} H${x + 3} M${x} ${y - 3} V${y + 3}`}
          stroke={palette.branco}
          strokeWidth={1.5}
        />
      </G>
    );
  }
  return (
    <Path
      d={`M${x} ${y - 7} L${x + 7} ${y} L${x} ${y + 7} L${x - 7} ${y} Z`}
      fill={palette.carvao}
      stroke={palette.branco}
      strokeWidth={1.5}
    />
  );
}

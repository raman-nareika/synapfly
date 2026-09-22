import { matchFont, Skia } from '@shopify/react-native-skia';
import { Platform } from 'react-native';

export type TextOptions = {
  size?: number;
  weight?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  mono?: boolean;
};

export type Painter = {
  reset: () => void;
  alpha: (a: number) => void;
  rect: (x: number, y: number, w: number, h: number, color: string) => void;
  strokeRect: (x: number, y: number, w: number, h: number, color: string, width?: number) => void;
  circle: (x: number, y: number, r: number, color: string) => void;
  ring: (x: number, y: number, r: number, color: string, width?: number, dash?: number[]) => void;
  ellipse: (x: number, y: number, rx: number, ry: number, rot: number, color: string) => void;
  polyline: (pts: number[], color: string, width?: number) => void;
  text: (str: string, x: number, y: number, options?: TextOptions) => void;
  measure: (str: string, options?: TextOptions) => number;
  push: () => void;
  pop: () => void;
  translate: (x: number, y: number) => void;
  rotate: (r: number) => void;
  scale: (s: number) => void;
};

const fontCache = new Map<string, any>();

function fontFor(size: number, mono: boolean, weight: number) {
  const family = Platform.select({
    ios: mono ? 'Menlo' : 'Helvetica',
    android: mono ? 'monospace' : 'sans-serif',
    default: mono ? 'monospace' : 'sans-serif'
  }) ?? 'sans-serif';
  const key = `${family}:${size}:${weight}`;
  const existing = fontCache.get(key);
  if (existing) return existing;
  const font = matchFont({ fontFamily: family, fontSize: size, fontWeight: weight as any });
  fontCache.set(key, font);
  return font;
}

// Paint objects are canvas-independent, so the cache is created once per
// screen (not per frame) and passed in here -- only the canvas-binding
// closures below are cheap enough to recreate every frame.
export function createPaintCache() {
  return new Map<string, any>();
}

export function createSkiaPainter(canvas: any, cache: Map<string, any> = new Map()): Painter {
  const paintFor = (color: string, a: number) => {
    const key = `${color}|${a}`;
    let paint = cache.get(key);
    if (!paint) {
      paint = Skia.Paint();
      paint.setColor(Skia.Color(color));
      cache.set(key, paint);
    }
    paint.setAlphaf(a);
    return paint;
  };

  let alpha = 1;
  return {
    reset() { alpha = 1; },
    alpha(a) { alpha = a; },
    rect(x, y, w, h, color) {
      canvas.drawRect({ x, y, width: w, height: h }, paintFor(color, alpha));
    },
    strokeRect(x, y, w, h, color, width = 1) {
      const p = paintFor(color, alpha);
      p.setStyle(1);
      p.setStrokeWidth(width);
      canvas.drawRect({ x, y, width: w, height: h }, p);
      p.setStyle(0);
    },
    circle(x, y, r, color) { canvas.drawCircle(x, y, r, paintFor(color, alpha)); },
    ring(x, y, r, color, width = 1) {
      const p = paintFor(color, alpha);
      p.setStyle(1);
      p.setStrokeWidth(width);
      canvas.drawCircle(x, y, r, p);
      p.setStyle(0);
    },
    ellipse(x, y, rx, ry, rot, color) {
      canvas.save();
      canvas.translate(x, y);
      canvas.rotate((rot * 180) / Math.PI, 0, 0);
      canvas.drawOval({ x: -rx, y: -ry, width: rx * 2, height: ry * 2 }, paintFor(color, alpha));
      canvas.restore();
    },
    polyline(pts, color, width = 1) {
      const p = paintFor(color, alpha);
      p.setStyle(1);
      p.setStrokeWidth(width);
      p.setStrokeCap(1);
      for (let i = 0; i + 3 < pts.length; i += 2) {
        canvas.drawLine(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], p);
      }
      p.setStyle(0);
    },
    text(str, x, y, { size = 12, weight = 700, color = '#fff', align = 'left', mono = false } = {}) {
      const font = fontFor(size, mono, weight);
      const width = font.measureText(str).width;
      const dx = align === 'center' ? -width / 2 : align === 'right' ? -width : 0;
      canvas.drawText(str, x + dx, y, paintFor(color, alpha), font);
    },
    measure(str, { size = 12, weight = 700, mono = false } = {}) {
      return fontFor(size, mono, weight).measureText(str).width;
    },
    push() { canvas.save(); },
    pop() { canvas.restore(); },
    translate(x, y) { canvas.translate(x, y); },
    rotate(r) { canvas.rotate((r * 180) / Math.PI, 0, 0); },
    scale(s) { canvas.scale(s, s); }
  };
}

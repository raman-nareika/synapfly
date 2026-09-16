import type { GameInstance, FlyPose } from '../engine';
import type { GameTheme } from '../../theme/themes';
import type { Painter } from './painters';

const ink = (theme: GameTheme, alpha: number) => `rgba(${theme.inkRGB},${alpha})`;

type DrawOptions = { neuralView?: boolean; hideGameOver?: boolean };

export function drawFrame(
  P: Painter,
  game: GameInstance,
  T: GameTheme,
  t: number,
  opts: DrawOptions = {}
) {
  const S = game.state;
  const { W, H, BAND } = game.dims;
  P.reset();
  P.rect(0, 0, W, H, T.bg);

  // Minimal MVP parallax/grid. Art assets can replace this without touching physics.
  const grid = (step: number, offset: number, color: string, y0: number, y1: number) => {
    for (let x = -(offset % step); x < W; x += step) P.polyline([x, y0, x, y1], color, 1);
  };
  grid(48, S.cam.x, ink(T, 0.045), 0, H);
  for (let y = 0; y < H; y += 48) P.polyline([0, y, W, y], ink(T, 0.045), 1);
  grid(190, S.cam.x * 0.35, ink(T, 0.07), BAND, H - BAND);

  P.rect(0, 0, W, BAND, T.band);
  P.rect(0, H - BAND, W, BAND, T.band);
  P.rect(0, BAND - 2, W, 2, T.accent);
  P.rect(0, H - BAND, W, 2, T.accent);

  for (const o of S.obs) {
    const x = o.x - S.cam.x;
    if (x > W + 20 || x + o.w < -20) continue;
    P.rect(x, o.y, o.w, o.h, T.obs);
    P.strokeRect(x, o.y, o.w, o.h, T.edge, 1);
    const landingY = o.anchor === 'ceil' ? o.y + o.h : o.y;
    P.polyline([x, landingY, x + o.w, landingY], T.accent, 3);
    P.polyline([x + 1.5, o.y, x + 1.5, o.y + o.h], T.accent, 2);
    P.polyline([x + o.w - 1.5, o.y, x + o.w - 1.5, o.y + o.h], T.accent, 2);
  }

  drawFly(P, S.fly.x - S.cam.x, S.fly.y, game.rotation(), game.pose(), t, T, 1.45, S.wing);
  drawHud(P, game, T);

  if (S.event) {
    const alpha = Math.min(1, S.event.ttl * 1.6);
    const color = S.event.type === 'hit' ? T.bad : S.event.type === 'panic' ? T.warn : T.accent;
    const text = S.event.type === 'hit' ? `${S.event.text}  ${S.event.impact ?? 0} px/s` : S.event.text;
    P.alpha(alpha);
    P.text(text, W / 2, H * 0.82, { size: 16, color, align: 'center' });
    P.alpha(1);
  }

  if (S.dmgFlash > 0) {
    P.alpha(S.dmgFlash * 0.7);
    P.strokeRect(3, 3, W - 6, H - 6, T.bad, 6);
    P.alpha(1);
  }

  if (S.fly.mode === 'idle') {
    P.text('TAP TO FLY', W / 2, H / 2 + 60, { size: 14, color: ink(T, 0.72), align: 'center' });
    P.text('QUICK TAPS = SPEED   HOLD = BRAKE', W / 2, H / 2 + 80, {
      size: 9,
      color: ink(T, 0.42),
      align: 'center',
      mono: true
    });
  }

  if (opts.neuralView) drawNeural(P, S.neuro, game, T);
  if (S.over && !opts.hideGameOver) drawGameOver(P, S.over, W, H, T);
}

export function drawFly(
  P: Painter,
  x: number,
  y: number,
  rot: number,
  pose: FlyPose,
  t: number,
  T: GameTheme,
  scale = 1.45,
  wingPhase?: number
) {
  const flying = pose === 'cruise' || pose === 'ready';
  const contactY = 5.6;
  P.push();
  P.translate(x, y);
  P.rotate(rot);
  P.scale(scale);

  const wing = flying ? Math.sin(wingPhase ?? t * 26) : 0;
  for (const k of [0, 1]) {
    P.push();
    P.translate(-1, -2.4);
    P.rotate((flying ? -0.5 - wing * 0.5 : -0.12) - k * 0.22);
    P.ellipse(-4.5, 0, 8.5, flying ? 2.6 : 2, 0, 'rgba(130,195,205,.38)');
    P.pop();
  }

  const legColor = pose === 'danger' ? T.warn : ink(T, 0.85);
  const step = pose === 'danger' ? Math.sin(t * 13) : 0;
  for (let i = 0; i < 3; i += 1) {
    const hipX = 2.6 - i * 2.4;
    const hipY = 1.8;
    let kx: number;
    let ky: number;
    let tx: number;
    let ty: number;
    if (pose === 'cruise') {
      kx = hipX - 1.4; ky = hipY + 1.2; tx = hipX - 3.2; ty = hipY + 1.6;
    } else if (pose === 'ready') {
      kx = hipX + 1.6; ky = hipY + 2.6; tx = hipX + 2.8 - i * 0.5; ty = contactY + 3.2;
    } else {
      const phase = pose === 'danger' ? step * (i % 2 ? 1 : -1) : 0;
      kx = hipX + 1.8 + phase * 0.9;
      ky = hipY + 1.6;
      tx = hipX + 3.2 + phase * 2.2;
      ty = contactY - Math.max(0, phase) * 2.2;
    }
    P.polyline([hipX, hipY, kx, ky, tx, ty], legColor, 1.3);
    if (pose === 'attach' || pose === 'danger') P.circle(tx, ty, 1, T.accent);
  }

  P.ellipse(-1.2, 0, 5.6, 3.5, 0, T.ink);
  P.ellipse(3.6, 0, 2.6, 2.5, 0, T.ink);
  P.circle(4.6, -0.9, 1.7, T.bad);
  P.pop();

  if (pose === 'danger') {
    P.alpha(0.35 + Math.abs(Math.sin(t * 6)) * 0.5);
    P.ring(x, y, 15 * scale + Math.sin(t * 6) * 2.5, T.warn, 1.2);
    P.alpha(1);
  } else if (pose === 'ready') {
    P.alpha(0.45);
    P.ring(x, y, 13 * scale, T.accent, 1);
    P.alpha(1);
  }
}

function drawHud(P: Painter, game: GameInstance, T: GameTheme) {
  const S = game.state;
  const { W, H } = game.dims;
  const hp = Math.max(0, S.fly.hp);
  const height = 58;
  P.alpha(0.92);
  P.rect(0, 0, W, height, T.band);
  P.alpha(1);
  P.rect(0, height - 3, W, 3, T.accent);

  const hpColor = hp > 55 ? T.accent : hp > 25 ? T.warn : T.bad;
  P.text('HP', 22, 21, { size: 10, color: ink(T, 0.5) });
  P.text(String(Math.round(hp)), 22, 47, { size: 30, color: T.ink });

  const segments = 10;
  const bx = 78;
  const bw = 150;
  const sw = (bw - (segments - 1) * 3) / segments;
  const filled = Math.ceil((hp / 100) * segments);
  for (let i = 0; i < segments; i += 1) {
    P.rect(bx + i * (sw + 3), 20, sw, 11, i < filled ? hpColor : ink(T, 0.14));
  }
  P.text(`AIR SPEED  ${Math.round(S.fly.vx)}`, bx, 46, { size: 10, color: ink(T, 0.5) });
  P.text(String(Math.round(S.score)), W - 22, 44, { size: 40, color: T.ink, align: 'right' });

  if (S.mult > 1) {
    const text = `×${S.mult}`;
    const w = P.measure(text, { size: 17 }) + 16;
    P.rect(W - 22 - w, 8, w, 24, T.accent);
    P.text(text, W - 22 - w / 2, 25, { size: 17, color: T.band, align: 'center' });
  }

  if (S.att) {
    P.text(`SITTING ${S.sit.toFixed(1)}s   HP +${S.healRate}/s`, W / 2, H * 0.74, {
      size: 13,
      color: T.accent,
      align: 'center'
    });
    if (game.pose() === 'danger') {
      P.text('CRAWLING — ESCAPE WINDOW CLOSING', W / 2, H * 0.83, {
        size: 11,
        color: T.warn,
        align: 'center',
        mono: true
      });
    }
  }
}

function drawGameOver(P: Painter, over: NonNullable<GameInstance['state']['over']>, W: number, H: number, T: GameTheme) {
  P.alpha(0.9);
  P.rect(0, 0, W, H, T.band);
  P.alpha(1);
  const plateW = Math.min(W - 80, 300);
  P.rect((W - plateW) / 2, H * 0.17, plateW, 46, T.bad);
  P.text('CRASHED', W / 2, H * 0.17 + 33, { size: 26, color: T.band, align: 'center' });
  P.text(String(over.score), W / 2, H * 0.52, { size: 64, color: T.accent, align: 'center' });
  P.text(over.reason, W / 2, H * 0.6, { size: 11, color: ink(T, 0.6), align: 'center', mono: true });
}

function drawNeural(P: Painter, n: GameInstance['state']['neuro'], game: GameInstance, T: GameTheme) {
  const { H } = game.dims;
  const rows: Array<[string, number]> = [
    ['LC4', n.lc4],
    ['LPLC2', n.lplc2],
    ['DNp01', n.dnp01],
    ['DNp07', n.dnp07],
    ['DNp10', n.dnp10]
  ];
  const x = 18;
  const y = H - 148;
  const w = 176;
  const h = 112;
  P.alpha(0.82);
  P.rect(x, y, w, h, T.band);
  P.alpha(1);
  P.strokeRect(x, y, w, h, ink(T, 0.1), 1);
  P.text('NEURAL VIEW · MALECNS', x + 10, y + 15, { size: 9, color: ink(T, 0.42), mono: true });

  rows.forEach(([name, value], index) => {
    const rowY = y + 30 + index * 16;
    P.text(name, x + 10, rowY + 7, { size: 9, color: ink(T, 0.6), mono: true });
    const barX = x + 58;
    const barW = 104;
    const cells = 13;
    for (let cell = 0; cell < cells; cell += 1) {
      const on = value * cells > cell;
      P.alpha(on ? 0.35 + value * 0.65 : 1);
      P.rect(
        barX + cell * (barW / cells),
        rowY,
        barW / cells - 2,
        7,
        on ? (index < 3 ? T.bad : T.accent) : ink(T, 0.08)
      );
    }
    P.alpha(1);
  });
}

export type Face = 'top' | 'bottom' | 'left' | 'right';
export type Anchor = 'ceil' | 'floor';
export type FlyMode = 'idle' | 'flying' | 'attached';
export type FlyPose = 'cruise' | 'ready' | 'attach' | 'danger';
export type PanicMode = 'penalty' | 'fatal';

export type Obstacle = {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  anchor: Anchor;
  boundary?: boolean;
};

export type GameStats = {
  landings: number;
  perfect: number;
  bestMult: number;
  panics: number;
  panicHpLost: number;
  panicNetPenalty: number;
  topSpeed: number;
  longestSit: number;
};

export type GameOverPayload = {
  reason: string;
  score: number;
  stats: GameStats;
};

type EventType = 'attach' | 'detach' | 'panic' | 'hit';
type GameEvent = {
  id: number;
  type: EventType;
  text: string;
  ttl: number;
  impact?: number;
};

type Attachment = {
  o: Obstacle;
  face: Face;
  t: number;
};

type LastSurface = {
  obstacleId: number;
  face: Face;
  // Sticky: once the fly gets far enough from this face, stays true even if it
  // drifts back close again (distance requirement is a one-time achievement,
  // not a live measurement -- see isReattachBlocked/updateReattachClearance).
  cleared: boolean;
};

type FlyState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  mode: FlyMode;
  pitch: number;
};

type GameState = {
  fly: FlyState;
  cam: { x: number; vx: number };
  obs: Obstacle[];
  nextX: number;
  obId: number;
  score: number;
  mult: number;
  healRate: number;
  sit: number;
  hpAtLanding: number;
  att: Attachment | null;
  lastSurf: LastSurface | null;
  sinceDetach: number;
  wing: number;
  event: GameEvent | null;
  eventSeq: number;
  dmgFlash: number;
  over: GameOverPayload | null;
  t: number;
  stats: GameStats;
  neuro: { lc4: number; lplc2: number; dnp01: number; dnp07: number; dnp10: number };
  input: { down: boolean; heldFor: number; consumedUntilRelease: boolean };
  // Obstacle ids already damaged this step(), so a grazing hit spanning
  // several substeps only deals damage/emits once per rendered frame.
  hitThisStep: Set<number>;
};

export const CONST = {
  GRAVITY: 1500,
  FLAP_VY: -365,
  FLAP_VX: 22,
  HOLD_THRESHOLD: 0.12,
  HOLD_BRAKE_X: 150,
  HOLD_LIFT: 760,
  VY_MIN: -470,
  VX_MIN: 92,
  VX_MAX: 330,
  DRAG_VX: 16,
  MAX_HP: 100,
  MIN_HIT_DAMAGE: 10,
  REATTACH_DELAY: 0.14,
  REATTACH_DISTANCE: 18,
  MIN_APPROACH_SPEED: 12,
  LAND_IMPACT_MAX: 165,
  LAND_TANGENT_MAX: 185,
  PANIC_ZONE: 0.34,
  PANIC_TRIGGER: 0.11,
  CRAWL_FACTOR: 0.46,
  DETACH_OFFSET: 7,
  DETACH_PUSH_X: 26,
  DETACH_FALL_VY: 115,
  DETACH_RISE_VY: -145,
  HEAL_TIERS: [
    [0, 2, 1],
    [2.2, 4, 2],
    [4.6, 7, 3],
    [7.5, 10, 5]
  ] as const,
  SCORE_PER_SEC_SITTING: 26,
  SCORE_ATTACH: 60,
  BAND: 32,
  FLY_RADIUS: 7
} as const;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const faceKey = (obstacleId: number, face: Face) => `${obstacleId}:${face}`;

export function calculatePanicTargetHp(
  hpBeforeLanding: number,
  minHitDamage = CONST.MIN_HIT_DAMAGE,
  randomValue = Math.random()
) {
  const hpB = clamp(hpBeforeLanding, 1, CONST.MAX_HP);
  if (hpB <= 1) return 1;

  const k = hpB / CONST.MAX_HP;
  const minRate = 0.16 + 0.09 * k;
  const maxRate = 0.27 + 0.13 * k;
  const rate = minRate + clamp(randomValue, 0, 1) * (maxRate - minRate);
  let target = Math.round(hpB - hpB * rate);

  // Panic must always be a net loss versus HP at landing.
  target = Math.min(target, hpB - 1);

  if (hpB > minHitDamage) {
    // Keep > MIN_HIT_DAMAGE only when mathematically possible while still losing HP.
    target = hpB >= minHitDamage + 2
      ? Math.max(minHitDamage + 1, target)
      : minHitDamage;
  } else {
    target = Math.min(minHitDamage - 1, target);
  }

  return Math.max(1, target);
}

export function calculateImpactDamage(impactSpeed: number) {
  const impact = Math.max(0, impactSpeed);
  const excess = Math.max(0, impact - 100);
  return Math.min(100, CONST.MIN_HIT_DAMAGE + Math.pow(excess / 70, 1.45) * 8);
}

export type CreateGameOptions = {
  width: number;
  height: number;
  panicMode?: PanicMode;
  landingForgiveness?: number;
  rng?: () => number;
};

export function createGame({
  width,
  height,
  panicMode = 'penalty',
  landingForgiveness = 1,
  rng = Math.random
}: CreateGameOptions) {
  const C = CONST;
  const W = width;
  const H = height;
  const BAND = C.BAND;
  const R = C.FLY_RADIUS;
  const A = H - 2 * BAND;
  const HUGE = 100_000_000;
  const ceilingBoundary: Obstacle = {
    id: -1,
    x: -HUGE,
    y: -HUGE,
    w: HUGE * 2,
    h: HUGE + BAND,
    anchor: 'ceil',
    boundary: true
  };
  const floorBoundary: Obstacle = {
    id: -2,
    x: -HUGE,
    y: H - BAND,
    w: HUGE * 2,
    h: HUGE,
    anchor: 'floor',
    boundary: true
  };

  let opts = { panicMode, landingForgiveness };
  let collidersCache: Obstacle[] = [];
  let collidersCacheSrc: Obstacle[] | null = null;
  let S: GameState;

  const randomBetween = (a: number, b: number) => a + rng() * (b - a);

  function emit(type: EventType, text: string, ttl: number, impact?: number) {
    S.eventSeq += 1;
    S.event = { id: S.eventSeq, type, text, ttl, impact };
  }

  function reset() {
    S = {
      fly: { x: W * 0.32, y: H * 0.45, vx: 130, vy: 0, hp: C.MAX_HP, mode: 'idle', pitch: 0 },
      cam: { x: 0, vx: 130 },
      obs: [],
      nextX: W * 1.05,
      obId: 0,
      score: 0,
      mult: 1,
      healRate: 0,
      sit: 0,
      hpAtLanding: C.MAX_HP,
      att: null,
      lastSurf: null,
      sinceDetach: 999,
      wing: 0,
      event: null,
      eventSeq: 0,
      dmgFlash: 0,
      over: null,
      t: 0,
      stats: {
        landings: 0,
        perfect: 0,
        bestMult: 1,
        panics: 0,
        panicHpLost: 0,
        panicNetPenalty: 0,
        topSpeed: 0,
        longestSit: 0
      },
      neuro: { lc4: 0, lplc2: 0, dnp01: 0, dnp07: 0, dnp10: 0 },
      input: { down: false, heldFor: 0, consumedUntilRelease: false },
      hitThisStep: new Set()
    };
    while (S.nextX < W * 3) spawn();
  }

  function push(x: number, w: number, h: number, anchor: Anchor) {
    const boundedH = clamp(h, A * 0.11, A * 0.6);
    S.obs.push({
      id: ++S.obId,
      x,
      w,
      h: boundedH,
      anchor,
      y: anchor === 'ceil' ? BAND : H - BAND - boundedH
    });
  }

  function spawn() {
    const x = S.nextX;
    const p = rng();
    if (p < 0.3) {
      const gap = randomBetween(A * 0.42, A * 0.52);
      const top = randomBetween(A * 0.12, A * 0.34);
      const w = randomBetween(54, 80);
      push(x, w, top, 'ceil');
      push(x, w, A - top - gap, 'floor');
      S.nextX = x + w + randomBetween(230, 320);
    } else if (p < 0.55) {
      const w = randomBetween(190, 270);
      push(x, w, randomBetween(A * 0.14, A * 0.3), 'ceil');
      S.nextX = x + w + randomBetween(210, 290);
    } else if (p < 0.8) {
      const w = randomBetween(30, 44);
      push(x, w, randomBetween(A * 0.3, A * 0.52), rng() < 0.5 ? 'ceil' : 'floor');
      S.nextX = x + w + randomBetween(220, 300);
    } else {
      const w = randomBetween(130, 180);
      push(x, w, randomBetween(A * 0.18, A * 0.36), 'floor');
      S.nextX = x + w + randomBetween(230, 310);
    }
  }

  function colliders() {
    // S.obs is only ever reassigned (not mutated) when its contents change
    // (see the despawn filter in step()); reference equality is therefore a
    // safe, cheap check for whether the combined list needs rebuilding.
    if (collidersCacheSrc !== S.obs) {
      collidersCache = [...S.obs, ceilingBoundary, floorBoundary];
      collidersCacheSrc = S.obs;
    }
    return collidersCache;
  }

  const faceOf = (nx: number, ny: number): Face =>
    Math.abs(nx) > Math.abs(ny) ? (nx < 0 ? 'left' : 'right') : ny < 0 ? 'top' : 'bottom';

  function surfaceDistance(o: Obstacle, face: Face, f: FlyState) {
    switch (face) {
      case 'top': return Math.abs(f.y - o.y);
      case 'bottom': return Math.abs(f.y - (o.y + o.h));
      case 'left': return Math.abs(f.x - o.x);
      case 'right': return Math.abs(f.x - (o.x + o.w));
    }
  }

  function isReattachBlocked(o: Obstacle, face: Face) {
    if (!S.lastSurf || S.lastSurf.obstacleId !== o.id || S.lastSurf.face !== face) return false;
    return S.sinceDetach < C.REATTACH_DELAY || !S.lastSurf.cleared;
  }

  // Contact always happens within FLY_RADIUS, which is smaller than REATTACH_DISTANCE,
  // so comparing distance only at the moment of a new contact can never pass. Instead
  // track whether the fly has *ever* gotten far enough away since the last detach.
  function updateReattachClearance() {
    const ls = S.lastSurf;
    if (!ls || ls.cleared) return;
    const o = colliders().find(c => c.id === ls.obstacleId);
    if (!o || surfaceDistance(o, ls.face, S.fly) >= C.REATTACH_DISTANCE) ls.cleared = true;
  }

  function attach(o: Obstacle, face: Face, perfect: boolean) {
    const f = S.fly;
    S.att = {
      o,
      face,
      t: face === 'top' || face === 'bottom' ? f.x - o.x : f.y - o.y
    };
    f.vx = 0;
    f.vy = 0;
    f.mode = 'attached';
    S.sit = 0;
    S.hpAtLanding = f.hp;
    S.mult = 1;
    S.healRate = C.HEAL_TIERS[0][1];
    S.stats.landings += 1;
    if (perfect) S.stats.perfect += 1;
    S.score += C.SCORE_ATTACH;
    emit('attach', perfect ? 'PERFECT ATTACH' : 'ATTACH', 0.9);
  }

  function detach(panic: boolean) {
    const a = S.att;
    if (!a) return;
    const f = S.fly;
    const normals: Record<Face, readonly [number, number]> = {
      top: [0, -1],
      bottom: [0, 1],
      left: [-1, 0],
      right: [1, 0]
    };
    const n = normals[a.face];

    // Visually separate the fly from the surface so camera movement cannot cause an instant re-grab.
    f.x += n[0] * C.DETACH_OFFSET;
    f.y += n[1] * C.DETACH_OFFSET;
    f.vx = Math.max(C.VX_MIN, S.cam.vx * 0.55) + n[0] * C.DETACH_PUSH_X;
    // Detach direction is based on whether the obstacle belongs to the ceiling or floor.
    f.vy = a.o.anchor === 'ceil' ? C.DETACH_FALL_VY : C.DETACH_RISE_VY;
    f.mode = 'flying';
    S.lastSurf = { obstacleId: a.o.id, face: a.face, cleared: false };
    S.sinceDetach = 0;
    S.stats.longestSit = Math.max(S.stats.longestSit, S.sit);

    if (panic) {
      const fatal = opts.panicMode === 'fatal';
      const beforePanic = f.hp;
      const targetHp = fatal ? 0 : calculatePanicTargetHp(S.hpAtLanding, C.MIN_HIT_DAMAGE, rng());
      const totalLost = Math.max(0, beforePanic - targetHp);
      const netPenalty = Math.max(0, S.hpAtLanding - targetHp);
      f.hp = targetHp;
      S.stats.panics += 1;
      S.stats.panicHpLost += totalLost;
      S.stats.panicNetPenalty += netPenalty;
      emit('panic', `PANIC ESCAPE −${Math.round(totalLost)} HP`, 1.5);

      if (fatal) {
        S.att = null;
        S.over = { reason: 'PANIC ESCAPE FAILED', score: Math.round(S.score), stats: { ...S.stats } };
        return;
      }
    } else {
      emit('detach', `DETACH ×${S.mult}`, 0.7);
    }
    S.mult = 1;

    S.att = null;
  }

  function pressStart() {
    if (S.over) return 'over' as const;
    if (S.input.down) return 'ignored' as const;
    S.input.down = true;
    S.input.heldFor = 0;
    S.input.consumedUntilRelease = false;

    const f = S.fly;
    if (f.mode === 'attached') {
      detach(false);
      S.input.consumedUntilRelease = true;
      return 'detach' as const;
    }

    if (f.mode === 'idle') f.mode = 'flying';
    f.vy = C.FLAP_VY;
    f.vx = Math.min(C.VX_MAX, f.vx + C.FLAP_VX);
    return 'flap' as const;
  }

  function pressEnd() {
    S.input.down = false;
    S.input.heldFor = 0;
    S.input.consumedUntilRelease = false;
  }

  // Convenience for tests or non-touch inputs.
  function tap() {
    const result = pressStart();
    pressEnd();
    return result;
  }

  function collide() {
    const f = S.fly;
    const forgiveness = opts.landingForgiveness;

    for (const o of colliders()) {
      const cx = Math.max(o.x, Math.min(f.x, o.x + o.w));
      const cy = Math.max(o.y, Math.min(f.y, o.y + o.h));
      let dx = f.x - cx;
      let dy = f.y - cy;
      let d = Math.hypot(dx, dy);
      if (d > R) continue;
      if (d < 1e-5) {
        dx = 0;
        dy = -1;
        d = 1;
      }

      const nx = dx / d;
      const ny = dy / d;
      const face = faceOf(nx, ny);
      const normalVelocity = f.vx * nx + f.vy * ny;
      const impact = -normalVelocity;
      const tangent = Math.abs(f.vx * -ny + f.vy * nx);

      // Resolve overlap before making a gameplay decision.
      f.x = cx + nx * (R + 0.4);
      f.y = cy + ny * (R + 0.4);

      const approaching = impact >= C.MIN_APPROACH_SPEED;
      if (!approaching) continue;

      const blocked = isReattachBlocked(o, face);
      const canLand =
        !blocked &&
        impact <= C.LAND_IMPACT_MAX * forgiveness &&
        tangent <= C.LAND_TANGENT_MAX * forgiveness;

      if (canLand) {
        attach(o, face, impact < C.LAND_IMPACT_MAX * forgiveness * 0.45 && tangent < C.LAND_TANGENT_MAX * forgiveness * 0.55);
        return;
      }

      // A shallow/grazing hit can stay within collision range for several
      // substeps of the same frame; only charge and announce the damage once.
      if (!S.hitThisStep.has(o.id)) {
        S.hitThisStep.add(o.id);
        const damage = calculateImpactDamage(impact);
        f.hp -= damage;
        S.dmgFlash = 1;
        emit('hit', `−${Math.round(damage)} HP`, 1, Math.round(impact));
      }

      const vn = normalVelocity;
      f.vx = Math.max(60, (f.vx - 1.6 * vn * nx) * 0.42);
      f.vy = (f.vy - 1.6 * vn * ny) * 0.42;
      return;
    }
  }

  function neuro(dt: number) {
    const f = S.fly;
    const n = S.neuro;
    let loom = 0;
    let land = 0;

    for (const o of S.obs) {
      if (o.x + o.w < f.x - 20) continue;
      const dxs = Math.max(0, o.x - f.x);
      const dys = Math.abs(o.y + o.h / 2 - f.y);
      if (dxs < 260 && dys < 240) {
        loom = Math.max(loom, (1 - dxs / 260) * (1 - dys / 300) * Math.min(1, f.vx / 220));
      }
      const near = Math.hypot(dxs, Math.max(0, dys - o.h / 2));
      if (near < 90) land = Math.max(land, 1 - near / 90);
    }

    const attached = f.mode === 'attached';
    const safe = Math.abs(f.vy) < 240 ? 1 : 0.25;
    const panicNear = attached ? Math.max(0, 1 - (f.x - S.cam.x) / (W * C.PANIC_ZONE)) : 0;
    const k = Math.min(1, dt * 7);
    n.lc4 += (loom * 0.95 - n.lc4) * k;
    n.lplc2 += (loom - n.lplc2) * k;
    n.dnp01 += (Math.max(loom * (f.vx / C.VX_MAX), panicNear) - n.dnp01) * k;
    n.dnp07 += ((attached ? 0.25 : land * safe) - n.dnp07) * k;
    n.dnp10 += ((attached ? 0.4 + panicNear * 0.5 : land * safe * 0.85) - n.dnp10) * k;
  }

  function finish(reason: string) {
    if (S.over) return;
    S.over = { reason, score: Math.round(S.score), stats: { ...S.stats } };
  }

  function step(dt: number) {
    dt = Math.min(0.033, Math.max(0, dt));
    const f = S.fly;
    S.t += dt;
    S.hitThisStep.clear();
    if (S.event) {
      S.event.ttl -= dt;
      if (S.event.ttl <= 0) S.event = null;
    }
    S.dmgFlash = Math.max(0, S.dmgFlash - dt * 2.2);
    S.wing += dt * (f.mode === 'flying' ? 26 : 4);
    S.sinceDetach += dt;

    if (S.input.down) S.input.heldFor += dt;

    if (S.over || f.mode === 'idle') {
      neuro(dt);
      return S;
    }

    if (f.mode === 'attached') {
      const a = S.att;
      if (!a) return S;
      S.sit += dt;
      for (const [min, hpPerSecond, multiplier] of C.HEAL_TIERS) {
        if (S.sit >= min) {
          S.healRate = hpPerSecond;
          S.mult = multiplier;
        }
      }
      S.stats.bestMult = Math.max(S.stats.bestMult, S.mult);
      f.hp = Math.min(C.MAX_HP, f.hp + S.healRate * dt);
      S.score += C.SCORE_PER_SEC_SITTING * S.mult * dt;

      const horizontal = a.face === 'top' || a.face === 'bottom';
      const anchorX = horizontal ? a.o.x + a.t : a.o.x + (a.face === 'left' ? 0 : a.o.w);
      if (anchorX - S.cam.x < W * C.PANIC_ZONE) {
        const crawl = S.cam.vx * C.CRAWL_FACTOR * dt;
        if (horizontal) {
          a.t = Math.min(a.o.w - R, a.t + crawl);
        } else if (a.o.anchor === 'ceil') {
          a.t = Math.min(a.o.h - R, a.t + crawl);
        } else {
          a.t = Math.max(R, a.t - crawl);
        }
      }

      if (horizontal) {
        f.x = a.o.x + a.t;
        f.y = a.face === 'top' ? a.o.y - R : a.o.y + a.o.h + R;
      } else {
        f.y = a.o.y + a.t;
        f.x = a.face === 'left' ? a.o.x - R : a.o.x + a.o.w + R;
      }

      if (f.x - S.cam.x < W * C.PANIC_TRIGGER) detach(true);
    } else {
      if (S.input.down && !S.input.consumedUntilRelease && S.input.heldFor >= C.HOLD_THRESHOLD) {
        f.vx = Math.max(C.VX_MIN, f.vx - C.HOLD_BRAKE_X * dt);
        f.vy = Math.max(C.VY_MIN, f.vy - C.HOLD_LIFT * dt);
      }

      f.vy += C.GRAVITY * dt;
      f.vx = Math.max(C.VX_MIN, f.vx - C.DRAG_VX * dt);
      S.stats.topSpeed = Math.max(S.stats.topSpeed, f.vx);

      // Dynamic substeps make tunneling much less likely while keeping the rectangle MVP simple.
      const maxTravel = Math.max(Math.abs(f.vx), Math.abs(f.vy)) * dt;
      const substeps = Math.max(4, Math.ceil(maxTravel / Math.max(2.5, R * 0.55)));
      const sdt = dt / substeps;
      for (let i = 0; i < substeps; i += 1) {
        f.x += f.vx * sdt;
        f.y += f.vy * sdt;
        updateReattachClearance();
        collide();
        if (f.mode !== 'flying') break;
      }
      f.pitch = Math.atan2(f.vy, Math.max(60, f.vx)) * 0.55;
    }

    const wantedSpeed = Math.max(C.VX_MIN, f.mode === 'attached' ? S.cam.vx : f.vx);
    const screenX = (f.x - S.cam.x) / W;
    const target = wantedSpeed * (1 + (screenX > 0.72 ? 0.9 : screenX < 0.42 ? -0.22 : 0));
    S.cam.vx += (target - S.cam.vx) * Math.min(1, dt * 2.6);
    S.cam.x += S.cam.vx * dt;

    while (S.nextX < S.cam.x + W + 1200) spawn();
    S.obs = S.obs.filter(o => o.x + o.w > S.cam.x - 400);

    neuro(dt);
    if (f.hp <= 0) finish('HP DEPLETED');
    if (f.x - S.cam.x < -12) finish('LEFT BEHIND');
    return S;
  }

  function pose(): FlyPose {
    const f = S.fly;
    if (S.att) return f.x - S.cam.x < W * C.PANIC_ZONE ? 'danger' : 'attach';
    if (S.neuro.dnp07 + S.neuro.dnp10 > 0.62) return 'ready';
    return 'cruise';
  }

  function rotation() {
    if (!S.att) return S.fly.pitch;
    return ({ top: 0, bottom: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 } as const)[S.att.face];
  }

  reset();

  return {
    get state() { return S; },
    step,
    tap,
    pressStart,
    pressEnd,
    reset,
    pose,
    rotation,
    setOptions: (next: Partial<typeof opts>) => { opts = { ...opts, ...next }; },
    dims: { W, H, BAND, A }
  };
}

export type GameInstance = ReturnType<typeof createGame>;

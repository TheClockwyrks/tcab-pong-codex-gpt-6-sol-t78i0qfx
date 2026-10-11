import type {
  Game,
  InitApi,
  RenderApi,
  UpdateApi,
} from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import * as C from "./constants";

export type Screen =
  "title" | "howto" | "countdown" | "playing" | "paused" | "matchover";
export type Mode = "solo" | "versus";
export type Side = "left" | "right";
export interface PaddleState {
  readonly cy: number;
  readonly vy: number;
  readonly driven: boolean;
  readonly drivenVy: number;
}
export interface AiState {
  readonly tracking: boolean;
  readonly movement: boolean;
}
export interface TrailSample {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}
export interface BallState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly spin: number;
  readonly held: boolean;
  readonly holdTimer: number;
  readonly serveSign: 1 | -1;
  readonly trail: readonly TrailSample[];
}
export interface ObstacleState {
  readonly index: number;
  readonly cx: number;
  readonly cy: number;
}
export interface CaromState {
  readonly screen: Screen;
  readonly mode: Mode;
  readonly menuIndex: number;
  readonly titleIndex: number;
  readonly resumeScreen: "countdown" | "playing";
  readonly score: { readonly p1: number; readonly p2: number };
  readonly winner: Side | null;
  readonly paddles: { readonly left: PaddleState; readonly right: PaddleState };
  readonly ai: AiState;
  readonly receiver: Side;
  readonly ball: BallState | null;
  readonly obstacles: readonly ObstacleState[];
  readonly simTime: number;
  readonly muted: boolean;
  readonly menuPress?: readonly { id: number; index: number }[];
}
export const BACKGROUND = "#090e1a";
type ReadState = DeepReadonly<CaromState>;
type Rect = { x: number; y: number; w: number; h: number };
type Snapshot = Omit<CaromState, "ball" | "menuPress"> & {
  version: number;
  ball: (BallState & { speed: number }) | null;
};
export interface CaromDebugApi {
  readonly version: number;
  clearWorld(s: ReadState): CaromState;
  spawnBall(s: ReadState): CaromState;
  spawnObstacle(s: ReadState, index: number): CaromState;
  reset(s: ReadState): CaromState;
  reconcile(s: ReadState): CaromState;
  setScreen(s: ReadState, screen: Screen): CaromState;
  setMode(s: ReadState, mode: Mode): CaromState;
  setMenuIndex(s: ReadState, index: number): CaromState;
  setTitleIndex(s: ReadState, index: number): CaromState;
  setResumeScreen(s: ReadState, screen: "countdown" | "playing"): CaromState;
  setScore(s: ReadState, p1: number, p2: number): CaromState;
  setWinner(s: ReadState, side: Side | null): CaromState;
  setReceiver(s: ReadState, side: Side): CaromState;
  setPaddleCy(s: ReadState, side: Side, cy: number): CaromState;
  setPaddleVy(s: ReadState, side: Side, vy: number): CaromState;
  setPaddleDriven(s: ReadState, side: Side, driven: boolean): CaromState;
  setBallPosition(s: ReadState, x: number, y: number): CaromState;
  setBallVelocity(s: ReadState, vx: number, vy: number): CaromState;
  setBallSpin(s: ReadState, spin: number): CaromState;
  setBallHeld(s: ReadState, held: boolean): CaromState;
  setBallHoldTimer(s: ReadState, seconds: number): CaromState;
  setBallServeSign(s: ReadState, sign: 1 | -1): CaromState;
  drawBallServeSign(s: ReadState): CaromState;
  setAiTracking(s: ReadState, enabled: boolean): CaromState;
  setAiMovement(s: ReadState, enabled: boolean): CaromState;
  setMuted(s: ReadState, muted: boolean): CaromState;
  snapshot(s: ReadState): Snapshot;
  menuItemRect(s: ReadState, index: number): Rect | null;
}
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
const sign = (): 1 | -1 => (Math.random() < 0.5 ? 1 : -1);
const parked = (): BallState => ({
  x: C.FIELD_CX,
  y: C.FIELD_CY,
  vx: 0,
  vy: 0,
  spin: 0,
  held: true,
  holdTimer: C.HOLD_TIME,
  serveSign: sign(),
  trail: [],
});
const obstacles = (): ObstacleState[] =>
  C.OBSTACLE_CENTERS.map((p, index) => ({ index, cx: p.x, cy: p.y }));
const paddle = (): PaddleState => ({
  cy: C.FIELD_CY,
  vy: 0,
  driven: false,
  drivenVy: 0,
});
function initial(muted: boolean): CaromState {
  return {
    screen: "title",
    mode: "solo",
    menuIndex: 0,
    titleIndex: 0,
    resumeScreen: "playing",
    score: { p1: 0, p2: 0 },
    winner: null,
    paddles: { left: paddle(), right: paddle() },
    ai: { tracking: true, movement: true },
    receiver: "left",
    ball: parked(),
    obstacles: obstacles(),
    simTime: 0,
    muted,
    menuPress: [],
  };
}
function start(s: ReadState, mode: Mode): CaromState {
  return {
    ...s,
    screen: "countdown",
    mode,
    menuIndex: 0,
    resumeScreen: "playing",
    score: { p1: 0, p2: 0 },
    winner: null,
    receiver: "left",
    ball: parked(),
    paddles: {
      left: { ...s.paddles.left, cy: C.FIELD_CY, vy: 0 },
      right: { ...s.paddles.right, cy: C.FIELD_CY, vy: 0 },
    },
    menuPress: [],
  };
}
function title(s: ReadState): CaromState {
  return {
    ...initial(s.muted),
    titleIndex: s.titleIndex,
    menuIndex: s.titleIndex,
    simTime: s.simTime,
  };
}
function items(screen: Screen): readonly string[] {
  return screen === "title"
    ? C.TITLE_ITEMS
    : screen === "paused"
      ? C.PAUSE_ITEMS
      : screen === "matchover"
        ? C.MATCHOVER_ITEMS
        : screen === "howto"
          ? ["BACK TO MENU"]
          : [];
}
function menuRect(s: ReadState, index: number): Rect | null {
  const list = items(s.screen);
  if (index < 0 || index >= list.length) return null;
  const y0 =
    s.screen === "title"
      ? 384
      : s.screen === "howto"
        ? 560
        : s.screen === "paused"
          ? 370
          : 440;
  return { x: 440, y: y0 + index * 70, w: 400, h: 56 };
}
const hit = (s: ReadState, x: number, y: number): number =>
  items(s.screen).findIndex((_, i) => {
    const r = menuRect(s, i)!;
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  });
function setPaddle(
  s: ReadState,
  side: Side,
  changes: Partial<PaddleState>,
): CaromState {
  return {
    ...s,
    paddles: { ...s.paddles, [side]: { ...s.paddles[side], ...changes } },
  };
}
function setBall(s: ReadState, changes: Partial<BallState>): CaromState {
  if (!s.ball) throw new Error("Carom: no ball present");
  return { ...s, ball: { ...s.ball, ...changes } };
}
const debug: CaromDebugApi = {
  version: C.CAROM_DEBUG_VERSION,
  clearWorld: (s) => ({ ...s, ball: null, obstacles: [] }),
  spawnBall: (s) => ({ ...s, ball: parked() }),
  spawnObstacle: (s, index) => {
    const p = C.OBSTACLE_CENTERS[index];
    if (!p) throw new Error(`Carom: invalid obstacle ${index}`);
    return {
      ...s,
      obstacles: [
        ...s.obstacles.filter((o) => o.index !== index),
        { index, cx: p.x, cy: p.y },
      ].sort((a, b) => a.index - b.index),
    };
  },
  reset: (s) => initial(s.muted),
  reconcile: (s) => ({ ...s }),
  setScreen: (s, screen) => ({ ...s, screen }),
  setMode: (s, mode) => ({ ...s, mode }),
  setMenuIndex: (s, menuIndex) => ({ ...s, menuIndex }),
  setTitleIndex: (s, titleIndex) => ({ ...s, titleIndex }),
  setResumeScreen: (s, resumeScreen) => ({ ...s, resumeScreen }),
  setScore: (s, p1, p2) => ({ ...s, score: { p1, p2 } }),
  setWinner: (s, winner) => ({ ...s, winner }),
  setReceiver: (s, receiver) => ({ ...s, receiver }),
  setPaddleCy: (s, side, cy) => setPaddle(s, side, { cy }),
  setPaddleVy: (s, side, drivenVy) => setPaddle(s, side, { drivenVy }),
  setPaddleDriven: (s, side, driven) => setPaddle(s, side, { driven }),
  setBallPosition: (s, x, y) => setBall(s, { x, y }),
  setBallVelocity: (s, vx, vy) => setBall(s, { vx, vy }),
  setBallSpin: (s, spin) => setBall(s, { spin }),
  setBallHeld: (s, held) => setBall(s, { held }),
  setBallHoldTimer: (s, holdTimer) => setBall(s, { holdTimer }),
  setBallServeSign: (s, serveSign) => setBall(s, { serveSign }),
  drawBallServeSign: (s) => setBall(s, { serveSign: sign() }),
  setAiTracking: (s, tracking) => ({ ...s, ai: { ...s.ai, tracking } }),
  setAiMovement: (s, movement) => ({ ...s, ai: { ...s.ai, movement } }),
  setMuted: (s, muted) => ({ ...s, muted }),
  snapshot: (s) => ({
    version: C.CAROM_DEBUG_VERSION,
    screen: s.screen,
    mode: s.mode,
    menuIndex: s.menuIndex,
    titleIndex: s.titleIndex,
    resumeScreen: s.resumeScreen,
    score: { ...s.score },
    winner: s.winner,
    muted: s.muted,
    paddles: { left: { ...s.paddles.left }, right: { ...s.paddles.right } },
    ai: { ...s.ai },
    receiver: s.receiver,
    ball: s.ball
      ? {
          ...s.ball,
          speed: Math.hypot(s.ball.vx, s.ball.vy),
          trail: [...s.ball.trail],
        }
      : null,
    obstacles: s.obstacles.map((o) => ({ ...o })),
    simTime: s.simTime,
  }),
  menuItemRect: menuRect,
};
function movePaddle(
  p: DeepReadonly<PaddleState>,
  vy: number,
  dt: number,
): PaddleState {
  const cy = clamp(p.cy + vy * dt, C.PADDLE_MIN_CY, C.PADDLE_MAX_CY);
  return {
    ...p,
    cy,
    vy: dt > 0 && cy !== p.cy + vy * dt ? (cy - p.cy) / dt : vy,
  };
}
function movePaddles(s: ReadState, api: UpdateApi, dt: number): CaromState {
  const v = (up: string, down: string) =>
    (api.input.value(down) - api.input.value(up)) * C.PADDLE_SPEED;
  const leftVy = s.paddles.left.driven
    ? s.paddles.left.drivenVy
    : s.mode === "solo"
      ? ((api.input.value("p1-down") || api.input.value("p2-down") ? 1 : 0) -
          (api.input.value("p1-up") || api.input.value("p2-up") ? 1 : 0)) *
        C.PADDLE_SPEED
      : v("p1-up", "p1-down");
  let rightVy = 0;
  if (s.paddles.right.driven) rightVy = s.paddles.right.drivenVy;
  else if (s.mode === "versus") rightVy = v("p2-up", "p2-down");
  else if (s.ai.movement && dt > 0) {
    const defend =
      s.ai.tracking &&
      s.screen === "playing" &&
      s.ball !== null &&
      s.ball.vx > 0;
    const target = defend ? s.ball!.y - s.ball!.vy * C.AI_REACT : C.AI_HOME_Y;
    const diff = target - s.paddles.right.cy;
    const dead = defend ? C.AI_DEADZONE : C.AI_HOME_DEADZONE;
    if (Math.abs(diff) > dead)
      rightVy = Math.sign(diff) * Math.min(C.AI_SPEED, Math.abs(diff) / dt);
  }
  return {
    ...s,
    paddles: {
      left: movePaddle(s.paddles.left, leftVy, dt),
      right: movePaddle(s.paddles.right, rightVy, dt),
    },
  };
}
type Events = { paddle: boolean; wall: boolean; obstacle: boolean };
type MutableBall = { -readonly [K in keyof BallState]: BallState[K] };
function collide(
  b: MutableBall,
  r: C.Rect,
): "left" | "right" | "top" | "bottom" | null {
  if (!(
    b.x > r.x0 - C.BALL_R &&
    b.x < r.x1 + C.BALL_R &&
    b.y > r.y0 - C.BALL_R &&
    b.y < r.y1 + C.BALL_R
  ))
    return null;
  const depths = [
    b.x - (r.x0 - C.BALL_R),
    r.x1 + C.BALL_R - b.x,
    b.y - (r.y0 - C.BALL_R),
    r.y1 + C.BALL_R - b.y,
  ];
  const face = depths.indexOf(Math.min(...depths));
  if (face === 0) {
    b.x = r.x0 - C.BALL_R;
    if (b.vx > 0) b.vx = -b.vx;
    return "left";
  }
  if (face === 1) {
    b.x = r.x1 + C.BALL_R;
    if (b.vx < 0) b.vx = -b.vx;
    return "right";
  }
  if (face === 2) {
    b.y = r.y0 - C.BALL_R;
    if (b.vy > 0) b.vy = -b.vy;
    return "top";
  }
  b.y = r.y1 + C.BALL_R;
  if (b.vy < 0) b.vy = -b.vy;
  return "bottom";
}
function advanceBall(
  ball: DeepReadonly<BallState>,
  s: ReadState,
  dt: number,
  events: Events,
): BallState {
  const b: MutableBall = { ...ball, trail: [...ball.trail] };
  const n = Math.max(
    1,
    Math.ceil((Math.hypot(b.vx, b.vy) * dt) / C.MAX_SUBSTEP),
  );
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const speed = Math.hypot(b.vx, b.vy);
    if (speed > 0) {
      const a = (b.spin / speed) * h,
        co = Math.cos(a),
        si = Math.sin(a),
        vx = b.vx;
      b.vx = vx * co - b.vy * si;
      b.vy = vx * si + b.vy * co;
    }
    b.spin *= Math.pow(0.5, h / C.SPIN_HALFLIFE);
    b.x += b.vx * h;
    b.y += b.vy * h;
    if (b.y - C.BALL_R < 0 && b.vy < 0) {
      b.y = C.BALL_R;
      b.vy = -b.vy;
      events.wall = true;
    } else if (b.y + C.BALL_R > C.FIELD_H && b.vy > 0) {
      b.y = C.FIELD_H - C.BALL_R;
      b.vy = -b.vy;
      events.wall = true;
    }
    for (const side of ["left", "right"] as const) {
      const p = s.paddles[side],
        x0 = side === "left" ? C.P1_X0 : C.P2_X0,
        x1 = side === "left" ? C.P1_X1 : C.P2_X1;
      const face = collide(b, {
        x0,
        x1,
        y0: p.cy - C.PADDLE_HALF,
        y1: p.cy + C.PADDLE_HALF,
      });
      if (!face) continue;
      if (face === "top" || face === "bottom") {
        events.wall = true;
        continue;
      }
      const angle =
        clamp((b.y - p.cy) / C.PADDLE_HALF, -1, 1) * C.MAX_BOUNCE_ANGLE;
      const speed2 = Math.min(
        Math.hypot(b.vx, b.vy) * C.SPEED_MULT,
        C.SPEED_CAP,
      );
      b.vx = (side === "left" ? 1 : -1) * speed2 * Math.cos(angle);
      b.vy = speed2 * Math.sin(angle);
      b.spin = clamp(
        b.spin + p.vy * C.SPIN_FROM_PADDLE,
        -C.SPIN_CLAMP,
        C.SPIN_CLAMP,
      );
      b.x = side === "left" ? C.P1_X1 + C.BALL_R : C.P2_X0 - C.BALL_R;
      events.paddle = true;
    }
    for (const o of s.obstacles)
      if (collide(b, C.OBSTACLES[o.index])) events.obstacle = true;
  }
  return b;
}
function confirm(s: ReadState): CaromState {
  if (s.screen === "title") {
    const chosen = s.menuIndex;
    const next = { ...s, titleIndex: chosen };
    return chosen === 2
      ? { ...next, screen: "howto", menuIndex: 0 }
      : start(next, chosen === 0 ? "solo" : "versus");
  }
  if (s.screen === "howto") return title(s);
  if (s.screen === "paused")
    return s.menuIndex === 0
      ? { ...s, screen: s.resumeScreen }
      : s.menuIndex === 1
        ? start(s, s.mode)
        : title(s);
  if (s.screen === "matchover")
    return s.menuIndex === 0 ? start(s, s.mode) : title(s);
  return { ...s };
}
function readInput(s: ReadState, api: UpdateApi): CaromState {
  let next: CaromState = { ...s };
  const mute = api.input.pressed("mute");
  if (mute) {
    api.audio.setMuted(!api.audio.muted());
    next = { ...next, muted: api.audio.muted() };
  } else if (api.audio.muted() !== s.muted) api.audio.setMuted(s.muted);
  next = { ...next, muted: api.audio.muted() };
  const p1Up = api.input.pressed("p1-up");
  const p2Up = api.input.pressed("p2-up");
  const p1Down = api.input.pressed("p1-down");
  const p2Down = api.input.pressed("p2-down");
  const up = p1Up || p2Up;
  const down = p1Down || p2Down;
  const enter = api.input.pressed("confirm");
  const back = api.input.pressed("back");
  const pause = api.input.pressed("pause");
  if (s.screen === "countdown" || s.screen === "playing") {
    if (pause)
      next = {
        ...next,
        screen: "paused",
        resumeScreen: s.screen,
        menuIndex: 0,
      };
    return next;
  }
  if (s.screen === "paused" && (pause || back))
    return { ...next, screen: s.resumeScreen };
  if (s.screen === "howto" && (back || enter)) return title(next);
  if (s.screen === "matchover" && back) return title(next);
  const count = items(s.screen).length;
  if (count && (up || down)) {
    next = {
      ...next,
      menuIndex: (next.menuIndex + (up ? -1 : 1) + count) % count,
    };
  } else if (enter) return confirm(next);
  const presses = [...(s.menuPress ?? [])];
  let pointerConfirm = false;
  for (const sample of api.input.pointerSamples()) {
    const index = hit(next, sample.x, sample.y);
    if (index >= 0) next = { ...next, menuIndex: index };
    if (sample.type === "down" && sample.button === "primary")
      presses.push({ id: sample.id, index });
    if (sample.type === "up" && sample.button === "primary") {
      const found = presses.find((p) => p.id === sample.id);
      if (found && found.index >= 0 && found.index === index)
        pointerConfirm = true;
      const at = presses.findIndex((p) => p.id === sample.id);
      if (at >= 0) presses.splice(at, 1);
    }
  }
  next = { ...next, menuPress: presses };
  return pointerConfirm ? confirm(next) : next;
}
export const game: Game<CaromState, CaromDebugApi> = {
  initialize(api: InitApi<CaromState>): [CaromState, CaromDebugApi] {
    for (const name of C.ACTIONS)
      api.input.register(name, { keys: [...C.BINDINGS[name]] });
    api.audio.define(C.CUES.paddleHit, {
      wave: "triangle",
      freq: 440,
      freqTo: 670,
      durationMs: 80,
      gain: 0.17,
    });
    api.audio.define(C.CUES.wallBounce, {
      wave: "sine",
      freq: 280,
      freqTo: 210,
      durationMs: 65,
      gain: 0.12,
    });
    api.audio.define(C.CUES.obstacleBounce, {
      wave: "square",
      freq: 200,
      freqTo: 130,
      durationMs: 85,
      gain: 0.1,
    });
    api.audio.define(C.CUES.score, {
      wave: "sine",
      freq: 740,
      freqTo: 350,
      durationMs: 280,
      gain: 0.21,
    });
    api.diagnostics.register("screen", (s) => s.screen);
    api.diagnostics.register("mode", (s) => s.mode);
    api.diagnostics.register("score", (s) => `${s.score.p1} : ${s.score.p2}`);
    api.diagnostics.register("ball position", (s) =>
      s.ball ? `${s.ball.x.toFixed(1)}, ${s.ball.y.toFixed(1)}` : "none",
    );
    api.diagnostics.register("ball velocity", (s) =>
      s.ball ? `${s.ball.vx.toFixed(1)}, ${s.ball.vy.toFixed(1)}` : "none",
    );
    api.diagnostics.register("ball speed", (s) =>
      s.ball ? Math.hypot(s.ball.vx, s.ball.vy).toFixed(1) : "none",
    );
    api.diagnostics.register("ball spin", (s) =>
      s.ball ? s.ball.spin.toFixed(1) : "none",
    );
    for (const side of ["left", "right"] as const) {
      api.diagnostics.register(`${side} y`, (s) =>
        s.paddles[side].cy.toFixed(1),
      );
      api.diagnostics.register(`${side} vy`, (s) =>
        s.paddles[side].vy.toFixed(1),
      );
    }
    return [initial(false), debug];
  },
  update(state: ReadState, api: UpdateApi, dt: number): CaromState {
    let s = readInput(state, api);
    s = { ...s, simTime: state.simTime + dt };
    if (s.screen !== "countdown" && s.screen !== "playing") return s;
    s = movePaddles(s, api, dt);
    if (!s.ball) return s;
    let ball: BallState = { ...s.ball };
    if (s.screen === "countdown" && ball.held) {
      const holdTimer = ball.holdTimer - dt;
      ball =
        holdTimer <= 0
          ? {
              ...ball,
              held: false,
              holdTimer: 0,
              vx:
                (s.receiver === "left" ? -1 : 1) *
                C.SERVE_SPEED *
                Math.cos(C.SERVE_ANGLE),
              vy: ball.serveSign * C.SERVE_SPEED * Math.sin(C.SERVE_ANGLE),
              trail: [],
            }
          : { ...ball, holdTimer };
      if (!ball.held) s = { ...s, screen: "playing" };
    } else if (s.screen === "playing" && !ball.held) {
      const events: Events = { paddle: false, wall: false, obstacle: false };
      ball = advanceBall(ball, s, dt, events);
      if (events.paddle) api.audio.play(C.CUES.paddleHit);
      if (events.wall) api.audio.play(C.CUES.wallBounce);
      if (events.obstacle) api.audio.play(C.CUES.obstacleBounce);
    }
    ball = {
      ...ball,
      trail: [
        ...ball.trail.filter((p) => p.t >= s.simTime - C.TRAIL_TIME),
        { x: ball.x, y: ball.y, t: s.simTime },
      ],
    };
    s = { ...s, ball };
    if (
      s.screen === "playing" &&
      !ball.held &&
      (ball.x - C.BALL_R > C.FIELD_W || ball.x + C.BALL_R < 0)
    ) {
      const scorer: Side = ball.x - C.BALL_R > C.FIELD_W ? "left" : "right";
      const score = {
        p1: s.score.p1 + (scorer === "left" ? 1 : 0),
        p2: s.score.p2 + (scorer === "right" ? 1 : 0),
      };
      api.audio.play(C.CUES.score);
      const won =
        scorer === "left"
          ? score.p1 >= C.WIN_SCORE && score.p1 - score.p2 >= C.WIN_LEAD
          : score.p2 >= C.WIN_SCORE && score.p2 - score.p1 >= C.WIN_LEAD;
      s = won
        ? { ...s, score, winner: scorer, screen: "matchover", menuIndex: 0 }
        : {
            ...s,
            score,
            receiver: scorer === "left" ? "right" : "left",
            ball: parked(),
            screen: "countdown",
          };
    }
    return s;
  },
  render(state: ReadState, api: RenderApi): void {
    draw(state, api.ctx);
  },
};

function draw(s: ReadState, ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
  const glow = (color: string, blur: number) => {
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
  };
  ctx.save();
  ctx.strokeStyle = "#1e2b40";
  ctx.lineWidth = 2;
  ctx.strokeRect(25, 25, C.FIELD_W - 50, C.FIELD_H - 50);
  ctx.setLineDash([10, 17]);
  ctx.beginPath();
  ctx.moveTo(C.NET_X, 56);
  ctx.lineTo(C.NET_X, C.FIELD_H - 56);
  ctx.strokeStyle = "#254059";
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#112137";
  ctx.fillRect(0, 0, C.FIELD_W, 6);
  ctx.fillRect(0, C.FIELD_H - 6, C.FIELD_W, 6);
  for (const o of s.obstacles) {
    ctx.fillStyle = "#ffb45d";
    glow("#ff9c43", 19);
    ctx.beginPath();
    ctx.roundRect(
      o.cx - C.OBSTACLE_HW,
      o.cy - C.OBSTACLE_HH,
      C.OBSTACLE_W,
      C.OBSTACLE_HH * 2,
      10,
    );
    ctx.fill();
  }
  for (const side of ["left", "right"] as const) {
    const p = s.paddles[side];
    ctx.fillStyle = side === "left" ? "#53e5d0" : "#ff648f";
    glow(ctx.fillStyle, 22);
    ctx.beginPath();
    ctx.roundRect(
      side === "left" ? C.P1_X0 : C.P2_X0,
      p.cy - C.PADDLE_HALF,
      C.PADDLE_W,
      C.PADDLE_H,
      8,
    );
    ctx.fill();
  }
  if (s.ball) {
    const b = s.ball;
    for (const sample of b.trail) {
      const a = clamp(1 - (s.simTime - sample.t) / C.TRAIL_TIME, 0, 1);
      ctx.globalAlpha = a * 0.42;
      ctx.fillStyle = "#fff2b6";
      ctx.beginPath();
      ctx.arc(sample.x, sample.y, C.BALL_R * (0.35 + 0.55 * a), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff4cb";
    glow("#fff1a0", 24);
    ctx.beginPath();
    ctx.arc(b.x, b.y, C.BALL_R, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.textAlign = "center";
  ctx.font = "700 62px system-ui";
  ctx.fillStyle = "#d5fff8";
  ctx.fillText(String(s.score.p1), C.FIELD_CX - 115, 92);
  ctx.fillStyle = "#ffd3df";
  ctx.fillText(String(s.score.p2), C.FIELD_CX + 115, 92);
  ctx.font = "700 17px system-ui";
  ctx.letterSpacing = "4px";
  ctx.fillStyle = "#849fb7";
  ctx.fillText(
    s.mode === "solo" ? "SOLO / VS AI" : "VERSUS / LOCAL",
    C.FIELD_CX,
    38,
  );
  ctx.letterSpacing = "0px";
  if (s.screen === "countdown") {
    ctx.fillStyle = "#e9f5fb";
    ctx.font = "700 24px system-ui";
    ctx.fillText("SERVE IN", C.FIELD_CX, 265);
    ctx.font = "900 72px system-ui";
    ctx.fillText(
      String(Math.max(1, Math.ceil(s.ball?.holdTimer ?? 0))),
      C.FIELD_CX,
      342,
    );
  }
  if (["title", "howto", "paused", "matchover"].includes(s.screen)) {
    ctx.fillStyle = "rgba(7,12,24,.83)";
    ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
    ctx.textAlign = "center";
    if (s.screen === "title") {
      ctx.fillStyle = "#65ead4";
      glow("#42d9c7", 22);
      ctx.font = "900 118px system-ui";
      ctx.fillText(C.TITLE_TEXT, C.FIELD_CX, 232);
      ctx.shadowBlur = 0;
      ctx.font = "20px system-ui";
      ctx.fillStyle = "#9eb4c8";
      ctx.fillText("CURVE THE SHOT  •  OWN THE ANGLE", C.FIELD_CX, 278);
    }
    if (s.screen === "howto") {
      ctx.fillStyle = "#65ead4";
      ctx.font = "800 58px system-ui";
      ctx.fillText("HOW TO PLAY", C.FIELD_CX, 145);
      ctx.font = "24px system-ui";
      ctx.fillStyle = "#e1edf7";
      [
        "W / S move the left paddle",
        "↑ / ↓ move the right paddle",
        "In Solo, either set controls your paddle",
        "Move as you strike to bend the ball with spin",
        "Bank around the gold obstacles. First to 11, win by 2.",
        "P or Esc pauses  •  M toggles sound",
      ].forEach((line, i) => ctx.fillText(line, C.FIELD_CX, 225 + i * 48));
    }
    if (s.screen === "paused") {
      ctx.fillStyle = "#fff4cb";
      ctx.font = "900 74px system-ui";
      ctx.fillText("PAUSED", C.FIELD_CX, 255);
    }
    if (s.screen === "matchover") {
      ctx.fillStyle = "#fff4cb";
      ctx.font = "900 68px system-ui";
      ctx.fillText(
        s.winner === "left" ? "PLAYER ONE WINS" : "PLAYER TWO WINS",
        C.FIELD_CX,
        220,
      );
      ctx.font = "34px system-ui";
      ctx.fillText(`${s.score.p1}  —  ${s.score.p2}`, C.FIELD_CX, 300);
    }
    items(s.screen).forEach((label, i) => {
      const r = menuRect(s, i)!;
      const active = i === s.menuIndex;
      ctx.fillStyle = active ? "#64e7d1" : "#1a2b42";
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.w, r.h, 12);
      ctx.fill();
      ctx.fillStyle = active ? "#0b1b25" : "#d0ddeb";
      ctx.font = "800 25px system-ui";
      ctx.fillText(label, C.FIELD_CX, r.y + 37);
    });
  }
  ctx.restore();
}

import { createCanvas } from "@napi-rs/canvas";
import { ConstantClock, createEngine } from "@clockwyrks/simple-2d";
import { describe, expect, it } from "vitest";
import {
  BALL_R,
  FIELD_CX,
  HOLD_TIME,
  PADDLE_SPEED,
  SERVE_SPEED,
  WIN_SCORE,
} from "./constants";
import { game } from "./game";

async function setup(step = 1000 / 60) {
  const canvas = createCanvas(1280, 720);
  const surface = {
    cssWidth: () => 1280,
    cssHeight: () => 720,
    dpr: () => 1,
    events: () => new EventTarget(),
  };
  const engine = createEngine({
    canvas: canvas as unknown as HTMLCanvasElement,
    width: 1280,
    height: 720,
    game,
    clock: new ConstantClock(step),
    surface,
  });
  await engine.initialize();
  return engine;
}

describe("Carom simulation", () => {
  it("starts complete and serves toward the receiver after the hold", async () => {
    const e = await setup();
    expect(e.debug.snapshot(e.state).screen).toBe("title");
    e.apply((s) => e.debug.setScreen(s, "countdown"));
    await e.advance(60);
    expect(e.state.screen).toBe("playing");
    expect(e.state.ball?.held).toBe(false);
    expect(e.state.ball?.x).toBe(FIELD_CX);
    expect(e.state.ball?.vx).toBeCloseTo(-SERVE_SPEED * Math.cos(Math.PI / 15));
    expect(e.state.ball?.holdTimer).toBe(0);
    expect(e.state.simTime).toBeCloseTo(HOLD_TIME);
    e.destroy();
  });

  it("integrates driven paddles and gives their hits spin", async () => {
    const e = await setup();
    e.apply((s) => e.debug.setScreen(s, "playing"));
    e.apply((s) => e.debug.setPaddleDriven(s, "left", true));
    e.apply((s) => e.debug.setPaddleVy(s, "left", PADDLE_SPEED));
    e.apply((s) => e.debug.setBallHeld(s, false));
    e.apply((s) => e.debug.setBallPosition(s, 90, 370));
    e.apply((s) => e.debug.setBallVelocity(s, -520, 0));
    await e.advance(2);
    expect(e.state.paddles.left.cy).toBeGreaterThan(360);
    expect(e.state.ball?.vx).toBeGreaterThan(0);
    expect(e.state.ball?.spin).toBeGreaterThan(0);
    e.destroy();
  });

  it("scores and applies the two point win rule", async () => {
    const e = await setup();
    e.apply((s) => e.debug.setScreen(s, "playing"));
    e.apply((s) => e.debug.setScore(s, WIN_SCORE - 1, WIN_SCORE - 2));
    e.apply((s) => e.debug.setBallHeld(s, false));
    e.apply((s) => e.debug.setBallPosition(s, 1280 + BALL_R + 1, 360));
    await e.advance(1);
    expect(e.state.screen).toBe("matchover");
    expect(e.state.winner).toBe("left");
    expect(e.state.score.p1).toBe(WIN_SCORE);
    e.destroy();
  });

  it("keeps snapshots derived and reset complete", async () => {
    const e = await setup();
    e.apply((s) => e.debug.clearWorld(s));
    expect(e.debug.snapshot(e.state).ball).toBeNull();
    expect(() => e.apply((s) => e.debug.setBallSpin(s, 100))).toThrow();
    e.apply((s) => e.debug.spawnBall(s));
    e.apply((s) => e.debug.setBallVelocity(s, 300, 400));
    expect(e.debug.snapshot(e.state).ball?.speed).toBe(500);
    e.apply((s) => e.debug.reset(s));
    expect(e.state.ball?.held).toBe(true);
    expect(e.state.obstacles).toHaveLength(2);
    expect(e.state.simTime).toBe(0);
    e.destroy();
  });

  it("reflects off the wall and obstacle while preserving speed", async () => {
    const e = await setup();
    e.apply((s) => e.debug.setScreen(s, "playing"));
    e.apply((s) => e.debug.setBallHeld(s, false));
    e.apply((s) => e.debug.setBallPosition(s, 400, BALL_R + 1));
    e.apply((s) => e.debug.setBallVelocity(s, 0, -300));
    await e.advance(1);
    expect(e.state.ball?.vy).toBeGreaterThan(0);
    expect(e.debug.snapshot(e.state).ball?.speed).toBeCloseTo(300);

    e.apply((s) => e.debug.setBallPosition(s, 455, 220));
    e.apply((s) => e.debug.setBallVelocity(s, 520, 0));
    await e.advance(3);
    expect(e.state.ball?.vx).toBeLessThan(0);
    expect(e.debug.snapshot(e.state).ball?.speed).toBeCloseTo(520);
    e.destroy();
  });

  it("freezes the rally while paused and resumes it", async () => {
    const e = await setup();
    e.apply((s) => e.debug.setScreen(s, "paused"));
    e.apply((s) => e.debug.setResumeScreen(s, "countdown"));
    const before = e.state.ball?.holdTimer;
    await e.advance(30);
    expect(e.state.ball?.holdTimer).toBe(before);
    expect(e.state.simTime).toBeCloseTo(0.5);
    e.apply((s) => e.debug.setScreen(s, "countdown"));
    await e.advance(1);
    expect(e.state.ball?.holdTimer).toBeLessThan(before!);
    e.destroy();
  });
});

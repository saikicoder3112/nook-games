export const W = 360
export const H = 540

export type Status = 'ready' | 'playing' | 'dead'

export type Pipe = {
  x: number
  gapY: number
  passed: boolean
}

export type State = {
  status: Status
  birdY: number
  birdVy: number
  pipes: Pipe[]
  score: number
  ground: number
  time: number
}

const GRAVITY = 1580
const FLAP = -430
const MAX_FALL = 640
const RUN_SPEED = 132
const PIPE_W = 56
const GAP = 168
const PIPE_SPACING = 240
const GROUND_H = 78
const BIRD_X = 92
const BIRD_R = 18
const CEILING = 8

export const BIRD = { x: BIRD_X, r: BIRD_R }
export const PIPE = { w: PIPE_W, gap: GAP }
export const GROUND = GROUND_H

export function createGame(): State {
  return {
    status: 'ready',
    birdY: H * 0.42,
    birdVy: 0,
    pipes: seedPipes(),
    score: 0,
    ground: 0,
    time: 0,
  }
}

export function flap(state: State): State {
  if (state.status === 'dead') return state
  const live = state.status === 'ready' ? begin(state) : state
  if (live.status !== 'playing') return live
  return { ...live, birdVy: FLAP }
}

export function begin(state: State): State {
  if (state.status !== 'ready') return state
  return { ...state, status: 'playing', birdVy: FLAP }
}

export function tick(state: State, dt: number): State {
  const step = Math.min(Math.max(dt, 0), 1 / 24)
  const time = state.time + step
  if (state.status === 'ready') {
    return {
      ...state,
      time,
      birdY: H * 0.42 + Math.sin(time * 3.2) * 8,
      ground: (state.ground + RUN_SPEED * 0.35 * step) % 48,
    }
  }
  if (state.status !== 'playing') return { ...state, time }
  const birdVy = Math.min(state.birdVy + GRAVITY * step, MAX_FALL)
  const birdY = state.birdY + birdVy * step
  const ground = (state.ground + RUN_SPEED * step) % 48
  let score = state.score
  const pipes = state.pipes.map((pipe) => {
    const x = pipe.x - RUN_SPEED * step
    const passed = pipe.passed || x + PIPE_W < BIRD_X
    if (!pipe.passed && passed) score += 1
    return { ...pipe, x, passed }
  })
  const kept = pipes.filter((pipe) => pipe.x + PIPE_W > -8)
  const lastX = kept.reduce((max, pipe) => Math.max(max, pipe.x), -Infinity)
  if (!Number.isFinite(lastX) || lastX < W - PIPE_SPACING) {
    kept.push({ x: (Number.isFinite(lastX) ? lastX : W) + PIPE_SPACING, gapY: randomGap(), passed: false })
  }
  const hit =
    birdY - BIRD_R < CEILING ||
    birdY + BIRD_R > H - GROUND_H ||
    kept.some((pipe) => hitsPipe(birdY, pipe))
  return {
    ...state,
    time,
    birdY,
    birdVy,
    pipes: kept,
    score,
    ground,
    status: hit ? 'dead' : 'playing',
  }
}

export function birdTilt(state: State) {
  if (state.status === 'ready') return 0
  return Math.max(-0.55, Math.min(1.15, state.birdVy / 720))
}

function seedPipes(): Pipe[] {
  return [0, 1, 2].map((index) => ({
    x: W + 120 + index * PIPE_SPACING,
    gapY: randomGap(),
    passed: false,
  }))
}

function randomGap() {
  const min = 96
  const max = H - GROUND_H - GAP - 88
  return min + Math.random() * (max - min)
}

function hitsPipe(birdY: number, pipe: Pipe) {
  const top = { x: pipe.x, y: 0, w: PIPE_W, h: pipe.gapY }
  const bot = {
    x: pipe.x,
    y: pipe.gapY + GAP,
    w: PIPE_W,
    h: H - GROUND_H - (pipe.gapY + GAP),
  }
  return circleRect(BIRD_X, birdY, BIRD_R, top) || circleRect(BIRD_X, birdY, BIRD_R, bot)
}

function circleRect(
  cx: number,
  cy: number,
  r: number,
  rect: { x: number; y: number; w: number; h: number },
) {
  if (rect.h <= 0 || rect.w <= 0) return false
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w))
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h))
  const dx = cx - nx
  const dy = cy - ny
  return dx * dx + dy * dy < r * r
}

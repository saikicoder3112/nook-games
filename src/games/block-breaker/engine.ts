export const W = 420
export const H = 560

export type Status = 'ready' | 'playing' | 'paused' | 'dead' | 'won'
export type BrickPower = 'none' | 'multiball'
export type Brick = {
  x: number
  y: number
  w: number
  h: number
  alive: boolean
  color: string
  points: number
  power: BrickPower
}
export type Paddle = { x: number; y: number; w: number; h: number; vx: number }
export type Ball = { x: number; y: number; r: number; vx: number; vy: number }

export type State = {
  paddle: Paddle
  balls: Ball[]
  bricks: Brick[]
  attached: boolean
  lives: number
  score: number
  status: Status
}

export type Input = {
  targetX: number | null
}

const PADDLE_W = 86
const PADDLE_H = 12
const PADDLE_Y = H - 34
const BALL_R = 6.4
const LAUNCH_SPEED = 290
const MAX_SPEED = 520
const MIN_SPEED = 270
const MAX_BALLS = 8
const BRICK_COLS = 10
const BRICK_ROWS = 5
const BRICK_GAP = 4
const BRICK_H = 16
const MARGIN = 14
const BRICK_TOP = 42
const ROW_COLORS = ['#e07a5f', '#f2a65a', '#e8c36a', '#7db4ff', '#c9a6ff']
const ROW_POINTS = [5, 4, 3, 2, 1]
const SPECIAL_CELLS = new Set(['0,2', '0,7', '1,4', '2,1', '2,8', '3,5'])

export function createGame(): State {
  const paddle = {
    x: (W - PADDLE_W) / 2,
    y: PADDLE_Y,
    w: PADDLE_W,
    h: PADDLE_H,
    vx: 0,
  }
  return {
    paddle,
    balls: [restBall(paddle)],
    bricks: layoutBricks(),
    attached: true,
    lives: 3,
    score: 0,
    status: 'ready',
  }
}

export function remainingBricks(state: State) {
  return state.bricks.reduce((count, brick) => count + (brick.alive ? 1 : 0), 0)
}

export function launch(state: State): State {
  if (state.status === 'dead' || state.status === 'won') return state
  if (state.status === 'paused') return { ...state, status: 'playing' }
  if (!state.attached) return state
  const nudge = state.paddle.vx !== 0 ? Math.sign(state.paddle.vx) : Math.random() < 0.5 ? -1 : 1
  const speed = LAUNCH_SPEED
  const parked = state.balls[0] ?? restBall(state.paddle)
  return {
    ...state,
    attached: false,
    status: 'playing',
    balls: [
      {
        ...parked,
        vx: nudge * speed * 0.42,
        vy: -speed * 0.91,
      },
    ],
  }
}

export function togglePause(state: State): State {
  if (state.status === 'playing') return { ...state, status: 'paused' }
  if (state.status === 'paused') return { ...state, status: 'playing' }
  if (state.status === 'ready' && state.attached) return launch(state)
  return state
}

export function aimPaddle(state: State, targetX: number) {
  const prev = state.paddle.x
  state.paddle.x = clamp(targetX - state.paddle.w / 2, 0, W - state.paddle.w)
  state.paddle.vx = (state.paddle.x - prev) * 60
  if (state.attached) parkBall(state)
  return state
}

export function tick(state: State, dt: number, input: Input): State {
  if (state.status === 'dead' || state.status === 'won') return state
  const capped = Math.min(0.032, Math.max(0, dt))
  movePaddle(state.paddle, capped, input)
  if (state.attached) {
    parkBall(state)
    return state
  }
  if (state.status !== 'playing') return state

  const maxSpeed = state.balls.reduce((top, ball) => Math.max(top, Math.hypot(ball.vx, ball.vy)), 0)
  const steps = Math.max(1, Math.ceil((maxSpeed * capped) / 3.5))
  const step = capped / steps
  for (let i = 0; i < steps; i += 1) {
    stepBalls(state, step)
    if (state.status !== 'playing' || state.attached) break
  }
  return state
}

function layoutBricks(): Brick[] {
  const inner = W - MARGIN * 2
  const brickW = (inner - BRICK_GAP * (BRICK_COLS - 1)) / BRICK_COLS
  const bricks: Brick[] = []
  for (let row = 0; row < BRICK_ROWS; row += 1) {
    for (let col = 0; col < BRICK_COLS; col += 1) {
      bricks.push({
        x: MARGIN + col * (brickW + BRICK_GAP),
        y: BRICK_TOP + row * (BRICK_H + BRICK_GAP),
        w: brickW,
        h: BRICK_H,
        alive: true,
        color: ROW_COLORS[row] ?? ROW_COLORS[ROW_COLORS.length - 1],
        points: ROW_POINTS[row] ?? 1,
        power: SPECIAL_CELLS.has(`${row},${col}`) ? 'multiball' : 'none',
      })
    }
  }
  return bricks
}

function restBall(paddle: Paddle): Ball {
  return {
    x: paddle.x + paddle.w / 2,
    y: paddle.y - BALL_R - 0.4,
    r: BALL_R,
    vx: 0,
    vy: 0,
  }
}

function parkBall(state: State) {
  state.balls = [restBall(state.paddle)]
}

function movePaddle(paddle: Paddle, dt: number, input: Input) {
  if (input.targetX == null) {
    paddle.vx = 0
    return
  }
  const prev = paddle.x
  paddle.x = clamp(input.targetX - paddle.w / 2, 0, W - paddle.w)
  paddle.vx = (paddle.x - prev) / Math.max(dt, 1 / 240)
}

function stepBalls(state: State, dt: number) {
  for (let i = state.balls.length - 1; i >= 0; i -= 1) {
    if (stepBall(state, state.balls[i], dt)) {
      state.balls.splice(i, 1)
    }
  }
  if (state.balls.length === 0) miss(state)
}

function stepBall(state: State, ball: Ball, dt: number) {
  ball.x += ball.vx * dt
  ball.y += ball.vy * dt

  if (ball.x - ball.r < 0) {
    ball.x = ball.r
    ball.vx = Math.abs(ball.vx)
  } else if (ball.x + ball.r > W) {
    ball.x = W - ball.r
    ball.vx = -Math.abs(ball.vx)
  }
  if (ball.y - ball.r < 0) {
    ball.y = ball.r
    ball.vy = Math.abs(ball.vy)
  }

  if (ball.y - ball.r > H) return true

  bouncePaddle(state, ball)

  for (const brick of state.bricks) {
    if (!brick.alive) continue
    if (!bounceCircleRect(ball, brick)) continue
    brick.alive = false
    state.score += brick.points
    scaleSpeed(ball, 1.012)
    if (brick.power === 'multiball') spawnExtraBall(state, ball, brick)
    if (remainingBricks(state) === 0) state.status = 'won'
    break
  }

  keepPlayable(ball)
  return false
}

function spawnExtraBall(state: State, source: Ball, brick: Brick) {
  if (state.balls.length >= MAX_BALLS) return
  const speed = Math.max(MIN_SPEED, Math.hypot(source.vx, source.vy))
  const angle = Math.atan2(source.vy, source.vx)
  const split = source.vx >= 0 ? -0.7 : 0.7
  state.balls.push({
    x: brick.x + brick.w / 2,
    y: brick.y + brick.h / 2,
    r: BALL_R,
    vx: Math.cos(angle + split) * speed,
    vy: Math.sin(angle + split) * speed,
  })
}

function bouncePaddle(state: State, ball: Ball) {
  const { paddle } = state
  if (ball.vy < 0) return
  if (!overlaps(ball, paddle)) return
  const hit = clamp((ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2), -1, 1)
  const speed = Math.max(MIN_SPEED, Math.hypot(ball.vx, ball.vy))
  const angle = hit * (Math.PI / 3)
  ball.vx = speed * Math.sin(angle)
  ball.vy = -Math.abs(speed * Math.cos(angle))
  ball.y = paddle.y - ball.r - 0.05
}

function miss(state: State) {
  const lives = state.lives - 1
  if (lives <= 0) {
    state.lives = 0
    state.status = 'dead'
    state.attached = false
    state.balls = []
    return
  }
  state.lives = lives
  state.attached = true
  parkBall(state)
}

function bounceCircleRect(ball: Ball, rect: { x: number; y: number; w: number; h: number }) {
  const closestX = clamp(ball.x, rect.x, rect.x + rect.w)
  const closestY = clamp(ball.y, rect.y, rect.y + rect.h)
  let dx = ball.x - closestX
  let dy = ball.y - closestY
  const dist2 = dx * dx + dy * dy
  if (dist2 >= ball.r * ball.r) return false

  if (dx === 0 && dy === 0) {
    const left = ball.x - rect.x
    const right = rect.x + rect.w - ball.x
    const top = ball.y - rect.y
    const bottom = rect.y + rect.h - ball.y
    const min = Math.min(left, right, top, bottom)
    if (min === left) {
      ball.x = rect.x - ball.r
      ball.vx = -Math.abs(ball.vx)
    } else if (min === right) {
      ball.x = rect.x + rect.w + ball.r
      ball.vx = Math.abs(ball.vx)
    } else if (min === top) {
      ball.y = rect.y - ball.r
      ball.vy = -Math.abs(ball.vy)
    } else {
      ball.y = rect.y + rect.h + ball.r
      ball.vy = Math.abs(ball.vy)
    }
    return true
  }

  const dist = Math.sqrt(dist2)
  const nx = dx / dist
  const ny = dy / dist
  const overlap = ball.r - dist
  ball.x += nx * overlap
  ball.y += ny * overlap
  const dot = ball.vx * nx + ball.vy * ny
  if (dot < 0) {
    ball.vx -= 2 * dot * nx
    ball.vy -= 2 * dot * ny
  }
  return true
}

function overlaps(ball: Ball, rect: { x: number; y: number; w: number; h: number }) {
  const closestX = clamp(ball.x, rect.x, rect.x + rect.w)
  const closestY = clamp(ball.y, rect.y, rect.y + rect.h)
  const dx = ball.x - closestX
  const dy = ball.y - closestY
  return dx * dx + dy * dy < ball.r * ball.r
}

function scaleSpeed(ball: Ball, factor: number) {
  const speed = Math.hypot(ball.vx, ball.vy)
  const next = clamp(speed * factor, MIN_SPEED, MAX_SPEED)
  if (speed === 0) return
  ball.vx *= next / speed
  ball.vy *= next / speed
}

function keepPlayable(ball: Ball) {
  const speed = Math.hypot(ball.vx, ball.vy)
  const target = clamp(speed, MIN_SPEED, MAX_SPEED)
  if (speed === 0) {
    ball.vy = -MIN_SPEED
    return
  }
  ball.vx *= target / speed
  ball.vy *= target / speed
  const floor = target * 0.32
  if (Math.abs(ball.vy) < floor) {
    ball.vy = Math.sign(ball.vy || -1) * floor
    const rest = Math.sqrt(Math.max(target * target - ball.vy * ball.vy, 1))
    ball.vx = Math.sign(ball.vx || 1) * rest
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

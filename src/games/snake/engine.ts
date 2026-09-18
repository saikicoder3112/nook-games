export type Dir = 'U' | 'D' | 'L' | 'R'
export type Status = 'ready' | 'playing' | 'paused' | 'dead' | 'won'
export type Pos = { x: number; y: number }

export type State = {
  w: number
  h: number
  snake: Pos[]
  dir: Dir
  queuedDir: Dir | null
  food: Pos
  score: number
  status: Status
}

const DELTA: Record<Dir, Pos> = {
  U: { x: 0, y: -1 },
  D: { x: 0, y: 1 },
  L: { x: -1, y: 0 },
  R: { x: 1, y: 0 },
}

const OPP: Record<Dir, Dir> = { U: 'D', D: 'U', L: 'R', R: 'L' }

export function createGame(w = 18, h = 18): State {
  const snake = [
    { x: Math.floor(w / 2), y: Math.floor(h / 2) },
    { x: Math.floor(w / 2) - 1, y: Math.floor(h / 2) },
    { x: Math.floor(w / 2) - 2, y: Math.floor(h / 2) },
  ]
  return {
    w,
    h,
    snake,
    dir: 'R',
    queuedDir: null,
    food: spawnFood(w, h, snake) ?? { x: 0, y: 0 },
    score: 0,
    status: 'ready',
  }
}

export function queueDir(state: State, dir: Dir): State {
  if (state.status === 'dead' || state.status === 'won') return state
  const current = state.queuedDir ?? state.dir
  if (dir === OPP[current] && state.snake.length > 1) return state
  if (state.status === 'ready' || state.status === 'paused') {
    return { ...state, dir, queuedDir: null, status: 'playing' }
  }
  return { ...state, queuedDir: dir }
}

export function togglePause(state: State): State {
  if (state.status === 'playing') return { ...state, status: 'paused' }
  if (state.status === 'paused') return { ...state, status: 'playing' }
  return state
}

export function tick(state: State): State {
  if (state.status !== 'playing') return state
  const dir = state.queuedDir ?? state.dir
  const head = state.snake[0]
  const next = { x: head.x + DELTA[dir].x, y: head.y + DELTA[dir].y }
  if (next.x < 0 || next.y < 0 || next.x >= state.w || next.y >= state.h) {
    return { ...state, dir, queuedDir: null, status: 'dead' }
  }
  const eating = next.x === state.food.x && next.y === state.food.y
  const body = eating ? state.snake : state.snake.slice(0, -1)
  if (body.some((part) => part.x === next.x && part.y === next.y)) {
    return { ...state, dir, queuedDir: null, status: 'dead' }
  }
  const snake = [next, ...body]
  if (!eating) {
    return { ...state, snake, dir, queuedDir: null }
  }
  const food = spawnFood(state.w, state.h, snake)
  if (!food) {
    return { ...state, snake, dir, queuedDir: null, score: state.score + 1, status: 'won' }
  }
  return { ...state, snake, dir, queuedDir: null, food, score: state.score + 1 }
}

export function stepMs(score: number) {
  return Math.max(70, 150 - score * 4)
}

function spawnFood(w: number, h: number, snake: Pos[]): Pos | null {
  const blocked = new Set(snake.map((part) => `${part.x},${part.y}`))
  const open: Pos[] = []
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!blocked.has(`${x},${y}`)) open.push({ x, y })
    }
  }
  if (!open.length) return null
  return open[Math.floor(Math.random() * open.length)]
}

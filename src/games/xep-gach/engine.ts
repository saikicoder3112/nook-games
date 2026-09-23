export type Kind = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'
export type Status = 'ready' | 'playing' | 'paused' | 'lost' | 'won'
export type Goal = 40 | 100 | 200
export type Piece = { kind: Kind; rot: number; x: number; y: number; fy: number }

export type State = {
  cols: number
  rows: number
  grid: (Kind | null)[][]
  current: Piece
  queue: Kind[]
  bag: Kind[]
  status: Status
  goal: Goal
  score: number
  lines: number
  level: number
  pieces: number
  elapsedMs: number
  lockMs: number
  lockResets: number
}

export const COLS = 10
export const ROWS = 20
export const KINDS: Kind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
export const GOALS: Goal[] = [40, 100, 200]
export const LOCK_MS = 520
export const MAX_LOCK_RESETS = 15

const FALL_MS = 820

const LINE_SCORE = [0, 100, 300, 500, 800]

/** 4 rotations, each 4 cells as [x, y] in a 4×4 box. */
export const SHAPES: Record<Kind, number[][][]> = {
  I: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  O: [
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
  ],
  T: [
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  S: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[1, 1], [2, 1], [0, 2], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  Z: [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[2, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[1, 0], [0, 1], [1, 1], [0, 2]],
  ],
  J: [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2]],
  ],
  L: [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
}

const JLSTZ_KICKS: Record<string, [number, number][]> = {
  '0>1': [[-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '1>0': [[1, 0], [1, -1], [0, 2], [1, 2]],
  '1>2': [[1, 0], [1, -1], [0, 2], [1, 2]],
  '2>1': [[-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '2>3': [[1, 0], [1, 1], [0, -2], [1, -2]],
  '3>2': [[-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '3>0': [[-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '0>3': [[1, 0], [1, 1], [0, -2], [1, -2]],
}

const I_KICKS: Record<string, [number, number][]> = {
  '0>1': [[-2, 0], [1, 0], [-2, -1], [1, 2]],
  '1>0': [[2, 0], [-1, 0], [2, 1], [-1, -2]],
  '1>2': [[-1, 0], [2, 0], [-1, 2], [2, -1]],
  '2>1': [[1, 0], [-2, 0], [1, -2], [-2, 1]],
  '2>3': [[2, 0], [-1, 0], [2, 1], [-1, -2]],
  '3>2': [[-2, 0], [1, 0], [-2, -1], [1, 2]],
  '3>0': [[1, 0], [-2, 0], [1, -2], [-2, 1]],
  '0>3': [[-1, 0], [2, 0], [-1, 2], [2, -1]],
}

export function createGame(goal: Goal = 40): State {
  const bag: Kind[] = []
  const queue: Kind[] = []
  while (queue.length < 5) queue.push(draw(bag))
  const kind = queue.shift() as Kind
  queue.push(draw(bag))
  return {
    cols: COLS,
    rows: ROWS,
    grid: emptyGrid(),
    current: spawn(kind),
    queue,
    bag,
    status: 'ready',
    goal,
    score: 0,
    lines: 0,
    level: 1,
    pieces: 1,
    elapsedMs: 0,
    lockMs: 0,
    lockResets: 0,
  }
}

export function gravityMs(_state: State) {
  return FALL_MS
}

export function begin(state: State): State {
  if (state.status === 'ready') return { ...state, status: 'playing' }
  return state
}

export function tickFall(state: State, dt: number, soft: boolean): State {
  if (state.status !== 'playing') return state
  if (!fits(state, shift(state.current, 0, 1))) {
    const grounded = state.current.fy === 0 ? state : { ...state, current: { ...state.current, fy: 0 } }
    return tickLock(grounded, dt)
  }
  const step = soft ? 22 : gravityMs(state)
  let fy = state.current.fy + dt / step
  let piece = state.current
  let score = state.score
  while (fy >= 1) {
    const down = shift(piece, 0, 1)
    if (!fits(state, down)) {
      return tickLock({ ...state, current: { ...piece, fy: 0 }, score }, dt)
    }
    piece = { ...down, fy: 0 }
    fy -= 1
    if (soft) score += 1
  }
  if (!fits(state, shift(piece, 0, 1))) {
    return tickLock({ ...state, current: { ...piece, fy: 0 }, score }, dt)
  }
  return { ...state, current: { ...piece, fy }, score, lockMs: 0, lockResets: 0 }
}

export function speedLevel(state: State) {
  const step = state.goal === 40 ? 5 : state.goal === 100 ? 10 : 20
  return Math.min(Math.floor(state.goal / step), Math.floor(state.lines / step) + 1)
}

export function tickClock(state: State, dt: number): State {
  if (state.status !== 'playing') return state
  return { ...state, elapsedMs: state.elapsedMs + dt }
}

export function togglePause(state: State): State {
  if (state.status === 'playing') return { ...state, status: 'paused' }
  if (state.status === 'paused') return { ...state, status: 'playing' }
  return state
}

export function move(state: State, dx: number): State {
  const live = wake(state)
  if (live.status !== 'playing') return live
  const next = shift(live.current, dx, 0)
  if (!fits(live, next)) return live
  return afterMove(live, next)
}

export function rotate(state: State, dir: 1 | -1): State {
  const live = wake(state)
  if (live.status !== 'playing') return live
  if (live.current.kind === 'O') return live
  const from = live.current.rot
  const to = (from + dir + 4) % 4
  const kicked = tryKicks(live, { ...live.current, rot: to }, from, to)
  if (!kicked) return live
  return afterMove(live, kicked)
}

export function hardDrop(state: State): State {
  const live = wake(state)
  if (live.status !== 'playing') return live
  const dropped = { ...dropToFloor(live, live.current), fy: 0 }
  const dist = dropped.y - live.current.y
  return lockPiece({ ...live, current: dropped, score: live.score + dist * 2 })
}

export function tickLock(state: State, dt: number): State {
  if (state.status !== 'playing') return state
  if (fits(state, shift(state.current, 0, 1))) {
    return state.lockMs === 0 ? state : { ...state, lockMs: 0, lockResets: 0 }
  }
  const lockMs = (state.lockMs <= 0 ? LOCK_MS : state.lockMs) - dt
  if (lockMs > 0) return { ...state, lockMs }
  return lockPiece(state)
}

export function cellsOf(piece: Piece) {
  return SHAPES[piece.kind][piece.rot].map(([x, y]) => ({ x: piece.x + x, y: piece.y + y }))
}

export function visualCells(piece: Piece) {
  return SHAPES[piece.kind][piece.rot].map(([x, y]) => ({
    x: piece.x + x,
    y: piece.y + y + piece.fy,
  }))
}

export function ghostPiece(state: State) {
  return { ...dropToFloor(state, state.current), fy: 0 }
}

function wake(state: State): State {
  if (state.status === 'paused') return { ...state, status: 'playing' }
  return state
}

function afterMove(state: State, current: Piece): State {
  const next = { ...state, current }
  const grounded = !fits(next, shift(current, 0, 1))
  if (!grounded) return { ...next, lockMs: 0, lockResets: 0 }
  const wasGrounded = !fits(state, shift(state.current, 0, 1))
  if (!wasGrounded) return { ...next, lockMs: LOCK_MS, lockResets: 0 }
  const lockResets = state.lockResets + 1
  if (lockResets >= MAX_LOCK_RESETS) return lockPiece(next)
  return { ...next, lockMs: LOCK_MS, lockResets }
}

function lockPiece(state: State): State {
  const grid = state.grid.map((row) => row.slice())
  for (const cell of cellsOf(state.current)) {
    if (cell.y < 0) return { ...state, status: 'lost' }
    if (cell.y < ROWS && cell.x >= 0 && cell.x < COLS) grid[cell.y][cell.x] = state.current.kind
  }
  const cleared = clearLines(grid)
  const lines = state.lines + cleared.count
  const level = speedLevel({ ...state, lines })
  const scored: State = {
    ...state,
    grid: cleared.grid,
    score: state.score + LINE_SCORE[cleared.count] * Math.max(1, state.level),
    lines,
    level,
    lockMs: 0,
    lockResets: 0,
  }
  if (lines >= state.goal) return { ...scored, status: 'won' }
  const bag = [...state.bag]
  const queue = [...state.queue]
  const kind = queue.shift() as Kind
  queue.push(draw(bag))
  const current = spawn(kind)
  const next: State = {
    ...scored,
    current,
    queue,
    bag,
    pieces: state.pieces + 1,
  }
  if (!fits(next, current)) return { ...next, status: 'lost' }
  return next
}

function clearLines(grid: (Kind | null)[][]) {
  const kept = grid.filter((row) => row.some((cell) => cell == null))
  const count = ROWS - kept.length
  while (kept.length < ROWS) kept.unshift(Array(COLS).fill(null))
  return { grid: kept, count }
}

function tryKicks(state: State, rotated: Piece, from: number, to: number): Piece | null {
  if (fits(state, rotated)) return rotated
  const table = state.current.kind === 'I' ? I_KICKS : JLSTZ_KICKS
  const tests = table[`${from}>${to}`] ?? []
  for (const [dx, dyUp] of tests) {
    const next = shift(rotated, dx, -dyUp)
    if (fits(state, next)) return next
  }
  return null
}

function dropToFloor(state: State, piece: Piece) {
  let current = piece
  let down = shift(current, 0, 1)
  while (fits(state, down)) {
    current = down
    down = shift(current, 0, 1)
  }
  return current
}

function fits(state: Pick<State, 'grid'>, piece: Piece) {
  return cellsOf(piece).every((cell) => {
    if (cell.x < 0 || cell.x >= COLS || cell.y >= ROWS) return false
    if (cell.y < 0) return true
    return state.grid[cell.y][cell.x] == null
  })
}

function shift(piece: Piece, dx: number, dy: number): Piece {
  return { ...piece, x: piece.x + dx, y: piece.y + dy }
}

function spawn(kind: Kind): Piece {
  return { kind, rot: 0, x: 3, y: 0, fy: 0 }
}

function draw(bag: Kind[]): Kind {
  if (!bag.length) {
    const next = KINDS.slice()
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[next[i], next[j]] = [next[j], next[i]]
    }
    bag.push(...next)
  }
  return bag.shift() as Kind
}

function emptyGrid() {
  return Array.from({ length: ROWS }, () => Array<Kind | null>(COLS).fill(null))
}

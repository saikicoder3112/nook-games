export type Difficulty = 'beginner' | 'intermediate' | 'expert'

export const PRESETS: Record<Difficulty, { w: number; h: number; mines: number; label: string }> = {
  beginner: { w: 9, h: 9, mines: 14, label: '9×9' },
  intermediate: { w: 16, h: 16, mines: 50, label: '16×16' },
  expert: { w: 16, h: 16, mines: 64, label: '16×16+' },
}

type Cell = {
  mine: boolean
  revealed: boolean
  flagged: boolean
  near: number
}

export type Status = 'ready' | 'playing' | 'won' | 'lost'

export type State = {
  difficulty: Difficulty
  w: number
  h: number
  mines: number
  cells: Cell[][]
  status: Status
  startedAt: number | null
  flags: number
}

export function createGame(difficulty: Difficulty): State {
  const preset = PRESETS[difficulty]
  return {
    difficulty,
    w: preset.w,
    h: preset.h,
    mines: preset.mines,
    cells: emptyBoard(preset.w, preset.h),
    status: 'ready',
    startedAt: null,
    flags: 0,
  }
}

export function reveal(state: State, x: number, y: number): State {
  if (state.status === 'won' || state.status === 'lost') return state
  const cell = state.cells[y]?.[x]
  if (!cell || cell.flagged) return state

  let next = state
  if (state.status === 'ready') {
    next = plantMines(state, x, y)
  }

  const cells = clone(next.cells)
  const target = cells[y][x]
  if (target.revealed) return next
  if (target.mine) {
    for (const row of cells) {
      for (const item of row) {
        if (item.mine) item.revealed = true
      }
    }
    return { ...next, cells, status: 'lost' }
  }

  flood(cells, next.w, next.h, x, y)
  return finish({ ...next, cells, status: 'playing', startedAt: next.startedAt ?? Date.now() })
}

export function toggleFlag(state: State, x: number, y: number): State {
  if (state.status === 'won' || state.status === 'lost') return state
  const cell = state.cells[y]?.[x]
  if (!cell || cell.revealed) return state
  const cells = clone(state.cells)
  cells[y][x].flagged = !cell.flagged
  const flags = cells.flat().filter((item) => item.flagged).length
  return { ...state, cells, flags }
}

function finish(state: State): State {
  const hiddenSafe = state.cells.flat().some((cell) => !cell.mine && !cell.revealed)
  if (hiddenSafe) return state
  return { ...state, status: 'won' }
}

function plantMines(state: State, safeX: number, safeY: number): State {
  const cells = emptyBoard(state.w, state.h)
  const spots: Array<[number, number]> = []
  for (let y = 0; y < state.h; y += 1) {
    for (let x = 0; x < state.w; x += 1) {
      if (Math.abs(x - safeX) <= 1 && Math.abs(y - safeY) <= 1) continue
      spots.push([x, y])
    }
  }
  for (let i = spots.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = spots[i]
    spots[i] = spots[j]
    spots[j] = tmp
  }
  for (const [x, y] of spots.slice(0, state.mines)) {
    cells[y][x].mine = true
  }
  for (let y = 0; y < state.h; y += 1) {
    for (let x = 0; x < state.w; x += 1) {
      if (cells[y][x].mine) continue
      cells[y][x].near = neighbors(state.w, state.h, x, y).filter(([nx, ny]) => cells[ny][nx].mine).length
    }
  }
  return { ...state, cells, status: 'playing', startedAt: Date.now() }
}

function flood(cells: Cell[][], w: number, h: number, x: number, y: number) {
  const stack = [[x, y]]
  while (stack.length) {
    const [cx, cy] = stack.pop()!
    const cell = cells[cy]?.[cx]
    if (!cell || cell.revealed || cell.flagged || cell.mine) continue
    cell.revealed = true
    if (cell.near === 0) {
      for (const [nx, ny] of neighbors(w, h, cx, cy)) stack.push([nx, ny])
    }
  }
}

function neighbors(w: number, h: number, x: number, y: number) {
  const out: Array<[number, number]> = []
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue
      const nx = x + dx
      const ny = y + dy
      if (nx >= 0 && ny >= 0 && nx < w && ny < h) out.push([nx, ny])
    }
  }
  return out
}

function emptyBoard(w: number, h: number): Cell[][] {
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ mine: false, revealed: false, flagged: false, near: 0 })),
  )
}

function clone(cells: Cell[][]): Cell[][] {
  return cells.map((row) => row.map((cell) => ({ ...cell })))
}

export type Cell = 'wall' | 'empty' | 'x' | 'o'
export type Dir = 'U' | 'D' | 'L' | 'R'
export type Status = 'playing' | 'won' | 'lost'

export type Level = {
  id: string
  name: string
  par: number
  cells: Cell[][]
  player: { x: number; y: number }
}

export type State = {
  levelId: string
  cells: Cell[][]
  player: { x: number; y: number }
  moves: number
  status: Status
  startedAt: number | null
}

export const DIRS: Dir[] = ['U', 'D', 'L', 'R']

export const DELTA: Record<Dir, { x: number; y: number }> = {
  U: { x: 0, y: -1 },
  D: { x: 0, y: 1 },
  L: { x: -1, y: 0 },
  R: { x: 1, y: 0 },
}

export function parseLevel(id: string, name: string, par: number, ascii: string): Level {
  const rows = ascii
    .trim()
    .split('\n')
    .map((line) => line.trim())
  let player: { x: number; y: number } | null = null
  const cells: Cell[][] = rows.map((row, y) =>
    [...row].map((ch, x) => {
      if (ch === 'P') {
        player = { x, y }
        return 'empty'
      }
      if (ch === '#') return 'wall'
      if (ch === 'X') return 'x'
      if (ch === 'O') return 'o'
      return 'empty'
    }),
  )
  if (!player) {
    throw new Error(`Level ${id} needs a P`)
  }
  return { id, name, par, cells, player }
}

export function startLevel(level: Level): State {
  const state: State = {
    levelId: level.id,
    cells: cloneCells(level.cells),
    player: { ...level.player },
    moves: 0,
    status: 'playing',
    startedAt: null,
  }
  return { ...state, status: outcome(state) }
}

export function move(state: State, dir: Dir): State {
  if (state.status !== 'playing') return state
  const { x: dx, y: dy } = DELTA[dir]
  const nx = state.player.x + dx
  const ny = state.player.y + dy
  const target = getCell(state.cells, nx, ny)
  if (target === undefined || target === 'wall') return state

  const cells = cloneCells(state.cells)
  if (target === 'x' || target === 'o') {
    const bx = nx + dx
    const by = ny + dy
    if (getCell(cells, bx, by) !== 'empty') return state
    cells[by][bx] = target
    cells[ny][nx] = 'empty'
  }

  const next: State = {
    ...state,
    cells,
    player: { x: nx, y: ny },
    moves: state.moves + 1,
    startedAt: state.startedAt ?? Date.now(),
  }
  return { ...next, status: outcome(next) }
}

function outcome(state: State): Status {
  const xRun = longestRun(state, 'x')
  const oRun = longestRun(state, 'o')
  if (xRun >= 3) return 'lost'
  if (oRun >= 3) return 'won'
  return 'playing'
}

function longestRun(state: State, token: 'x' | 'o'): number {
  const h = state.cells.length
  const w = state.cells[0]?.length ?? 0
  let best = 0

  const at = (x: number, y: number) => mark(state, x, y)

  for (let y = 0; y < h; y += 1) {
    let run = 0
    for (let x = 0; x < w; x += 1) {
      if (at(x, y) === token) {
        run += 1
        best = Math.max(best, run)
      } else run = 0
    }
  }
  for (let x = 0; x < w; x += 1) {
    let run = 0
    for (let y = 0; y < h; y += 1) {
      if (at(x, y) === token) {
        run += 1
        best = Math.max(best, run)
      } else run = 0
    }
  }
  return best
}

function mark(state: State, x: number, y: number): Cell | 'player' {
  if (state.player.x === x && state.player.y === y) return 'o'
  return state.cells[y][x]
}

function getCell(cells: Cell[][], x: number, y: number): Cell | undefined {
  return cells[y]?.[x]
}

function cloneCells(cells: Cell[][]): Cell[][] {
  return cells.map((row) => [...row])
}

export function shortestWin(level: Level, maxMoves = 40, maxStates = 120_000): number | null {
  return solve(level, maxMoves, maxStates)?.moves ?? null
}

export function solve(
  level: Level,
  maxMoves = 40,
  maxStates = 120_000,
): { moves: number; path: State[] } | null {
  const start = startLevel(level)
  if (start.status === 'won') return { moves: 0, path: [start] }
  if (start.status !== 'playing') return null

  const startKey = stateKey(start)
  const seen = new Set<string>([startKey])
  const parent = new Map<string, string | null>([[startKey, null]])
  const stored = new Map<string, State>([[startKey, start]])
  const queue: State[] = [start]
  let head = 0

  while (head < queue.length) {
    if (seen.size > maxStates) return null
    const current = queue[head]
    head += 1
    if (current.moves >= maxMoves) continue
    const currentKey = stateKey(current)
    for (const dir of DIRS) {
      const next = move(current, dir)
      if (next === current || next.status === 'lost') continue
      const key = stateKey(next)
      if (seen.has(key)) continue
      seen.add(key)
      parent.set(key, currentKey)
      stored.set(key, next)
      if (next.status === 'won') {
        return { moves: next.moves, path: reconstruct(parent, stored, key) }
      }
      queue.push(next)
    }
  }
  return null
}

function reconstruct(parent: Map<string, string | null>, stored: Map<string, State>, endKey: string) {
  const path: State[] = []
  let key: string | null = endKey
  while (key) {
    const state = stored.get(key)
    if (!state) break
    path.push(state)
    key = parent.get(key) ?? null
  }
  path.reverse()
  return path
}

function stateKey(state: State) {
  const board = state.cells.map((row) => row.map((cell) => cell[0]).join('')).join('')
  return `${state.player.x},${state.player.y}:${board}`
}

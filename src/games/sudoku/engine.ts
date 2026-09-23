export type Difficulty = 'easy' | 'medium' | 'hard'
export type Status = 'ready' | 'playing' | 'won'

export type Cell = {
  value: number
  given: boolean
  notes: number
}

export type State = {
  difficulty: Difficulty
  grid: Cell[]
  solution: number[]
  selected: number | null
  noteMode: boolean
  status: Status
  hints: number
}

export const SIZE = 9
export const LABELS: Record<Difficulty, string> = {
  easy: 'Dễ',
  medium: 'Vừa',
  hard: 'Khó',
}

const HOLES: Record<Difficulty, number> = {
  easy: 40,
  medium: 48,
  hard: 54,
}

export function createGame(difficulty: Difficulty = 'easy'): State {
  const { puzzle, solution } = generate(difficulty)
  return {
    difficulty,
    grid: puzzle.map((value) => ({
      value,
      given: value !== 0,
      notes: 0,
    })),
    solution,
    selected: firstEmpty(puzzle),
    noteMode: false,
    status: 'ready',
    hints: 0,
  }
}

export function selectCell(state: State, index: number): State {
  if (index < 0 || index >= 81) return state
  return { ...state, selected: index }
}

export function moveSelection(state: State, dx: number, dy: number): State {
  const current = state.selected ?? 0
  const x = ((current % SIZE) + dx + SIZE) % SIZE
  const y = (Math.floor(current / SIZE) + dy + SIZE) % SIZE
  return { ...state, selected: y * SIZE + x }
}

export function toggleNoteMode(state: State): State {
  return { ...state, noteMode: !state.noteMode }
}

export function enterDigit(state: State, digit: number): State {
  if (state.status === 'won' || digit < 1 || digit > 9) return state
  const index = state.selected
  if (index == null) return state
  const cell = state.grid[index]
  if (cell.given) return state
  const live = wake(state)
  if (live.noteMode) {
    const notes = cell.notes ^ (1 << digit)
    return patchCell(live, index, { ...cell, notes, value: 0 })
  }
  const next = patchCell(live, index, { ...cell, value: digit, notes: 0 })
  return finishIfSolved(clearNotesOf(next, index, digit))
}

export function erase(state: State): State {
  if (state.status === 'won') return state
  const index = state.selected
  if (index == null) return state
  const cell = state.grid[index]
  if (cell.given) return state
  return patchCell(wake(state), index, { ...cell, value: 0, notes: 0 })
}

export function hint(state: State): State {
  if (state.status === 'won') return state
  const index =
    state.selected != null && !state.grid[state.selected].given && state.grid[state.selected].value !== state.solution[state.selected]
      ? state.selected
      : state.grid.findIndex((cell, i) => cell.value !== state.solution[i])
  if (index < 0) return finishIfSolved(state)
  const cell = state.grid[index]
  const next = patchCell(wake(state), index, { ...cell, value: state.solution[index], notes: 0, given: false })
  next.hints += 1
  return finishIfSolved(clearNotesOf(next, index, next.solution[index]))
}

export function emptyCount(state: State) {
  return state.grid.reduce((count, cell) => count + (cell.value === 0 ? 1 : 0), 0)
}

export function conflicts(state: State): boolean[] {
  const bad = Array(81).fill(false)
  const values = state.grid.map((cell) => cell.value)
  for (let i = 0; i < 81; i += 1) {
    const value = values[i]
    if (!value) continue
    for (const peer of peers(i)) {
      if (values[peer] === value) {
        bad[i] = true
        bad[peer] = true
      }
    }
  }
  return bad
}

function generate(difficulty: Difficulty) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const rand = mulberry32((Math.random() * 0xffffffff) >>> 0)
    const board = Array(81).fill(0)
    if (!fillBoard(board, rand)) continue
    const solution = board.slice()
    carve(board, HOLES[difficulty], rand)
    return { puzzle: board, solution }
  }
  return fallbackPuzzle(difficulty)
}

function fillBoard(board: number[], rand: () => number): boolean {
  const index = pickEmpty(board)
  if (index < 0) return true
  for (const digit of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rand)) {
    if (!canPlace(board, index, digit)) continue
    board[index] = digit
    if (fillBoard(board, rand)) return true
    board[index] = 0
  }
  return false
}

function carve(board: number[], holes: number, rand: () => number) {
  const order = shuffle(
    Array.from({ length: 81 }, (_, index) => index),
    rand,
  )
  let removed = 0
  const started = performance.now()
  for (const index of order) {
    if (removed >= holes) break
    if (performance.now() - started > 140) break
    const keep = board[index]
    board[index] = 0
    if (countSolutions(board.slice(), 2) !== 1) board[index] = keep
    else removed += 1
  }
}

function countSolutions(board: number[], limit: number): number {
  let found = 0
  function search(): boolean {
    const index = pickEmpty(board)
    if (index < 0) {
      found += 1
      return found >= limit
    }
    for (let digit = 1; digit <= 9; digit += 1) {
      if (!canPlace(board, index, digit)) continue
      board[index] = digit
      const stop = search()
      board[index] = 0
      if (stop) return true
    }
    return false
  }
  search()
  return found
}

function pickEmpty(board: number[]) {
  let best = -1
  let bestCount = 10
  for (let i = 0; i < 81; i += 1) {
    if (board[i]) continue
    let count = 0
    for (let digit = 1; digit <= 9; digit += 1) if (canPlace(board, i, digit)) count += 1
    if (count === 0) return i
    if (count < bestCount) {
      best = i
      bestCount = count
      if (count === 1) return i
    }
  }
  return best
}

function canPlace(board: number[], index: number, digit: number) {
  const row = Math.floor(index / SIZE)
  const col = index % SIZE
  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3
  for (let k = 0; k < 9; k += 1) {
    if (board[row * SIZE + k] === digit) return false
    if (board[k * SIZE + col] === digit) return false
    if (board[(boxRow + Math.floor(k / 3)) * SIZE + boxCol + (k % 3)] === digit) return false
  }
  return true
}

function peers(index: number) {
  const row = Math.floor(index / SIZE)
  const col = index % SIZE
  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3
  const out: number[] = []
  for (let k = 0; k < 9; k += 1) {
    out.push(row * SIZE + k)
    out.push(k * SIZE + col)
    out.push((boxRow + Math.floor(k / 3)) * SIZE + boxCol + (k % 3))
  }
  return out.filter((peer) => peer !== index)
}

function patchCell(state: State, index: number, cell: Cell): State {
  const grid = state.grid.slice()
  grid[index] = cell
  return { ...state, grid }
}

function clearNotesOf(state: State, index: number, digit: number): State {
  const bit = 1 << digit
  let changed = false
  const grid = state.grid.map((cell, i) => {
    if (i === index || !cell.notes || (cell.notes & bit) === 0) return cell
    if (!sameUnit(index, i)) return cell
    changed = true
    return { ...cell, notes: cell.notes & ~bit }
  })
  return changed ? { ...state, grid } : state
}

function sameUnit(a: number, b: number) {
  const ra = Math.floor(a / SIZE)
  const rb = Math.floor(b / SIZE)
  const ca = a % SIZE
  const cb = b % SIZE
  return ra === rb || ca === cb || (Math.floor(ra / 3) === Math.floor(rb / 3) && Math.floor(ca / 3) === Math.floor(cb / 3))
}

function finishIfSolved(state: State): State {
  const solved = state.grid.every((cell, index) => cell.value === state.solution[index])
  return solved ? { ...state, status: 'won', selected: null, noteMode: false } : state
}

function wake(state: State): State {
  return state.status === 'ready' ? { ...state, status: 'playing' } : state
}

function firstEmpty(puzzle: number[]) {
  const index = puzzle.findIndex((value) => value === 0)
  return index < 0 ? 0 : index
}

function shuffle<T>(items: T[], rand: () => number) {
  const next = items.slice()
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function fallbackPuzzle(difficulty: Difficulty): { puzzle: number[]; solution: number[] } {
  const solution = [
    5, 3, 4, 6, 7, 8, 9, 1, 2, 6, 7, 2, 1, 9, 5, 3, 4, 8, 1, 9, 8, 3, 4, 2, 5, 6, 7, 8, 5, 9, 7, 6, 1, 4, 2, 3, 4, 2, 6, 8, 5, 3, 7, 9, 1, 7, 1, 3, 9, 2, 4, 8, 5, 6, 9, 6, 1, 5, 3, 7, 2, 8, 4, 2, 8, 7, 4, 1, 9, 6, 3, 5, 3, 4, 5, 2, 8, 6, 1, 7, 9,
  ]
  const holes = HOLES[difficulty]
  const puzzle = solution.slice()
  for (let i = 0; i < holes; i += 1) puzzle[i] = 0
  return { puzzle, solution }
}

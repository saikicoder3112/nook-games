export const COLORS = ['#e07a5f', '#f2a65a', '#e8c36a', '#9fd36a', '#5eb8d6', '#7db4ff', '#c9a6ff', '#f3ece1']

export type Pos = { x: number; y: number }
export type Status = 'playing' | 'won'
export type State = {
  w: number
  h: number
  cells: (number | null)[][]
  selected: Pos | null
  hint: [Pos, Pos] | null
  path: Pos[] | null
  pathId: number
  remaining: number
  matches: number
  shuffled: boolean
  status: Status
}

const DIRS: Pos[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]

const WIDTH = 10
const HEIGHT = 8

export function createGame(w = WIDTH, h = HEIGHT): State {
  const cells = fillSolvable(w, h)
  return {
    w,
    h,
    cells,
    selected: null,
    hint: null,
    path: null,
    pathId: 0,
    remaining: w * h,
    matches: 0,
    shuffled: false,
    status: 'playing',
  }
}

export function remainingPairs(state: State) {
  return state.remaining / 2
}

export function tap(state: State, x: number, y: number): State {
  if (state.status === 'won') return state
  const color = state.cells[y]?.[x]
  if (color == null) {
    return { ...state, selected: null, hint: null, shuffled: false }
  }
  const selected = state.selected
  if (!selected) {
    return { ...state, selected: { x, y }, hint: null, shuffled: false }
  }
  if (selected.x === x && selected.y === y) {
    return { ...state, selected: null, shuffled: false }
  }
  const other = state.cells[selected.y][selected.x]
  if (other !== color) {
    return { ...state, selected: { x, y }, hint: null, shuffled: false }
  }
  const path = findPath(state.cells, selected, { x, y })
  if (!path) {
    return { ...state, selected: { x, y }, hint: null, shuffled: false }
  }
  const cells = cloneCells(state.cells)
  cells[selected.y][selected.x] = null
  cells[y][x] = null
  const remaining = state.remaining - 2
  if (remaining === 0) {
    return {
      ...state,
      cells,
      selected: null,
      hint: null,
      path,
      pathId: state.pathId + 1,
      remaining,
      matches: state.matches + 1,
      shuffled: false,
      status: 'won',
    }
  }
  let next = cells
  let shuffled = false
  if (!hasMove(next)) {
    next = shuffleUntilMove(next)
    shuffled = true
  }
  return {
    ...state,
    cells: next,
    selected: null,
    hint: null,
    path,
    pathId: state.pathId + 1,
    remaining,
    matches: state.matches + 1,
    shuffled,
    status: 'playing',
  }
}

export function shuffleBoard(state: State): State {
  if (state.status === 'won') return state
  return {
    ...state,
    cells: shuffleUntilMove(state.cells),
    selected: null,
    hint: null,
    path: null,
    shuffled: true,
  }
}

export function hint(state: State): State {
  if (state.status === 'won') return state
  let cells = state.cells
  let shuffled = false
  let move = findMove(cells)
  if (!move) {
    cells = shuffleUntilMove(cells)
    shuffled = true
    move = findMove(cells)
  }
  if (!move) return { ...state, cells, shuffled, selected: null, hint: null }
  return { ...state, cells, shuffled, selected: null, hint: move }
}

export function clearPath(state: State): State {
  if (!state.path) return state
  return { ...state, path: null }
}

export function findPath(cells: (number | null)[][], a: Pos, b: Pos): Pos[] | null {
  if (a.x === b.x && a.y === b.y) return null
  const h = cells.length
  const w = cells[0]?.length ?? 0
  const visited = new Map<string, number>()
  const prev = new Map<string, { key: string; x: number; y: number }>()
  const queue: { x: number; y: number; dir: number; turns: number }[] = []

  for (let dir = 0; dir < 4; dir += 1) {
    const nx = a.x + DIRS[dir].x
    const ny = a.y + DIRS[dir].y
    if (!walkable(cells, w, h, nx, ny, a, b)) continue
    const key = `${nx},${ny},${dir}`
    visited.set(key, 0)
    prev.set(key, { key: 'start', x: a.x, y: a.y })
    queue.push({ x: nx, y: ny, dir, turns: 0 })
  }

  let head = 0
  let goal: { x: number; y: number; dir: number } | null = null
  while (head < queue.length) {
    const node = queue[head]
    head += 1
    if (node.x === b.x && node.y === b.y) {
      goal = node
      break
    }
    for (let nd = 0; nd < 4; nd += 1) {
      const turns = nd === node.dir ? node.turns : node.turns + 1
      if (turns > 2) continue
      const nx = node.x + DIRS[nd].x
      const ny = node.y + DIRS[nd].y
      if (!walkable(cells, w, h, nx, ny, a, b)) continue
      const key = `${nx},${ny},${nd}`
      const best = visited.get(key)
      if (best != null && best <= turns) continue
      visited.set(key, turns)
      prev.set(key, { key: `${node.x},${node.y},${node.dir}`, x: node.x, y: node.y })
      queue.push({ x: nx, y: ny, dir: nd, turns })
    }
  }

  if (!goal) return null
  const path: Pos[] = [{ x: goal.x, y: goal.y }]
  let cursor = `${goal.x},${goal.y},${goal.dir}`
  while (cursor !== 'start') {
    const parent = prev.get(cursor)
    if (!parent) break
    path.push({ x: parent.x, y: parent.y })
    cursor = parent.key
  }
  path.reverse()
  return path
}

function fillSolvable(w: number, h: number) {
  const cells = Array.from({ length: h }, () => Array<number | null>(w).fill(null))
  const pairCount = (w * h) / 2
  const colors = Array.from({ length: pairCount }, (_, index) => index % COLORS.length)
  shuffleInPlace(colors)
  for (const color of colors) {
    const pair = pickConnectablePair(cells)
    if (!pair) {
      const empties = listEmpty(cells)
      cells[empties[0].y][empties[0].x] = color
      cells[empties[1].y][empties[1].x] = color
      continue
    }
    cells[pair[0].y][pair[0].x] = color
    cells[pair[1].y][pair[1].x] = color
  }
  return hasMove(cells) ? cells : shuffleUntilMove(cells)
}

function pickConnectablePair(cells: (number | null)[][]): [Pos, Pos] | null {
  const empties = listEmpty(cells)
  shuffleInPlace(empties)
  for (const start of empties) {
    const reach = reachableEmpty(cells, start)
    if (!reach.length) continue
    return [start, reach[Math.floor(Math.random() * reach.length)]]
  }
  return null
}

function reachableEmpty(cells: (number | null)[][], start: Pos) {
  const h = cells.length
  const w = cells[0]?.length ?? 0
  const found: Pos[] = []
  const seen = new Set<string>()
  const visited = new Map<string, number>()
  const queue: { x: number; y: number; dir: number; turns: number }[] = []
  for (let dir = 0; dir < 4; dir += 1) {
    const nx = start.x + DIRS[dir].x
    const ny = start.y + DIRS[dir].y
    if (!walkable(cells, w, h, nx, ny, start, start)) continue
    const key = `${nx},${ny},${dir}`
    visited.set(key, 0)
    queue.push({ x: nx, y: ny, dir, turns: 0 })
  }
  let head = 0
  while (head < queue.length) {
    const node = queue[head]
    head += 1
    const inner = node.x >= 0 && node.y >= 0 && node.x < w && node.y < h
    if (inner && cells[node.y][node.x] == null && (node.x !== start.x || node.y !== start.y)) {
      const id = `${node.x},${node.y}`
      if (!seen.has(id)) {
        seen.add(id)
        found.push({ x: node.x, y: node.y })
      }
    }
    for (let nd = 0; nd < 4; nd += 1) {
      const turns = nd === node.dir ? node.turns : node.turns + 1
      if (turns > 2) continue
      const nx = node.x + DIRS[nd].x
      const ny = node.y + DIRS[nd].y
      if (!walkable(cells, w, h, nx, ny, start, start)) continue
      const key = `${nx},${ny},${nd}`
      const best = visited.get(key)
      if (best != null && best <= turns) continue
      visited.set(key, turns)
      queue.push({ x: nx, y: ny, dir: nd, turns })
    }
  }
  return found
}

function walkable(
  cells: (number | null)[][],
  w: number,
  h: number,
  x: number,
  y: number,
  start: Pos,
  end: Pos,
) {
  if (x === start.x && y === start.y) return true
  if (x === end.x && y === end.y) return true
  if (x < -1 || y < -1 || x > w || y > h) return false
  if (x < 0 || y < 0 || x >= w || y >= h) return true
  return cells[y][x] == null
}

function hasMove(cells: (number | null)[][]) {
  return findMove(cells) != null
}

function findMove(cells: (number | null)[][]): [Pos, Pos] | null {
  const groups = new Map<number, Pos[]>()
  for (let y = 0; y < cells.length; y += 1) {
    for (let x = 0; x < cells[y].length; x += 1) {
      const color = cells[y][x]
      if (color == null) continue
      const list = groups.get(color) ?? []
      list.push({ x, y })
      groups.set(color, list)
    }
  }
  for (const list of groups.values()) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        if (findPath(cells, list[i], list[j])) return [list[i], list[j]]
      }
    }
  }
  return null
}

function shuffleUntilMove(cells: (number | null)[][]) {
  let next = shuffleTiles(cells)
  for (let i = 0; i < 40 && !hasMove(next); i += 1) {
    next = shuffleTiles(next)
  }
  return next
}

function shuffleTiles(cells: (number | null)[][]) {
  const tiles: number[] = []
  const spots: Pos[] = []
  for (let y = 0; y < cells.length; y += 1) {
    for (let x = 0; x < cells[y].length; x += 1) {
      const color = cells[y][x]
      if (color == null) continue
      tiles.push(color)
      spots.push({ x, y })
    }
  }
  shuffleInPlace(tiles)
  const next = cells.map((row) => row.map(() => null as number | null))
  spots.forEach((spot, index) => {
    next[spot.y][spot.x] = tiles[index]
  })
  return next
}

function listEmpty(cells: (number | null)[][]) {
  const empties: Pos[] = []
  for (let y = 0; y < cells.length; y += 1) {
    for (let x = 0; x < cells[y].length; x += 1) {
      if (cells[y][x] == null) empties.push({ x, y })
    }
  }
  return empties
}

function cloneCells(cells: (number | null)[][]) {
  return cells.map((row) => row.slice())
}

function shuffleInPlace<T>(items: T[]) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
}

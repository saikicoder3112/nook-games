import {
  DELTA,
  DIRS,
  solve,
  startLevel,
  type Cell,
  type Level,
  type State,
} from './engine'

export type GenerateOptions = {
  id: string
  name: string
  width: number
  height: number
  xCount: number
  seed: number
  walls?: string
  reverseSteps?: number
  minPar?: number
}

const TEMPLATES_8 = [
  `
....#...
....#...
....##..
........
........
........
........
........
`,
  `
........
...###..
........
.###....
........
........
........
........
`,
  `
..#..#..
........
##......
......##
........
..#..#..
........
........
`,
]

/**
 * Sinh vị trí P/O/X:
 * 1) Đặt thế thắng O-P-O trên 3 ô trống liên tiếp
 * 2) Xáo ngược (đi / kéo O) để ra vị trí bắt đầu
 * 3) Giải bàn chỉ có O — đường đi đó chắc chắn thắng
 * 4) Rải X vào ô không nằm trên đường giải, không tạo 3 X sẵn
 */
export function generatePuzzle(options: GenerateOptions): Level | null {
  const rand = mulberry32(options.seed >>> 0)
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const walls = options.walls ?? TEMPLATES_8[Math.floor(rand() * TEMPLATES_8.length)]
    const level = tryGenerate(options, walls, rand)
    if (level) return level
  }
  return null
}

function tryGenerate(options: GenerateOptions, walls: string, rand: () => number): Level | null {
  const cells = parseWalls(walls, options.width, options.height)
  const slots = winSlots(cells)
  if (!slots.length) return null

  const slot = slots[Math.floor(rand() * slots.length)]
  cells[slot[0].y][slot[0].x] = 'o'
  cells[slot[2].y][slot[2].x] = 'o'
  let state: State = {
    levelId: options.id,
    cells,
    player: { ...slot[1] },
    moves: 0,
    status: 'playing',
    startedAt: null,
  }

  const steps = options.reverseSteps ?? 28 + Math.floor(rand() * 14)
  for (let i = 0; i < steps; i += 1) {
    const { walks, pulls } = reverseMoves(state)
    const pool = pulls.length && rand() < 0.84 ? pulls : [...pulls, ...walks]
    if (!pool.length) break
    state = pool[Math.floor(rand() * pool.length)]
  }

  const scrambled: Level = {
    id: options.id,
    name: options.name,
    par: 0,
    cells: state.cells,
    player: state.player,
  }
  const opened = startLevel(scrambled)
  if (opened.status !== 'playing') return null

  const solution = solve(scrambled, 50, 80_000)
  if (!solution || solution.moves < (options.minPar ?? 8)) return null

  const reserved = reservedCells(solution.path)
  const placed = placeXs(state.cells, state.player, reserved, options.xCount, rand)
  if (!placed) return null

  const level: Level = {
    id: options.id,
    name: options.name,
    par: solution.moves,
    cells: state.cells,
    player: state.player,
  }
  if (startLevel(level).status !== 'playing') return null
  return level
}

function parseWalls(ascii: string, width: number, height: number): Cell[][] {
  const rows = ascii
    .trim()
    .split('\n')
    .map((line) => line.trim())
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => (rows[y]?.[x] === '#' ? 'wall' : 'empty')),
  )
}

function winSlots(cells: Cell[][]) {
  const h = cells.length
  const w = cells[0]?.length ?? 0
  const slots: Array<Array<{ x: number; y: number }>> = []
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w - 2; x += 1) {
      const triple = [0, 1, 2].map((i) => ({ x: x + i, y }))
      if (triple.every((pos) => cells[pos.y][pos.x] === 'empty')) slots.push(triple)
    }
  }
  for (let x = 0; x < w; x += 1) {
    for (let y = 0; y < h - 2; y += 1) {
      const triple = [0, 1, 2].map((i) => ({ x, y: y + i }))
      if (triple.every((pos) => cells[pos.y][pos.x] === 'empty')) slots.push(triple)
    }
  }
  return slots
}

function reverseMoves(state: State): { walks: State[]; pulls: State[] } {
  const walks: State[] = []
  const pulls: State[] = []
  for (const dir of DIRS) {
    const { x: dx, y: dy } = DELTA[dir]
    const nx = state.player.x + dx
    const ny = state.player.y + dy
    if (state.cells[ny]?.[nx] === 'empty') {
      walks.push({
        ...state,
        player: { x: nx, y: ny },
      })
    }
    const bx = state.player.x - dx
    const by = state.player.y - dy
    const fx = state.player.x + dx
    const fy = state.player.y + dy
    if (state.cells[by]?.[bx] !== 'empty' || state.cells[fy]?.[fx] !== 'o') continue
    const cells = state.cells.map((row) => [...row])
    cells[state.player.y][state.player.x] = 'o'
    cells[fy][fx] = 'empty'
    pulls.push({
      ...state,
      cells,
      player: { x: bx, y: by },
    })
  }
  return { walks, pulls }
}

function reservedCells(path: State[]) {
  const reserved = new Set<string>()
  for (const state of path) {
    reserved.add(`${state.player.x},${state.player.y}`)
    state.cells.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === 'o') reserved.add(`${x},${y}`)
      })
    })
  }
  return reserved
}

function placeXs(
  cells: Cell[][],
  player: { x: number; y: number },
  reserved: Set<string>,
  count: number,
  rand: () => number,
) {
  const spots: Array<{ x: number; y: number }> = []
  cells.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell !== 'empty') return
      if (player.x === x && player.y === y) return
      if (reserved.has(`${x},${y}`)) return
      spots.push({ x, y })
    })
  })
  shuffle(spots, rand)
  let placed = 0
  const tryPlace = (isolated: boolean) => {
    for (const spot of spots) {
      if (placed === count) return
      if (cells[spot.y][spot.x] !== 'empty') continue
      if (isolated && hasXNeighbor(cells, spot.x, spot.y)) continue
      cells[spot.y][spot.x] = 'x'
      if (hasThreeX(cells)) {
        cells[spot.y][spot.x] = 'empty'
        continue
      }
      placed += 1
    }
  }
  tryPlace(true)
  tryPlace(false)
  return placed === count
}

function hasXNeighbor(cells: Cell[][], x: number, y: number) {
  return DIRS.some((dir) => {
    const { x: dx, y: dy } = DELTA[dir]
    return cells[y + dy]?.[x + dx] === 'x'
  })
}

function hasThreeX(cells: Cell[][]) {
  const h = cells.length
  const w = cells[0]?.length ?? 0
  const run = (x: number, y: number) => cells[y][x] === 'x'
  for (let y = 0; y < h; y += 1) {
    let n = 0
    for (let x = 0; x < w; x += 1) {
      n = run(x, y) ? n + 1 : 0
      if (n >= 3) return true
    }
  }
  for (let x = 0; x < w; x += 1) {
    let n = 0
    for (let y = 0; y < h; y += 1) {
      n = run(x, y) ? n + 1 : 0
      if (n >= 3) return true
    }
  }
  return false
}

function shuffle<T>(items: T[], rand: () => number) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = items[i]
    items[i] = items[j]
    items[j] = tmp
  }
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function eightByEightLevel(id: string, name: string, seed: number) {
  return generatePuzzle({
    id,
    name,
    width: 8,
    height: 8,
    xCount: 15,
    seed,
    reverseSteps: 36,
    minPar: 12,
  })
}

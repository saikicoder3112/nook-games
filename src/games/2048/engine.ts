export type Dir = 'U' | 'D' | 'L' | 'R'
export type Status = 'playing' | 'lost'

export type Tile = {
  id: number
  value: number
  x: number
  y: number
  born: boolean
  merged: boolean
  gone: boolean
}

export type State = {
  size: number
  tiles: Tile[]
  score: number
  status: Status
  unlocked4096: boolean
  moveId: number
}

const SIZE = 4
const SPAWN_EIGHT_CHANCE = 0.04
let nextId = 1

export function createGame(size = SIZE): State {
  let state: State = {
    size,
    tiles: [],
    score: 0,
    status: 'playing',
    unlocked4096: false,
    moveId: 0,
  }
  state = spawn(state)
  state = spawn(state)
  return state
}

export function move(state: State, dir: Dir): State {
  if (state.status === 'lost') return state
  const { tiles, score, changed } = slideTiles(state.tiles, state.size, dir)
  if (!changed) {
    if (!canMove(tiles, state.size)) return { ...state, tiles, status: 'lost' }
    return state
  }
  let next: State = {
    ...state,
    tiles,
    score: state.score + score,
    unlocked4096: state.unlocked4096 || tiles.some((tile) => !tile.gone && tile.value >= 4096),
    moveId: state.moveId + 1,
  }
  next = spawn(next)
  if (!canMove(next.tiles, next.size)) {
    return { ...next, status: 'lost' }
  }
  return next
}

export function pruneTiles(state: State): State {
  return {
    ...state,
    tiles: state.tiles.filter((tile) => !tile.gone).map((tile) => ({
      ...tile,
      born: false,
      merged: false,
    })),
  }
}

export function highest(state: State) {
  return state.tiles.reduce((top, tile) => (tile.gone ? top : Math.max(top, tile.value)), 0)
}

export function cellsOf(state: State) {
  return cellsFrom(state.tiles, state.size)
}

export function canMove(tiles: Tile[], size: number) {
  const cells = cellsFrom(tiles, size)
  if (cells.some((value) => value === 0)) return true
  return (['L', 'R', 'U', 'D'] as Dir[]).some((dir) => slideTiles(tiles, size, dir).changed)
}

function spawn(state: State): State {
  const occupied = new Set(
    state.tiles.filter((tile) => !tile.gone).map((tile) => tile.y * state.size + tile.x),
  )
  const empties: number[] = []
  for (let index = 0; index < state.size * state.size; index += 1) {
    if (!occupied.has(index)) empties.push(index)
  }
  if (!empties.length) return state
  const index = empties[Math.floor(Math.random() * empties.length)]
  const tile: Tile = {
    id: nextId,
    value: rollSpawn(state.unlocked4096),
    x: index % state.size,
    y: Math.floor(index / state.size),
    born: true,
    merged: false,
    gone: false,
  }
  nextId += 1
  return { ...state, tiles: [...state.tiles, tile] }
}

export function rollSpawn(unlocked4096: boolean, rand = Math.random) {
  if (unlocked4096 && rand() < SPAWN_EIGHT_CHANCE) return 8
  return rand() < 0.9 ? 2 : 4
}

function slideTiles(source: Tile[], size: number, dir: Dir) {
  const tiles = source
    .filter((tile) => !tile.gone)
    .map((tile) => ({ ...tile, born: false, merged: false, gone: false }))
  let score = 0
  let changed = false
  const lines = lineCoords(size, dir)
  for (const line of lines) {
    const occupying = line
      .map((spot) => tiles.find((tile) => !tile.gone && tile.x === spot.x && tile.y === spot.y))
      .filter((tile): tile is Tile => tile != null)
    let write = 0
    let i = 0
    while (i < occupying.length) {
      const current = occupying[i]
      const next = occupying[i + 1]
      const dest = line[write]
      if (next && current.value === next.value) {
        if (current.x !== dest.x || current.y !== dest.y) changed = true
        if (next.x !== dest.x || next.y !== dest.y) changed = true
        current.x = dest.x
        current.y = dest.y
        current.value *= 2
        current.merged = true
        next.x = dest.x
        next.y = dest.y
        next.gone = true
        score += current.value
        write += 1
        i += 2
      } else {
        if (current.x !== dest.x || current.y !== dest.y) changed = true
        current.x = dest.x
        current.y = dest.y
        write += 1
        i += 1
      }
    }
  }
  return { tiles, score, changed }
}

function cellsFrom(tiles: Tile[], size: number) {
  const cells = Array(size * size).fill(0)
  for (const tile of tiles) {
    if (tile.gone) continue
    cells[tile.y * size + tile.x] = tile.value
  }
  return cells
}

function lineCoords(size: number, dir: Dir) {
  const lines: { x: number; y: number }[][] = []
  if (dir === 'L' || dir === 'R') {
    for (let y = 0; y < size; y += 1) {
      const line = Array.from({ length: size }, (_, x) => ({ x, y }))
      lines.push(dir === 'L' ? line : line.reverse())
    }
  } else {
    for (let x = 0; x < size; x += 1) {
      const line = Array.from({ length: size }, (_, y) => ({ x, y }))
      lines.push(dir === 'U' ? line : line.reverse())
    }
  }
  return lines
}

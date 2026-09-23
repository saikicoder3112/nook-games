export const W = 13
export const H = 11

export type Dir = 'U' | 'D' | 'L' | 'R'
export type Tile = 'floor' | 'solid' | 'soft'
export type Pickup = 'extra-bomb' | 'range'
export type Status = 'ready' | 'playing' | 'dead' | 'won'
export type Pos = { x: number; y: number }

export type Enemy = {
  id: number
  x: number
  y: number
  dir: Dir
  moveIn: number
}

export type Bomb = {
  id: number
  x: number
  y: number
  fuse: number
  range: number
}

export type Flame = {
  x: number
  y: number
  ttl: number
}

export type Player = Pos & { face: 'L' | 'R' }

export type State = {
  tiles: Tile[]
  pickups: (Pickup | null)[]
  player: Player
  enemies: Enemy[]
  bombs: Bomb[]
  flames: Flame[]
  bombMax: number
  range: number
  score: number
  status: Status
  nextId: number
}

const DELTA: Record<Dir, Pos> = {
  U: { x: 0, y: -1 },
  D: { x: 0, y: 1 },
  L: { x: -1, y: 0 },
  R: { x: 1, y: 0 },
}

const DIRS: Dir[] = ['U', 'D', 'L', 'R']
const FUSE = 2
const FLAME_TTL = 0.38
const ENEMY_STEP = 0.46
const SOFT_CHANCE = 0.5
const PICKUP_CHANCE = 0.34
const ENEMY_COUNT = 4
const MAX_BOMBS = 5
const MAX_RANGE = 6

export function cellIndex(x: number, y: number) {
  return y * W + x
}

export function createGame(): State {
  const tiles: Tile[] = Array.from({ length: W * H }, () => 'floor')
  const pickups: (Pickup | null)[] = Array.from({ length: W * H }, () => null)

  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1 || (x % 2 === 0 && y % 2 === 0)) {
        tiles[cellIndex(x, y)] = 'solid'
      }
    }
  }

  const spawn = new Set(['1,1', '2,1', '1,2'])
  for (let y = 1; y < H - 1; y += 1) {
    for (let x = 1; x < W - 1; x += 1) {
      const i = cellIndex(x, y)
      if (tiles[i] !== 'floor') continue
      if (spawn.has(`${x},${y}`)) continue
      if (Math.random() < SOFT_CHANCE) tiles[i] = 'soft'
    }
  }

  const far: Pos[] = []
  for (let y = 1; y < H - 1; y += 1) {
    for (let x = 1; x < W - 1; x += 1) {
      if (tiles[cellIndex(x, y)] === 'solid') continue
      if (Math.abs(x - 1) + Math.abs(y - 1) < 7) continue
      far.push({ x, y })
    }
  }
  shuffle(far)





  const enemies: Enemy[] = []
  let nextId = 1
  for (const spot of far) {
    if (enemies.length >= ENEMY_COUNT) break
    if (enemies.some((enemy) => enemy.x === spot.x && enemy.y === spot.y)) continue
    tiles[cellIndex(spot.x, spot.y)] = 'floor'
    enemies.push({
      id: nextId,
      x: spot.x,
      y: spot.y,
      dir: DIRS[Math.floor(Math.random() * DIRS.length)],
      moveIn: ENEMY_STEP + Math.random() * 0.28,
    })
    nextId += 1
  }

  return {
    tiles,
    pickups,
    player: { x: 1, y: 1, face: 'R' },
    enemies,
    bombs: [],
    flames: [],
    bombMax: 1,
    range: 1,
    score: 0,
    status: 'ready',
    nextId,
  }
}

export function begin(state: State): State {
  if (state.status !== 'ready') return state
  return { ...state, status: 'playing' }
}

export function move(state: State, dir: Dir): State {
  const live = state.status === 'ready' ? begin(state) : state
  if (live.status !== 'playing') return state
  const face = dir === 'L' || dir === 'R' ? dir : live.player.face
  const next = { x: live.player.x + DELTA[dir].x, y: live.player.y + DELTA[dir].y }
  const turned = { ...live, player: { ...live.player, face } }
  if (blocked(live, next.x, next.y)) return turned
  return settlePlayer({ ...turned, player: { ...next, face } })
}

export function placeBomb(state: State): State {
  const live = state.status === 'ready' ? begin(state) : state
  if (live.status !== 'playing') return state
  if (live.bombs.length >= live.bombMax) return live
  const { x, y } = live.player
  if (live.bombs.some((bomb) => bomb.x === x && bomb.y === y)) return live
  return {
    ...live,
    bombs: [...live.bombs, { id: live.nextId, x, y, fuse: FUSE, range: live.range }],
    nextId: live.nextId + 1,
  }
}

export function tick(state: State, dt: number): State {
  if (state.status !== 'playing') return state
  const clamped = Math.min(0.05, Math.max(0, dt))
  let next: State = {
    ...state,
    bombs: state.bombs.map((bomb) => ({ ...bomb, fuse: bomb.fuse - clamped })),
    flames: state.flames
      .map((flame) => ({ ...flame, ttl: flame.ttl - clamped }))
      .filter((flame) => flame.ttl > 0),
    enemies: state.enemies.map((enemy) => ({ ...enemy, moveIn: enemy.moveIn - clamped })),
  }

  const due = next.bombs.filter((bomb) => bomb.fuse <= 0)
  if (due.length) next = detonate(next, due)

  next = stepEnemies(next)
  next = applyHazards(next)
  return next
}

function settlePlayer(state: State): State {
  const i = cellIndex(state.player.x, state.player.y)
  const gift = state.pickups[i]
  let next = state
  if (gift) {
    const pickups = state.pickups.slice()
    pickups[i] = null
    next = {
      ...state,
      pickups,
      bombMax: gift === 'extra-bomb' ? Math.min(MAX_BOMBS, state.bombMax + 1) : state.bombMax,
      range: gift === 'range' ? Math.min(MAX_RANGE, state.range + 1) : state.range,
      score: state.score + 30,
    }
  }
  return applyHazards(next)
}

function stepEnemies(state: State): State {
  let enemies = state.enemies
  let changed = false
  for (let index = 0; index < enemies.length; index += 1) {
    const enemy = enemies[index]
    if (enemy.moveIn > 0) continue
    const stepped = walkEnemy(state, enemy, enemies)
    if (!changed) enemies = enemies.slice()
    enemies[index] = stepped
    changed = true
  }
  return changed ? { ...state, enemies } : state
}

function walkEnemy(state: State, enemy: Enemy, others: Enemy[]): Enemy {
  const open = DIRS.filter((dir) => {
    const x = enemy.x + DELTA[dir].x
    const y = enemy.y + DELTA[dir].y
    if (blocked(state, x, y)) return false
    return !others.some((other) => other.id !== enemy.id && other.x === x && other.y === y)
  })
  const reset = { ...enemy, moveIn: ENEMY_STEP }
  if (!open.length) return reset
  const keep = open.includes(enemy.dir) && Math.random() > 0.22
  const dir = keep ? enemy.dir : open[Math.floor(Math.random() * open.length)]
  return {
    ...reset,
    dir,
    x: enemy.x + DELTA[dir].x,
    y: enemy.y + DELTA[dir].y,
  }
}

function applyHazards(state: State): State {
  if (state.status !== 'playing') return state
  const hot = flameSet(state)
  const survivors = state.enemies.filter((enemy) => !hot.has(`${enemy.x},${enemy.y}`))
  const killed = state.enemies.length - survivors.length
  let next = state
  if (killed) {
    next = { ...state, enemies: survivors, score: state.score + killed * 100 }
  }
  if (hot.has(`${next.player.x},${next.player.y}`)) {
    return { ...next, status: 'dead' }
  }
  if (next.enemies.some((enemy) => enemy.x === next.player.x && enemy.y === next.player.y)) {
    return { ...next, status: 'dead' }
  }
  if (next.enemies.length === 0) {
    return { ...next, status: 'won', score: next.score + 250 }
  }
  return next
}

function detonate(state: State, seeds: Bomb[]): State {
  const queue = seeds.slice()
  const exploding = new Set(seeds.map((bomb) => bomb.id))
  const tiles = state.tiles.slice()
  const pickups = state.pickups.slice()
  const flameMap = new Map<string, Flame>()
  for (const flame of state.flames) flameMap.set(`${flame.x},${flame.y}`, { ...flame })

  let score = state.score
  while (queue.length) {
    const bomb = queue.pop()!
    paintFlame(flameMap, bomb.x, bomb.y)
    for (const dir of DIRS) {
      for (let step = 1; step <= bomb.range; step += 1) {
        const x = bomb.x + DELTA[dir].x * step
        const y = bomb.y + DELTA[dir].y * step
        if (x < 0 || y < 0 || x >= W || y >= H) break
        const i = cellIndex(x, y)
        if (tiles[i] === 'solid') break
        paintFlame(flameMap, x, y)
        const nested = state.bombs.find((other) => other.x === x && other.y === y && !exploding.has(other.id))
        if (nested) {
          exploding.add(nested.id)
          queue.push(nested)
        }
        if (pickups[i]) pickups[i] = null
        if (tiles[i] === 'soft') {
          tiles[i] = 'floor'
          pickups[i] = maybePickup()
          score += 10
          break
        }
      }
    }
  }

  return {
    ...state,
    tiles,
    pickups,
    bombs: state.bombs.filter((bomb) => !exploding.has(bomb.id)),
    flames: [...flameMap.values()],
    score,
  }
}

function paintFlame(map: Map<string, Flame>, x: number, y: number) {
  map.set(`${x},${y}`, { x, y, ttl: FLAME_TTL })
}

function maybePickup(): Pickup | null {
  if (Math.random() > PICKUP_CHANCE) return null
  return Math.random() < 0.5 ? 'extra-bomb' : 'range'
}

function blocked(state: State, x: number, y: number) {
  if (x < 0 || y < 0 || x >= W || y >= H) return true
  const tile = state.tiles[cellIndex(x, y)]
  if (tile === 'solid' || tile === 'soft') return true
  return state.bombs.some((bomb) => bomb.x === x && bomb.y === y)
}

function flameSet(state: State) {
  const hot = new Set<string>()
  for (const flame of state.flames) hot.add(`${flame.x},${flame.y}`)
  return hot
}

function shuffle<T>(items: T[]) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const swap = items[i]
    items[i] = items[j]
    items[j] = swap
  }
  return items
}

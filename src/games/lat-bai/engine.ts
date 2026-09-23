export type SizeKey = 'small' | 'medium' | 'large'
export type Status = 'ready' | 'playing' | 'waiting' | 'won'

export type Face = {
  glyph: string
  name: string
}

export type Card = {
  id: number
  face: number
}

export type State = {
  size: SizeKey
  cols: number
  rows: number
  cards: Card[]
  up: number[]
  matched: boolean[]
  moves: number
  pairs: number
  found: number
  status: Status
}

export const SIZES: Record<SizeKey, { cols: number; rows: number; label: string }> = {
  small: { cols: 4, rows: 3, label: 'Nhỏ' },
  medium: { cols: 4, rows: 4, label: 'Vừa' },
  large: { cols: 6, rows: 4, label: 'Lớn' },
}

export const FACES: Face[] = [
  { glyph: '★', name: 'sao' },
  { glyph: '☽', name: 'trăng' },
  { glyph: '✿', name: 'hoa' },
  { glyph: '♪', name: 'nhạc' },
  { glyph: '❀', name: 'cúc' },
  { glyph: '✦', name: 'lấp lánh' },
  { glyph: '☁', name: 'mây' },
  { glyph: '♥', name: 'tim' },
  { glyph: '☀', name: 'nắng' },
  { glyph: '❄', name: 'tuyết' },
  { glyph: '☘', name: 'lá' },
  { glyph: '♦', name: 'rô' },
]

export function createGame(size: SizeKey = 'medium'): State {
  const { cols, rows } = SIZES[size]
  const pairs = (cols * rows) / 2
  const faces = FACES.slice(0, pairs)
  const deck: Card[] = []
  faces.forEach((_, face) => {
    deck.push({ id: deck.length, face })
    deck.push({ id: deck.length, face })
  })
  shuffle(deck)
  return {
    size,
    cols,
    rows,
    cards: deck,
    up: [],
    matched: deck.map(() => false),
    moves: 0,
    pairs,
    found: 0,
    status: 'ready',
  }
}

export function flip(state: State, index: number): State {
  if (state.status === 'waiting' || state.status === 'won') return state
  if (index < 0 || index >= state.cards.length) return state
  if (state.matched[index] || state.up.includes(index)) return state
  if (state.up.length >= 2) return state

  const up = [...state.up, index]
  const next: State = {
    ...state,
    up,
    status: state.status === 'ready' ? 'playing' : state.status,
  }
  if (up.length < 2) return next

  const first = state.cards[up[0]]
  const second = state.cards[up[1]]
  const moves = state.moves + 1
  if (first.face !== second.face) {
    return { ...next, moves, status: 'waiting' }
  }

  const matched = state.matched.map((done, i) => done || i === up[0] || i === up[1])
  const found = state.found + 1
  return {
    ...next,
    up: [],
    matched,
    moves,
    found,
    status: found === state.pairs ? 'won' : 'playing',
  }
}

export function resolveMismatch(state: State): State {
  if (state.status !== 'waiting') return state
  return { ...state, up: [], status: 'playing' }
}

export function isFaceUp(state: State, index: number) {
  return state.matched[index] || state.up.includes(index)
}

function shuffle<T>(items: T[]) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
}

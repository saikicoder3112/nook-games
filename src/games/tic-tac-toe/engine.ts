export type Mark = 'x' | 'o'
export type Cell = Mark | null
export type Difficulty = 'easy' | 'impossible'
export type Status = 'playing' | 'won' | 'lost' | 'draw'

export type State = {
  difficulty: Difficulty
  board: Cell[]
  turn: Mark
  status: Status
  human: Mark
  ai: Mark
}

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const

export const LABELS: Record<Difficulty, string> = {
  easy: 'Dễ',
  impossible: 'Impossible',
}

export function createGame(difficulty: Difficulty): State {
  return {
    difficulty,
    board: Array.from({ length: 9 }, () => null),
    turn: 'x',
    status: 'playing',
    human: 'x',
    ai: 'o',
  }
}

export function playHuman(state: State, index: number): State {
  if (state.status !== 'playing' || state.turn !== state.human) return state
  if (state.board[index] !== null) return state
  return finishTurn(place(state, index, state.human), state.ai)
}

export function playAi(state: State): State {
  if (state.status !== 'playing' || state.turn !== state.ai) return state
  const index = pickAiMove(state)
  if (index === null) return state
  return finishTurn(place(state, index, state.ai), state.human)
}

function place(state: State, index: number, mark: Mark): State {
  const board = [...state.board]
  board[index] = mark
  return { ...state, board }
}

function finishTurn(state: State, nextTurn: Mark): State {
  const winnerMark = winner(state.board)
  if (winnerMark === state.human) return { ...state, status: 'won', turn: nextTurn }
  if (winnerMark === state.ai) return { ...state, status: 'lost', turn: nextTurn }
  if (empties(state.board).length === 0) return { ...state, status: 'draw', turn: nextTurn }
  return { ...state, status: 'playing', turn: nextTurn }
}

export function winner(board: Cell[]): Mark | null {
  for (const [a, b, c] of LINES) {
    const mark = board[a]
    if (mark && mark === board[b] && mark === board[c]) return mark
  }
  return null
}

function empties(board: Cell[]) {
  return board.flatMap((cell, index) => (cell === null ? [index] : []))
}

function pickAiMove(state: State): number | null {
  const open = empties(state.board)
  if (!open.length) return null
  if (state.difficulty === 'easy' && Math.random() > 0.28) {
    return open[Math.floor(Math.random() * open.length)]
  }
  return bestMove(state.board, state.ai)
}

function bestMove(board: Cell[], ai: Mark): number {
  const human: Mark = ai === 'o' ? 'x' : 'o'
  let best = Number.NEGATIVE_INFINITY
  const choices: number[] = []
  for (const index of empties(board)) {
    const next = [...board]
    next[index] = ai
    const score = minimax(next, human, ai, 0)
    if (score > best) {
      best = score
      choices.length = 0
      choices.push(index)
    } else if (score === best) {
      choices.push(index)
    }
  }
  return choices[Math.floor(Math.random() * choices.length)] ?? empties(board)[0]
}

function minimax(board: Cell[], turn: Mark, ai: Mark, depth: number): number {
  const win = winner(board)
  if (win === ai) return 10 - depth
  if (win && win !== ai) return depth - 10
  const open = empties(board)
  if (!open.length) return 0

  if (turn === ai) {
    let best = Number.NEGATIVE_INFINITY
    for (const index of open) {
      const next = [...board]
      next[index] = turn
      best = Math.max(best, minimax(next, turn === 'x' ? 'o' : 'x', ai, depth + 1))
    }
    return best
  }

  let worst = Number.POSITIVE_INFINITY
  for (const index of open) {
    const next = [...board]
    next[index] = turn
    worst = Math.min(worst, minimax(next, turn === 'x' ? 'o' : 'x', ai, depth + 1))
  }
  return worst
}

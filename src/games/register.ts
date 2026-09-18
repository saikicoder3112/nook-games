import type { GameEntry } from '../core/types'
import twentyFortyEight from './2048'
import blockBreaker from './block-breaker'
import ghepMau from './ghep-mau'
import minesweeper from './minesweeper'
import snake from './snake'
import ticTacGo from './tic-tac-go'
import ticTacToe from './tic-tac-toe'

export const games: GameEntry[] = [ticTacGo, ticTacToe, snake, blockBreaker, ghepMau, twentyFortyEight, minesweeper]

export function getGame(id: string) {
  return games.find((game) => game.meta.id === id)
}

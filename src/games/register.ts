import type { GameEntry } from '../core/types'
import twentyFortyEight from './2048'
import blockBreaker from './block-breaker'
import chimVoCanh from './chim-vo-canh'
import datBom from './dat-bom'
import ghepMau from './ghep-mau'
import latBai from './lat-bai'
import minesweeper from './minesweeper'
import snake from './snake'
import sudoku from './sudoku'
import ticTacGo from './tic-tac-go'
import ticTacToe from './tic-tac-toe'
import xepGach from './xep-gach'

export const games: GameEntry[] = [
  ticTacGo,
  ticTacToe,
  snake,
  blockBreaker,
  chimVoCanh,
  datBom,
  xepGach,
  ghepMau,
  latBai,
  twentyFortyEight,
  minesweeper,
  sudoku,
]

export function getGame(id: string) {
  return games.find((game) => game.meta.id === id)
}

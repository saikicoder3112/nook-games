import type { GameEntry } from '../../core/types'
import { TicTacToePreview, TicTacToeView } from './View'

const ticTacToe: GameEntry = {
  meta: {
    id: 'tic-tac-toe',
    title: 'Tic-Tac-Toe',
    blurb: 'Cờ caro 3×3. Dễ thì máy sai, Impossible thì minimax không thua.',
    tags: ['PvE', 'cờ', 'AI'],
    accent: '#e07a5f',
  },
  View: TicTacToeView,
  Preview: TicTacToePreview,
}

export default ticTacToe

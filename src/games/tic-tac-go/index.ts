import type { GameEntry } from '../../core/types'
import { TicTacGoPreview, TicTacGoView } from './View'

const ticTacGo: GameEntry = {
  meta: {
    id: 'tic-tac-go',
    title: 'Tic-Tac-Go',
    blurb: 'Đẩy X và O trên lưới. Bạn cũng là một O — xếp ba O, tránh ba X.',
    tags: ['PvE', 'puzzle', 'lưới'],
    accent: '#e8c36a',
  },
  View: TicTacGoView,
  Preview: TicTacGoPreview,
}

export default ticTacGo

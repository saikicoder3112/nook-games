import type { GameEntry } from '../../core/types'
import { SudokuPreview, SudokuView } from './View'

const sudoku: GameEntry = {
  meta: {
    id: 'sudoku',
    title: 'Sudoku',
    blurb: 'Điền 1–9. Hàng, cột và ô 3×3 không trùng số.',
    tags: ['PvE', 'puzzle', 'cổ điển'],
    accent: '#c9a6ff',
  },
  View: SudokuView,
  Preview: SudokuPreview,
}

export default sudoku

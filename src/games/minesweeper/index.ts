import type { GameEntry } from '../../core/types'
import { MinesweeperPreview, MinesweeperView } from './View'

const minesweeper: GameEntry = {
  meta: {
    id: 'minesweeper',
    title: 'Minesweeper',
    blurb: 'Mở ô, cắm cờ, đừng đụng mìn. Click đầu luôn là ô an toàn.',
    tags: ['PvE', 'puzzle', 'cổ điển'],
    accent: '#7cb87a',
  },
  View: MinesweeperView,
  Preview: MinesweeperPreview,
}

export default minesweeper

import type { GameEntry } from '../../core/types'
import { TwentyFortyEightPreview, TwentyFortyEightView } from './View'

const twentyFortyEight: GameEntry = {
  meta: {
    id: '2048',
    title: '2048',
    blurb: 'Trượt ô, cộng số. Điểm không giới hạn. Mở 4096 thì thỉnh thoảng spawn ô 8.',
    tags: ['PvE', 'puzzle', 'số'],
    accent: '#f2a65a',
  },
  View: TwentyFortyEightView,
  Preview: TwentyFortyEightPreview,
}

export default twentyFortyEight

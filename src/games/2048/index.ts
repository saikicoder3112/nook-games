import type { GameEntry } from '../../core/types'
import { TwentyFortyEightPreview, TwentyFortyEightView } from './View'

const twentyFortyEight: GameEntry = {
  meta: {
    id: '2048',
    title: '2048',
    blurb: 'Trượt ô, cộng số. Đến 2048 thì thắng — có thể chơi tiếp.',
    tags: ['PvE', 'puzzle', 'số'],
    accent: '#f2a65a',
  },
  View: TwentyFortyEightView,
  Preview: TwentyFortyEightPreview,
}

export default twentyFortyEight

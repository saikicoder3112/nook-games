import type { GameEntry } from '../../core/types'
import { XepGachPreview, XepGachView } from './View'

const xepGach: GameEntry = {
  meta: {
    id: 'xep-gach',
    title: 'Xếp gạch',
    blurb: 'Xóa 40, 100 hoặc 200 hàng. Tốc độ rơi giữ nguyên cả ván.',
    tags: ['PvE', 'arcade', 'phản xạ'],
    accent: '#5eb8d6',
  },
  View: XepGachView,
  Preview: XepGachPreview,
}

export default xepGach

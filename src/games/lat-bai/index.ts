import type { GameEntry } from '../../core/types'
import { LatBaiPreview, LatBaiView } from './View'

const latBai: GameEntry = {
  meta: {
    id: 'lat-bai',
    title: 'Lật bài',
    blurb: 'Lật hai thẻ cùng hình. Ghi nhớ vị trí, hết cặp thì thắng.',
    tags: ['PvE', 'puzzle', 'trí nhớ'],
    accent: '#e07a5f',
  },
  View: LatBaiView,
  Preview: LatBaiPreview,
}

export default latBai

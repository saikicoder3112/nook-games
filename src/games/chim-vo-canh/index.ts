import type { GameEntry } from '../../core/types'
import { ChimVoCanhPreview, ChimVoCanhView } from './View'

const chimVoCanh: GameEntry = {
  meta: {
    id: 'flappy-bird',
    title: 'Flappy Bird',
    blurb: 'Vỗ cánh luồn qua ống. Đụng ống hoặc đất thì thua.',
    tags: ['PvE', 'arcade', 'phản xạ'],
    accent: '#e8c36a',
  },
  View: ChimVoCanhView,
  Preview: ChimVoCanhPreview,
}

export default chimVoCanh

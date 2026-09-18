import type { GameEntry } from '../../core/types'
import { BlockBreakerPreview, BlockBreakerView } from './View'

const blockBreaker: GameEntry = {
  meta: {
    id: 'block-breaker',
    title: 'Block Breaker',
    blurb: 'Đập gạch bằng bóng. Ô hai chấm vàng sinh thêm bóng.',
    tags: ['PvE', 'arcade', 'phản xạ'],
    accent: '#5eb8d6',
  },
  View: BlockBreakerView,
  Preview: BlockBreakerPreview,
}

export default blockBreaker

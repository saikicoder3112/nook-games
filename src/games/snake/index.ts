import type { GameEntry } from '../../core/types'
import { SnakePreview, SnakeView } from './View'

const snake: GameEntry = {
  meta: {
    id: 'snake',
    title: 'Rắn săn mồi',
    blurb: 'Ăn mồi để dài ra. Đừng đụng tường, đừng cắn đuôi.',
    tags: ['PvE', 'arcade', 'phản xạ'],
    accent: '#9fd36a',
  },
  View: SnakeView,
  Preview: SnakePreview,
}

export default snake

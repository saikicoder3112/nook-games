import type { GameEntry } from '../../core/types'
import { DatBomPreview, DatBomView } from './View'

const datBom: GameEntry = {
  meta: {
    id: 'dat-bom',
    title: 'Đặt bom',
    blurb: 'Đặt bom phá gạch, hạ hết địch. Đừng dính lửa hoặc quái.',
    tags: ['PvE', 'arcade', 'phản xạ'],
    accent: '#e08a4a',
  },
  View: DatBomView,
  Preview: DatBomPreview,
}

export default datBom

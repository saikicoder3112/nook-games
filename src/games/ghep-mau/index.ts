import type { GameEntry } from '../../core/types'
import { GhepMauPreview, GhepMauView } from './View'

const ghepMau: GameEntry = {
  meta: {
    id: 'ghep-mau',
    title: 'Ghép màu',
    blurb: 'Nối hai ô cùng màu kiểu Pikachu. Đường đi tối đa hai khúc cua.',
    tags: ['PvE', 'puzzle', 'ghép'],
    accent: '#c9a6ff',
  },
  View: GhepMauView,
  Preview: GhepMauPreview,
}

export default ghepMau

import type { ComponentType } from 'react'

/**
 * Mỗi game là một folder trong `src/games`.
 * Để thêm game: implement `GameEntry`, rồi đẩy vào mảng `games` ở `src/games/register.ts`.
 * Shell không biết rule. Game tự giữ engine + UI.
 */
export type GameMeta = {
  id: string
  title: string
  blurb: string
  tags: string[]
  accent: string
}

export type GameEntry = {
  meta: GameMeta
  View: ComponentType
  Preview?: ComponentType
}

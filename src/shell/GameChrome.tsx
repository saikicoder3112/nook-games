import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FitViewport } from './FitViewport'

type Props = {
  title: string
  children: ReactNode
}

export function GameChrome({ title, children }: Props) {
  return (
    <section className="chrome">
      <div className="chrome-head">
        <div>
          <Link className="back" to="/">
            ← Tất cả game
          </Link>
          <h1>{title}</h1>
        </div>
      </div>
      <FitViewport>{children}</FitViewport>
    </section>
  )
}

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

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
      {children}
    </section>
  )
}

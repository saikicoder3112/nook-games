import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  FACES,
  SIZES,
  createGame,
  flip,
  isFaceUp,
  resolveMismatch,
  type SizeKey,
  type State,
} from './engine'

const BEST_KEY = 'nook-lat-bai-best'
const WAIT_MS = 1000

export function LatBaiPreview() {
  return (
    <div className="preview-lat">
      <span className="lat-mini back" />
      <span className="lat-mini face p0">★</span>
      <span className="lat-mini face p0">★</span>
      <span className="lat-mini back" />
    </div>
  )
}

export function LatBaiView() {
  const [size, setSize] = useState<SizeKey>('medium')
  const [state, setState] = useState<State>(() => createGame('medium'))
  const [best, setBest] = useState(() => readBest('medium'))
  const [now, setNow] = useState(() => Date.now())
  const started = useRef<number | null>(null)
  const finished = useRef<number | null>(null)

  useEffect(() => {
    if (state.status !== 'waiting') return
    const id = window.setTimeout(() => setState(resolveMismatch), WAIT_MS)
    return () => window.clearTimeout(id)
  }, [state.status, state.up.join(',')])

  useEffect(() => {
    if (state.status === 'ready') {
      started.current = null
      finished.current = null
      return
    }
    if (state.status === 'won') {
      if (finished.current == null) finished.current = Date.now()
      return
    }
    if (started.current == null) started.current = Date.now()
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [state.status])

  useEffect(() => {
    if (state.status !== 'won' || state.moves <= 0) return
    setBest((current) => {
      const next = current === 0 ? state.moves : Math.min(current, state.moves)
      writeBest(state.size, next)
      return next
    })
  }, [state.status, state.moves, state.size])

  const elapsed =
    started.current == null ? 0 : (finished.current ?? now) - started.current

  return (
    <>
      <div className="stats">
        <div className="stat">
          <b>
            {state.found}/{state.pairs}
          </b>
          <span>cặp</span>
        </div>
        <div className="stat">
          <b>{state.moves}</b>
          <span>lượt</span>
        </div>
        <div className="stat">
          <b>{formatTime(elapsed)}</b>
          <span>thời gian</span>
        </div>
        <div className="stat">
          <b>{best || '—'}</b>
          <span>kỷ lục</span>
        </div>
      </div>
      <div className="toolbar">
        {(Object.keys(SIZES) as SizeKey[]).map((key) => (
          <button
            key={key}
            className="btn"
            data-active={key === size}
            onClick={() => restart(key)}
          >
            {SIZES[key].label}
          </button>
        ))}
        <button className="btn" onClick={() => restart(size)}>
          Ván mới
        </button>
      </div>
      <div className="board-wrap">
        {state.status === 'won' ? (
          <div className="banner won" role="status">
            Hết bài. {state.moves} lượt · {formatTime(elapsed)}.
          </div>
        ) : null}
        <div
          className="lat-board"
          style={{ '--cols': state.cols } as CSSProperties}
        >
          {state.cards.map((card, index) => {
            const face = FACES[card.face]
            const up = isFaceUp(state, index)
            return (
              <button
                key={card.id}
                className={`lat-card${up ? ' up' : ''}${state.matched[index] ? ' matched' : ''}`}
                disabled={state.status === 'waiting' || state.status === 'won' || up}
                aria-label={up ? face.name : 'thẻ úp'}
                onClick={() => setState((current) => flip(current, index))}
              >
                <span className="lat-inner">
                  <span className="lat-back" />
                  <span className={`lat-face p${card.face}`}>{face.glyph}</span>
                </span>
              </button>
            )
          })}
        </div>
        <p className="help">Lật hai thẻ. Cùng hình thì giữ, khác thì úp lại. Ít lượt hơn là tốt hơn.</p>
      </div>
    </>
  )

  function restart(next: SizeKey) {
    setSize(next)
    setBest(readBest(next))
    started.current = null
    finished.current = null
    setState(createGame(next))
  }
}

function formatTime(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function readBest(size: SizeKey) {
  try {
    const raw = window.localStorage.getItem(BEST_KEY)
    if (!raw) return 0
    const parsed = JSON.parse(raw) as Record<string, number>
    const value = Number(parsed[size])
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

function writeBest(size: SizeKey, moves: number) {
  try {
    const raw = window.localStorage.getItem(BEST_KEY)
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {}
    parsed[size] = moves
    window.localStorage.setItem(BEST_KEY, JSON.stringify(parsed))
  } catch {
    /* ignore quota / private mode */
  }
}

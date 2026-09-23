import { useEffect, useRef, useState, type CSSProperties, type TouchEvent } from 'react'
import { createGame, highest, move, pruneTiles, type Dir, type State } from './engine'

const KEYS: Record<string, Dir> = {
  ArrowUp: 'U',
  ArrowDown: 'D',
  ArrowLeft: 'L',
  ArrowRight: 'R',
  w: 'U',
  a: 'L',
  s: 'D',
  d: 'R',
  W: 'U',
  A: 'L',
  S: 'D',
  D: 'R',
}

const BEST_KEY = 'nook-2048-best'
const SLIDE_MS = 200
const PRUNE_MS = 400

export function TwentyFortyEightPreview() {
  return (
    <div className="preview-2048">
      <span className="t2048 v2">2</span>
      <span className="t2048 v8">8</span>
      <span className="t2048 v16">16</span>
      <span className="t2048 v4">4</span>
    </div>
  )
}

export function TwentyFortyEightView() {
  const [state, setState] = useState<State>(() => createGame())
  const [best, setBest] = useState(() => readBest())
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const lockUntil = useRef(0)
  const queued = useRef<Dir | null>(null)

  useEffect(() => {
    setBest((current) => {
      const next = Math.max(current, state.score)
      writeBest(next)
      return next
    })
  }, [state.score])

  useEffect(() => {
    const id = window.setTimeout(() => setState(pruneTiles), PRUNE_MS)
    return () => window.clearTimeout(id)
  }, [state.moveId])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const dir = KEYS[event.key]
      if (!dir) return
      event.preventDefault()
      play(dir)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const slots = Array.from({ length: state.size * state.size }, (_, index) => index)

  return (
    <>
      <div className="stats">
        <div className="stat">
          <b>{state.score}</b>
          <span>điểm</span>
        </div>
        <div className="stat">
          <b>{best}</b>
          <span>kỷ lục</span>
        </div>
        <div className="stat">
          <b>{highest(state)}</b>
          <span>ô lớn</span>
        </div>
      </div>
      <div className="toolbar">
        <button className="btn" onClick={() => setState(createGame())}>
          Ván mới
        </button>
      </div>
      <div className="board-wrap">
        {state.status === 'lost' ? (
          <div className="banner lost" role="status">
            Hết nước đi. {state.score} điểm.
          </div>
        ) : null}
        <div
          className="t2048-board"
          style={{ '--size': state.size } as CSSProperties}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {slots.map((index) => (
            <span key={index} className="t2048-slot" />
          ))}
          {state.tiles.map((tile) => (
            <span
              key={tile.id}
              className={`t2048-piece${tile.merged ? ' merged' : ''}${tile.gone ? ' gone' : ''}`}
              style={{
                transform: `translate3d(calc(${tile.x} * (var(--cell) + var(--gap))), calc(${tile.y} * (var(--cell) + var(--gap))), 0)`,
              }}
            >
              <span className={`t2048 ${tileTone(tile.value)}${tile.born ? ' spawned' : ''}${tile.merged ? ' merged' : ''}`}>
                {tile.value}
              </span>
            </span>
          ))}
        </div>
        <p className="help">
          Mũi tên, WASD, hoặc vuốt. Ô giống nhau cộng lại. Điểm không giới hạn. Có ô 4096 thì thỉnh thoảng spawn ô 8.
        </p>
        <div className="pad">
          <span className="spacer" />
          <button className="btn" onClick={() => play('U')}>
            ↑
          </button>
          <span className="spacer" />
          <button className="btn" onClick={() => play('L')}>
            ←
          </button>
          <button className="btn" onClick={() => play('D')}>
            ↓
          </button>
          <button className="btn" onClick={() => play('R')}>
            →
          </button>
        </div>
      </div>
    </>
  )

  function play(dir: Dir) {
    const now = performance.now()
    if (now < lockUntil.current) {
      queued.current = dir
      return
    }
    setState((current) => move(current, dir))
    lockUntil.current = now + SLIDE_MS
    window.setTimeout(() => {
      const next = queued.current
      queued.current = null
      if (next) play(next)
    }, SLIDE_MS)
  }

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0]
    swipe.current = { x: touch.clientX, y: touch.clientY }
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = swipe.current
    const touch = event.changedTouches[0]
    swipe.current = null
    if (!start) return
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return
    const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U'
    play(dir)
  }
}

function tileTone(value: number) {
  if (value <= 2048 || value === 4096 || value === 8192 || value === 16384 || value === 32768 || value === 65536) {
    return `v${value}`
  }
  return 'v-high'
}

function readBest() {
  try {
    const raw = window.localStorage.getItem(BEST_KEY)
    const value = raw ? Number(raw) : 0
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

function writeBest(score: number) {
  try {
    window.localStorage.setItem(BEST_KEY, String(score))
  } catch {
    /* ignore quota / private mode */
  }
}

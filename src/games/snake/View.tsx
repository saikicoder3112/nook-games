import { useEffect, useMemo, useRef, useState, type CSSProperties, type TouchEvent } from 'react'
import { createGame, queueDir, stepMs, tick, togglePause, type Dir, type State } from './engine'

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

const BEST_KEY = 'nook-snake-best'

export function SnakePreview() {
  return (
    <div className="preview-snake">
      <span className="snake-cell" />
      <span className="snake-cell food" />
      <span className="snake-cell" />
      <span className="snake-cell body" />
      <span className="snake-cell body" />
      <span className="snake-cell head" />
    </div>
  )
}

export function SnakeView() {
  const [state, setState] = useState<State>(() => createGame())
  const [best, setBest] = useState(() => readBest())
  const swipe = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (state.status !== 'playing') return
    const id = window.setInterval(() => setState(tick), stepMs(state.score))
    return () => window.clearInterval(id)
  }, [state.status, state.score])

  useEffect(() => {
    if (state.status !== 'dead' && state.status !== 'won') return
    setBest((current) => {
      const next = Math.max(current, state.score)
      writeBest(next)
      return next
    })
  }, [state.status, state.score])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault()
        setState(togglePause)
        return
      }
      const dir = KEYS[event.key]
      if (!dir) return
      event.preventDefault()
      setState((current) => queueDir(current, dir))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const occupancy = useMemo(() => {
    const map = new Map<string, 'head' | 'body' | 'food'>()
    map.set(`${state.food.x},${state.food.y}`, 'food')
    state.snake.forEach((part, index) => {
      map.set(`${part.x},${part.y}`, index === 0 ? 'head' : 'body')
    })
    return map
  }, [state])

  const cells = Array.from({ length: state.w * state.h }, (_, index) => {
    const x = index % state.w
    const y = Math.floor(index / state.w)
    return occupancy.get(`${x},${y}`) ?? ''
  })

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
          <b>{state.snake.length}</b>
          <span>độ dài</span>
        </div>
      </div>
      <div className="toolbar">
        <button className="btn" onClick={() => setState(createGame())}>
          Chơi lại
        </button>
        <button className="btn" onClick={() => setState(togglePause)}>
          {state.status === 'paused' ? 'Tiếp tục' : 'Tạm dừng'}
        </button>
      </div>
      <div className="board-wrap">
        {state.status === 'ready' ? <div className="banner draw" role="status">Bấm mũi tên để bắt đầu.</div> : null}
        {state.status === 'paused' ? <div className="banner draw" role="status">Đang tạm dừng.</div> : null}
        {state.status === 'dead' ? <div className="banner lost" role="status">Đụng rồi. {state.score} điểm.</div> : null}
        {state.status === 'won' ? <div className="banner won" role="status">Hết chỗ trống.</div> : null}
        <div
          className="snake-board"
          style={{ '--cols': state.w } as CSSProperties}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {cells.map((kind, index) => (
            <span key={index} className={`snake-cell ${kind}`} />
          ))}
        </div>
        <p className="help">Mũi tên hoặc WASD. Ăn chấm vàng để dài ra. Đụng tường hoặc thân thì thua. Space để tạm dừng.</p>
        <div className="pad">
          <span className="spacer" />
          <button className="btn" onClick={() => setState((current) => queueDir(current, 'U'))}>
            ↑
          </button>
          <span className="spacer" />
          <button className="btn" onClick={() => setState((current) => queueDir(current, 'L'))}>
            ←
          </button>
          <button className="btn" onClick={() => setState((current) => queueDir(current, 'D'))}>
            ↓
          </button>
          <button className="btn" onClick={() => setState((current) => queueDir(current, 'R'))}>
            →
          </button>
        </div>
      </div>
    </>
  )

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
    setState((current) => queueDir(current, dir))
  }
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

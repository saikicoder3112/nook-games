import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type TouchEvent } from 'react'
import {
  H,
  W,
  begin,
  cellIndex,
  createGame,
  move,
  placeBomb,
  tick,
  type Dir,
  type Enemy,
  type Player,
  type State,
} from './engine'

const BEST_KEY = 'nook-dat-bom-best'
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

type Hud = {
  score: number
  status: State['status']
  enemies: number
  bombs: number
  bombMax: number
  range: number
}

export function DatBomPreview() {
  return (
    <div className="preview-bom">
      <span className="solid" />
      <span className="soft" />
      <span className="solid" />
      <span className="floor preview-chibi-cell">
        <BomChibi kind="hero" face="R" />
      </span>
      <span className="floor bomb" />
      <span className="floor" />
      <span className="solid" />
      <span className="floor preview-chibi-cell">
        <BomChibi kind="foe" face="L" />
      </span>
      <span className="solid" />
    </div>
  )
}

export function DatBomView() {
  const [state, setState] = useState<State>(() => createGame())
  const [best, setBest] = useState(() => readBest())
  const held = useRef<Dir | null>(null)
  const nextMoveAt = useRef(0)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const pointerMoved = useRef(false)

  useEffect(() => {
    if (state.status !== 'playing') return
    let last = performance.now()
    let frame = 0
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      setState((current) => {
        let next = tick(current, dt)
        const dir = held.current
        if (dir && now >= nextMoveAt.current) {
          next = move(next, dir)
          nextMoveAt.current = now + 140
        }
        return next
      })
      frame = window.requestAnimationFrame(loop)
    }
    frame = window.requestAnimationFrame(loop)
    return () => window.cancelAnimationFrame(frame)
  }, [state.status])

  useEffect(() => {
    if (state.status !== 'dead' && state.status !== 'won') return
    setBest((current) => {
      const next = Math.max(current, state.score)
      writeBest(next)
      return next
    })
  }, [state.status, state.score])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault()
        if (!event.repeat) setState(placeBomb)
        return
      }
      const dir = KEYS[event.key]
      if (!dir) return
      event.preventDefault()
      const now = performance.now()
      const fresh = held.current !== dir
      held.current = dir
      if (fresh) nextMoveAt.current = now + 180
      if (fresh || !event.repeat) setState((current) => move(current, dir))
    }
    const onKeyUp = (event: KeyboardEvent) => {
      const dir = KEYS[event.key]
      if (dir && held.current === dir) held.current = null
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clearHold)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clearHold)
    }
  }, [])

  const hud = snapshot(state)

  return (
    <>
      <div className="stats">
        <div className="stat">
          <b>{hud.score}</b>
          <span>điểm</span>
        </div>
        <div className="stat">
          <b>{best}</b>
          <span>kỷ lục</span>
        </div>
        <div className="stat">
          <b>{hud.enemies}</b>
          <span>địch</span>
        </div>
        <div className="stat">
          <b>
            {hud.bombs}/{hud.bombMax}
          </b>
          <span>bom</span>
        </div>
        <div className="stat">
          <b>{hud.range}</b>
          <span>tầm</span>
        </div>
      </div>
      <div className="toolbar">
        <button className="btn" onClick={restart}>
          Chơi lại
        </button>
      </div>
      <div className="board-wrap">
        {state.status === 'dead' ? (
          <div className="banner lost" role="status">
            Nổ rồi. {state.score} điểm.
          </div>
        ) : null}
        {state.status === 'won' ? (
          <div className="banner won" role="status">
            Hết địch. {state.score} điểm.
          </div>
        ) : null}
        <div className="bom-stage">
          <div
            className="bom-board"
            style={{ '--cols': W } as CSSProperties}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {Array.from({ length: W * H }, (_, index) => (
              <span key={index} className={cellClass(state, index)} />
            ))}
            {state.pickups.map((gift, index) =>
              gift === 'range' ? <FlameIcon key={`fire-${index}`} index={index} /> : null,
            )}
            {state.enemies.map((enemy) => (
              <BomChibi key={enemy.id} kind="foe" actor={enemy} />
            ))}
            <BomChibi kind="hero" actor={state.player} dead={state.status === 'dead'} />
          </div>
          {state.status === 'ready' ? (
            <div className="bom-veil" onClick={() => setState(begin)}>
              <button
                className="btn primary xep-start"
                onClick={(event) => {
                  event.stopPropagation()
                  setState(begin)
                }}
              >
                Bắt đầu
              </button>
            </div>
          ) : null}
          {state.status === 'dead' || state.status === 'won' ? (
            <div className="bom-veil" onClick={restart}>
              <button
                className="btn primary xep-start"
                onClick={(event) => {
                  event.stopPropagation()
                  restart()
                }}
              >
                Chơi lại
              </button>
            </div>
          ) : null}
        </div>
        <p className="help">Mũi tên hoặc WASD để đi. Space để đặt bom. Phá gạch, hạ hết quái. Lửa và quái đều làm thua.</p>
        <div className="bom-controls">
          <div className="pad">
            <span className="spacer" />
            <button className="btn" {...holdProps('U')}>
              ↑
            </button>
            <span className="spacer" />
            <button className="btn" {...holdProps('L')}>
              ←
            </button>
            <button className="btn" {...holdProps('D')}>
              ↓
            </button>
            <button className="btn" {...holdProps('R')}>
              →
            </button>
          </div>
          <button className="btn primary bom-drop" onClick={() => setState(placeBomb)}>
            Bom
          </button>
        </div>
      </div>
    </>
  )

  function restart() {
    held.current = null
    setState(createGame())
  }

  function clearHold() {
    held.current = null
  }

  function holdProps(dir: Dir) {
    return {
      onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
        event.preventDefault()
        pointerMoved.current = true
        held.current = dir
        nextMoveAt.current = performance.now() + 180
        setState((current) => move(current, dir))
      },
      onClick: () => {
        if (pointerMoved.current) {
          pointerMoved.current = false
          return
        }
        setState((current) => move(current, dir))
      },
      onPointerUp: () => {
        if (held.current === dir) held.current = null
      },
      onPointerCancel: () => {
        if (held.current === dir) held.current = null
      },
      onPointerLeave: () => {
        if (held.current === dir) held.current = null
      },
    }
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
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) {
      setState(placeBomb)
      return
    }
    const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U'
    setState((current) => move(current, dir))
  }
}

function snapshot(state: State): Hud {
  return {
    score: state.score,
    status: state.status,
    enemies: state.enemies.length,
    bombs: state.bombs.length,
    bombMax: state.bombMax,
    range: state.range,
  }
}

function FlameIcon({ index }: { index: number }) {
  const x = index % W
  const y = Math.floor(index / W)
  return (
    <svg
      className="bom-flame-icon"
      viewBox="0 0 64 80"
      aria-hidden="true"
      style={
        {
          left: `calc(var(--pad) + ${x} * (var(--cell) + var(--gap)) + var(--cell) / 2)`,
          top: `calc(var(--pad) + ${y} * (var(--cell) + var(--gap)) + var(--cell) / 2)`,
        } as CSSProperties
      }
    >
      <path fill="#ef4d2d" d="M41 1.5c3.2 5.2 1.8 10.6-2.4 14.2-5.4-3.2-6.2-9.4-2.2-14.2z" />
      <path fill="#ef4d2d" d="M15 21c3.4 5.4 1.8 10.8-1.6 14-5.2-2.6-5-9.2 1.6-14z" />
      <path fill="#ef4d2d" d="M55 40.5c2.4 4 1.2 8.2-2 10.4-4-2-4.2-7 2-10.4z" />
      <path
        fill="#ef4d2d"
        d="M32.5 13c-1.2 9.2-7.2 14.6-10.4 24.2-6.4-4.8-14.4 1.2-10.8 12.2-8.6 3.4-10.2 18.4 1.6 26.2 5.2 8.6 14.8 13 21.6 13 9.2 0 20.4-5.2 24.8-14.4 7.6-9.4 4.8-21.6-4.4-27.2 7.2-8.8 3.6-22.4-7.8-24.6 2.8-9.6-5.6-16.8-14.6-9.4z"
      />
      <path
        fill="#ff8a1e"
        d="M32.8 27.5c-1 6.8-5.2 10.6-7.6 17.6-4.6-3.2-10.2.8-7.8 8.6-6.2 2.6-7 13.4 1.4 19.2 4 6.2 11.2 9.4 16.2 9.4 6.8 0 15-3.8 18.2-10.6 5.4-6.8 3.2-15.8-3.4-19.8 5.2-6.4 2.4-16.4-6-18-2.2-7.2-8.6-12.2-11-6.4z"
      />
      <path
        fill="#ffd400"
        d="M33 41c-.8 5.4-3.8 8.4-5.6 13.4-3.4-2.2-7.4.8-5.6 6.6-4.4 2-4.8 10 1.4 14.2 3 4.6 8.4 6.8 12 6.8 5 0 10.8-2.8 13.2-7.8 3.8-5 2.2-11.6-2.6-14.4 3.6-4.8 1.4-12.2-4.6-13.4-1.8-5.4-6.6-9.4-8.2-5.4z"
      />
      <path fill="#fff" d="M33 56.5c-3.6 4.8-3.8 11.2 0 15.2 3.8-4 3.6-10.4 0-15.2z" />
    </svg>
  )
}

function cellClass(state: State, index: number) {
  const x = index % W
  const y = Math.floor(index / W)
  const i = cellIndex(x, y)
  const bits = ['bom-cell', state.tiles[i]]
  const gift = state.pickups[i]
  if (gift === 'extra-bomb') bits.push(gift)
  if (state.bombs.some((bomb) => bomb.x === x && bomb.y === y)) bits.push('bomb')
  if (state.flames.some((flame) => flame.x === x && flame.y === y)) bits.push('flame')
  return bits.join(' ')
}

type ChibiProps = {
  kind: 'hero' | 'foe'
  face?: 'L' | 'R'
  actor?: Player | Enemy
  dead?: boolean
}

function BomChibi({ kind, face, actor, dead }: ChibiProps) {
  const facing = actor ? horizontalFace(actor) : (face ?? 'R')
  return (
    <div
      className={`bom-chibi ${kind}${dead ? ' is-dead' : ''}`}
      data-face={facing}
      style={
        actor
          ? {
              left: `calc(var(--pad) + ${actor.x} * (var(--cell) + var(--gap)) + var(--cell) / 2)`,
              top: `calc(var(--pad) + ${actor.y} * (var(--cell) + var(--gap)) + var(--cell) / 2)`,
            }
          : undefined
      }
    >
      <span className="chibi-inner">
        <span className="chibi-flip">
          <span className="chibi-body" />
          <span className="chibi-head">
            <span className="chibi-hair" />
            <span className="chibi-bang" />
            <span className="chibi-eye left" />
            <span className="chibi-eye right" />
            <span className="chibi-blush left" />
            <span className="chibi-blush right" />
            <span className="chibi-mouth" />
          </span>
        </span>
      </span>
    </div>
  )
}

function horizontalFace(actor: Player | Enemy): 'L' | 'R' {
  if ('face' in actor) return actor.face
  return actor.dir === 'L' ? 'L' : 'R'
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

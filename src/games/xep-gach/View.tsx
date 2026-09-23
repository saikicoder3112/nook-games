import { memo, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import {
  GOALS,
  SHAPES,
  begin,
  createGame,
  ghostPiece,
  hardDrop,
  move,
  rotate,
  tickClock,
  tickFall,
  togglePause,
  visualCells,
  type Goal,
  type Kind,
  type State,
} from './engine'

const BEST_KEY = 'nook-xep-gach-best'
const DAS_MS = 180
const ARR_MS = 16
const SHIFT_DEBOUNCE_MS = 50
const INPUT_ABORT = '__nookXepInputAbort__'

const INPUT = {
  left: false,
  right: false,
  down: false,
  dasDir: 0,
  dasReadyAt: 0,
  dasNextAt: 0,
  lastShiftAt: 0,
  lastShiftDir: 0,
}

function resetInput() {
  INPUT.left = false
  INPUT.right = false
  INPUT.down = false
  INPUT.dasDir = 0
  INPUT.dasReadyAt = 0
  INPUT.dasNextAt = 0
  INPUT.lastShiftAt = 0
  INPUT.lastShiftDir = 0
}

function armDas(dir: number) {
  const now = performance.now()
  INPUT.dasDir = dir
  INPUT.dasReadyAt = now + DAS_MS
  INPUT.dasNextAt = now + DAS_MS
}

function applyDas(current: State, now: number) {
  const dir = INPUT.left && !INPUT.right ? -1 : INPUT.right && !INPUT.left ? 1 : 0
  if (dir === 0 || INPUT.dasDir !== dir) return current
  if (now < INPUT.dasReadyAt || now < INPUT.dasNextAt) return current
  INPUT.dasNextAt = now + ARR_MS
  INPUT.lastShiftAt = now
  INPUT.lastShiftDir = dir
  return move(current, dir)
}

function bindInput(onDown: (event: KeyboardEvent) => void, onUp: (event: KeyboardEvent) => void, onBlur: () => void) {
  const host = window as Window & { [INPUT_ABORT]?: AbortController }
  host[INPUT_ABORT]?.abort()
  const ac = new AbortController()
  host[INPUT_ABORT] = ac
  const opts = { signal: ac.signal, capture: true }
  window.addEventListener('keydown', onDown, opts)
  window.addEventListener('keyup', onUp, opts)
  window.addEventListener('blur', onBlur, opts)
  return () => ac.abort()
}

export function XepGachPreview() {
  return (
    <div className="preview-xep">
      <span className="xep-cell T" />
      <span className="xep-cell T" />
      <span className="xep-cell T" />
      <span className="xep-cell" />
      <span className="xep-cell" />
      <span className="xep-cell T" />
      <span className="xep-cell" />
      <span className="xep-cell S" />
      <span className="xep-cell S" />
      <span className="xep-cell L" />
      <span className="xep-cell S" />
      <span className="xep-cell S" />
    </div>
  )
}

export function XepGachView() {
  const [goal, setGoal] = useState<Goal>(40)
  const [state, setState] = useState<State>(() => createGame(40))
  const [best, setBest] = useState(() => readBest(40))
  const stateRef = useRef(state)
  const handleRef = useRef<(event: KeyboardEvent, down: boolean) => boolean>(() => false)
  const boardRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const linesRef = useRef<HTMLElement>(null)
  const timeRef = useRef<HTMLElement>(null)
  const piecesRef = useRef<HTMLElement>(null)
  const rateRef = useRef<HTMLElement>(null)
  const bestHudRef = useRef<HTMLElement>(null)
  const bestValueRef = useRef(best)
  bestValueRef.current = best

  function paint(current: State) {
    const board = boardRef.current
    const layer = layerRef.current
    if (board && layer) {
      const styles = window.getComputedStyle(board)
      const stride = parseFloat(styles.getPropertyValue('--cell')) + parseFloat(styles.getPropertyValue('--gap'))
      const ghost = visualCells(ghostPiece(current))
      const live = visualCells(current.current)
      const nodes = layer.children
      for (let index = 0; index < 4; index += 1) {
        placeMino(nodes[index] as HTMLElement, ghost[index], current.current.kind, stride, true)
        placeMino(nodes[index + 4] as HTMLElement, live[index], current.current.kind, stride, false)
      }
    }
    const ppsNow = current.elapsedMs > 0 ? current.pieces / (current.elapsedMs / 1000) : 0
    if (linesRef.current) linesRef.current.textContent = `${current.lines}/${current.goal}`
    if (timeRef.current) timeRef.current.textContent = formatTime(current.elapsedMs)
    if (piecesRef.current) piecesRef.current.textContent = String(current.pieces)
    if (rateRef.current) rateRef.current.textContent = `khối · ${ppsNow.toFixed(2)}/s`
    if (bestHudRef.current) bestHudRef.current.textContent = bestValueRef.current ? formatTime(bestValueRef.current) : '—'
  }

  function commit(next: State, force = false) {
    const prev = stateRef.current
    stateRef.current = next
    const discrete =
      force ||
      next.grid !== prev.grid ||
      next.status !== prev.status ||
      next.queue !== prev.queue ||
      next.goal !== prev.goal ||
      next.lines !== prev.lines
    if (discrete) setState(next)
    else paint(next)
  }

  function restart(next: Goal) {
    setGoal(next)
    setBest(readBest(next))
    resetInput()
    commit(createGame(next), true)
  }

  function start() {
    const current = stateRef.current
    if (current.status === 'ready') {
      commit(begin(current))
      return
    }
    if (current.status === 'won' || current.status === 'lost') {
      resetInput()
      commit(begin(createGame(goal)), true)
    }
  }

  function shiftOnce(dir: -1 | 1) {
    const now = performance.now()
    if (INPUT.lastShiftDir === dir && now - INPUT.lastShiftAt < SHIFT_DEBOUNCE_MS) return
    INPUT.lastShiftAt = now
    INPUT.lastShiftDir = dir
    commit(move(stateRef.current, dir))
  }

  function handleKey(event: KeyboardEvent, down: boolean) {
    const action = keyAction(event)
    if (!action) return false
    const status = stateRef.current.status
    if (status === 'ready' || status === 'won' || status === 'lost') {
      if (action === 'start' && down && !event.repeat) {
        start()
        return true
      }
      return action === 'left' || action === 'right' || action === 'down' || action === 'drop' || action === 'cw'
    }
    if (down && event.repeat) return true
    if (action === 'left' || action === 'right') {
      const dir = action === 'left' ? -1 : 1
      if (down) {
        if (action === 'left') {
          if (INPUT.left) return true
          INPUT.left = true
        } else {
          if (INPUT.right) return true
          INPUT.right = true
        }
        armDas(dir)
        shiftOnce(dir)
      } else if (action === 'left') {
        INPUT.left = false
        if (INPUT.dasDir === -1) INPUT.dasDir = 0
      } else {
        INPUT.right = false
        if (INPUT.dasDir === 1) INPUT.dasDir = 0
      }
      return true
    }
    if (action === 'down') {
      if (down) {
        if (INPUT.down) return true
        INPUT.down = true
      } else {
        INPUT.down = false
      }
      return true
    }
    if (!down) return false
    if (action === 'start') {
      start()
      return true
    }
    if (action === 'pause') {
      commit(togglePause(stateRef.current))
      return true
    }
    if (action === 'cw') {
      commit(rotate(stateRef.current, 1))
      return true
    }
    if (action === 'ccw') {
      commit(rotate(stateRef.current, -1))
      return true
    }
    if (action === 'drop') {
      commit(hardDrop(stateRef.current))
      return true
    }
    return false
  }

  handleRef.current = handleKey

  useEffect(() => {
    if (state.status !== 'won' || state.elapsedMs <= 0) return
    setBest((current) => {
      const next = current === 0 ? state.elapsedMs : Math.min(current, state.elapsedMs)
      writeBest(state.goal, next)
      return next
    })
  }, [state.status, state.elapsedMs, state.goal])

  useLayoutEffect(() => {
    paint(stateRef.current)
  }, [state])

  useEffect(() => {
    const onDown = (event: KeyboardEvent) => {
      if (handleRef.current(event, true)) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }
    const onUp = (event: KeyboardEvent) => {
      handleRef.current(event, false)
    }
    return bindInput(onDown, onUp, resetInput)
  }, [])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(32, now - last)
      last = now
      const current = stateRef.current
      if (current.status === 'playing') {
        let next = applyDas(current, now)
        next = tickClock(next, dt)
        if (next.status === 'playing') next = tickFall(next, dt, INPUT.down)
        commit(next)
      }
      raf = window.requestAnimationFrame(loop)
    }
    raf = window.requestAnimationFrame(loop)
    return () => window.cancelAnimationFrame(raf)
  }, [])

  const pps = state.elapsedMs > 0 ? state.pieces / (state.elapsedMs / 1000) : 0

  return (
    <>
      <div className="toolbar">
        {GOALS.map((entry) => (
          <button
            key={entry}
            className="btn"
            data-active={entry === goal}
            onClick={() => restart(entry)}
          >
            {entry} hàng
          </button>
        ))}
        <button className="btn" onClick={() => restart(goal)}>
          Ván mới
        </button>
        {state.status === 'playing' || state.status === 'paused' ? (
          <button className="btn" onClick={() => commit(togglePause(stateRef.current))}>
            {state.status === 'paused' ? 'Tiếp tục' : 'Tạm dừng'}
          </button>
        ) : null}
      </div>
      <div className="board-wrap">
        {state.status === 'ready' ? (
          <div className="banner draw" role="status">
            Xóa {state.goal} hàng.
          </div>
        ) : null}
        {state.status === 'paused' ? (
          <div className="banner draw" role="status">
            Đang tạm dừng.
          </div>
        ) : null}
        {state.status === 'won' ? (
          <div className="banner won" role="status">
            Xong {state.goal} hàng · {formatTime(state.elapsedMs)}.
          </div>
        ) : null}
        {state.status === 'lost' ? (
          <div className="banner lost" role="status">
            Đầy giếng. {state.lines}/{state.goal} hàng · {formatTime(state.elapsedMs)}.
          </div>
        ) : null}
        <div className="xep-stage">
          <div className="xep-side">
            <div className="xep-hud">
              <div>
                <b ref={linesRef}>
                  {state.lines}/{state.goal}
                </b>
                <span>hàng</span>
              </div>
              <div>
                <b ref={timeRef}>{formatTime(state.elapsedMs)}</b>
                <span>thời gian</span>
              </div>
              <div>
                <b ref={piecesRef}>
                  {state.pieces}
                </b>
                <span ref={rateRef}>khối · {pps.toFixed(2)}/s</span>
              </div>
              <div>
                <b ref={bestHudRef}>{best ? formatTime(best) : '—'}</b>
                <span>kỷ lục</span>
              </div>
            </div>
          </div>
          <div
            className={`xep-board${state.status === 'ready' || state.status === 'won' || state.status === 'lost' ? ' dimmed' : ''}`}
            ref={boardRef}
            style={{ '--cols': state.cols } as CSSProperties}
          >
            <LockedGrid grid={state.grid} />
            <div className="xep-live-layer" ref={layerRef}>
              <span className="xep-live xep-cell ghost" />
              <span className="xep-live xep-cell ghost" />
              <span className="xep-live xep-cell ghost" />
              <span className="xep-live xep-cell ghost" />
              <span className="xep-live xep-cell" />
              <span className="xep-live xep-cell" />
              <span className="xep-live xep-cell" />
              <span className="xep-live xep-cell" />
            </div>
            {state.status === 'ready' || state.status === 'won' || state.status === 'lost' ? (
              <div className="xep-veil">
                <button className="btn primary xep-start" onClick={start}>
                  Bắt đầu
                </button>
              </div>
            ) : null}
          </div>
          <div className="xep-side">
            <span className="xep-label">Kế</span>
            {state.queue.slice(0, 5).map((kind, index) => (
              <Mini key={`${kind}-${index}`} kind={kind} />
            ))}
          </div>
        </div>
        <p className="help">
          ← → di chuyển, ↑ xoay, ↓ thả mềm, Space thả mạnh, Z xoay ngược, P tạm dừng.
        </p>
      </div>
    </>
  )
}

function keyAction(event: KeyboardEvent) {
  const code = event.code
  const key = event.key
  if (code === 'ArrowLeft' || key === 'ArrowLeft') return 'left'
  if (code === 'ArrowRight' || key === 'ArrowRight') return 'right'
  if (code === 'ArrowDown' || key === 'ArrowDown') return 'down'
  if (code === 'ArrowUp' || key === 'ArrowUp' || key === 'x' || key === 'X' || code === 'KeyX') return 'cw'
  if (key === 'z' || key === 'Z' || code === 'KeyZ') return 'ccw'
  if (key === 'Enter' || code === 'Enter' || code === 'NumpadEnter') return 'start'
  if (key === ' ' || code === 'Space') return 'drop'
  if (key === 'p' || key === 'P' || key === 'Escape' || code === 'KeyP' || code === 'Escape') return 'pause'
  return null
}

const LockedGrid = memo(function LockedGrid({ grid }: { grid: (Kind | null)[][] }) {
  return (
    <>
      {grid.flat().map((kind, index) => (
        <span key={index} className={`xep-cell ${kind ?? ''}`} />
      ))}
    </>
  )
})

function Mini({ kind }: { kind: Kind | null }) {
  const cells = kind ? SHAPES[kind][0] : []
  return (
    <div className="xep-mini">
      {Array.from({ length: 16 }, (_, index) => {
        const x = index % 4
        const y = Math.floor(index / 4)
        const on = cells.some(([cx, cy]) => cx === x && cy === y)
        return <span key={index} className={`xep-cell${on && kind ? ` ${kind}` : ''}`} />
      })}
    </div>
  )
}

function placeMino(
  node: HTMLElement | undefined,
  cell: { x: number; y: number } | undefined,
  kind: Kind,
  stride: number,
  ghost: boolean,
) {
  if (!node) return
  if (!cell || cell.y < -1) {
    node.style.transform = 'translate3d(-240px, 0, 0)'
    return
  }
  node.className = `xep-live xep-cell ${kind}${ghost ? ' ghost' : ''}`
  node.style.transform = `translate3d(${cell.x * stride}px, ${cell.y * stride}px, 0)`
}

function formatTime(ms: number) {
  const total = Math.max(0, ms) / 1000
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`
}

function readBest(goal: Goal) {
  try {
    const raw = window.localStorage.getItem(BEST_KEY)
    if (!raw) return 0
    const parsed = JSON.parse(raw) as Record<string, number>
    return parsed[String(goal)] ?? 0
  } catch {
    return 0
  }
}

function writeBest(goal: Goal, value: number) {
  try {
    const raw = window.localStorage.getItem(BEST_KEY)
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {}
    parsed[String(goal)] = value
    window.localStorage.setItem(BEST_KEY, JSON.stringify(parsed))
  } catch {
    /* ignore quota / private mode */
  }
}

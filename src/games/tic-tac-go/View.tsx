import { useEffect, useMemo, useRef, useState, type CSSProperties, type TouchEvent } from 'react'
import { move, startLevel, type Dir, type Level, type State } from './engine'
import { eightByEightLevel } from './generate'
import { levels } from './levels'

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

export function TicTacGoPreview() {
  return (
    <div className="preview-ttg">
      <span className="ttg-cell o">O</span>
      <span className="ttg-cell empty">
        <span className="player" />
      </span>
      <span className="ttg-cell x">X</span>
    </div>
  )
}

export function TicTacGoView() {
  const [levelIndex, setLevelIndex] = useState(0)
  const [level, setLevel] = useState<Level>(() => levels[0])
  const [history, setHistory] = useState<State[]>(() => [startLevel(levels[0])])
  const state = history[history.length - 1]
  const elapsed = useElapsed(state)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const canShuffle = level.cells.length === 8 && (level.cells[0]?.length ?? 0) === 8

  useEffect(() => {
    const next = levels[levelIndex]
    setLevel(next)
    setHistory([startLevel(next)])
  }, [levelIndex])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const dir = KEYS[event.key]
      if (!dir) return
      event.preventDefault()
      setHistory((prev) => {
        const current = prev[prev.length - 1]
        const next = move(current, dir)
        if (next === current) return prev
        return [...prev, next]
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const board = useMemo(() => state.cells, [state])

  return (
    <>
      <div className="stats">
        <div className="stat">
          <b>{state.moves}</b>
          <span>nước đi · par {level.par}</span>
        </div>
        <div className="stat">
          <b>{formatMs(elapsed)}</b>
          <span>thời gian</span>
        </div>
        <div className="stat">
          <b>
            {levelIndex + 1}/{levels.length}
          </b>
          <span>{level.name}</span>
        </div>
      </div>
      <div className="toolbar">
        <button className="btn" onClick={() => setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h))}>
          Hoàn tác
        </button>
        <button className="btn" onClick={() => setHistory([startLevel(level)])}>
          Chơi lại
        </button>
        {canShuffle ? (
          <button className="btn" onClick={shuffleBoard}>
            Xáo bàn
          </button>
        ) : null}
        {state.status === 'won' && levelIndex < levels.length - 1 ? (
          <button className="btn primary" onClick={() => setLevelIndex((i) => i + 1)}>
            Màn sau
          </button>
        ) : null}
      </div>
      <div className="level-row">
        {levels.map((item, index) => (
          <button
            key={item.id}
            className="btn"
            data-active={index === levelIndex}
            onClick={() => setLevelIndex(index)}
          >
            {index + 1}
          </button>
        ))}
      </div>
      <div className="board-wrap">
        {state.status === 'won' ? (
          <div className="banner won" role="status">
            Ba O thẳng hàng. Xong.
          </div>
        ) : null}
        {state.status === 'lost' ? (
          <div className="banner lost" role="status">
            Ba X thẳng hàng. Thua.
          </div>
        ) : null}
        <div
          className="ttg-board"
          style={{ '--cols': board[0].length } as CSSProperties}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {board.map((row, y) =>
            row.map((cell, x) => {
              const isPlayer = state.player.x === x && state.player.y === y
              const kind = isPlayer ? 'empty' : cell
              return (
                <div key={`${x}-${y}`} className={`ttg-cell ${kind}`}>
                  {isPlayer ? <span className="player" /> : cell === 'x' ? 'X' : cell === 'o' ? 'O' : null}
                </div>
              )
            }),
          )}
        </div>
        <p className="help">
          Đẩy X và O. Nhân vật của bạn cũng là một O. Ba O thắng, ba X thua. Mũi tên hoặc WASD.
          {canShuffle ? ' Màn 5–6: Xáo bàn để thuật toán đặt lại X và O.' : ''}
        </p>
        <div className="pad">
          <span className="spacer" />
          <button className="btn" onClick={() => pushDir('U')}>
            ↑
          </button>
          <span className="spacer" />
          <button className="btn" onClick={() => pushDir('L')}>
            ←
          </button>
          <button className="btn" onClick={() => pushDir('D')}>
            ↓
          </button>
          <button className="btn" onClick={() => pushDir('R')}>
            →
          </button>
        </div>
      </div>
    </>
  )

  function pushDir(dir: Dir) {
    setHistory((prev) => {
      const current = prev[prev.length - 1]
      const next = move(current, dir)
      if (next === current) return prev
      return [...prev, next]
    })
  }

  function shuffleBoard() {
    const generated = eightByEightLevel(level.id, level.name, Date.now())
    if (!generated) return
    setLevel(generated)
    setHistory([startLevel(generated)])
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
    if (Math.abs(dx) > Math.abs(dy)) pushDir(dx > 0 ? 'R' : 'L')
    else pushDir(dy > 0 ? 'D' : 'U')
  }
}

function useElapsed(state: State) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!state.startedAt || state.status !== 'playing') return
    const id = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(id)
  }, [state.startedAt, state.status])
  if (!state.startedAt) return 0
  return Math.max(0, now - state.startedAt)
}

function formatMs(ms: number) {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

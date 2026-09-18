import { useEffect, useState, type CSSProperties } from 'react'
import { PRESETS, createGame, reveal, toggleFlag, type Difficulty, type State } from './engine'

export function MinesweeperPreview() {
  return (
    <div className="preview-ms">
      <span className="ms-cell revealed n1">1</span>
      <span className="ms-cell flag" />
      <span className="ms-cell revealed" />
      <span className="ms-cell" />
      <span className="ms-cell revealed n2">2</span>
      <span className="ms-cell revealed mine">●</span>
    </div>
  )
}

export function MinesweeperView() {
  const [state, setState] = useState<State>(() => createGame('beginner'))
  const elapsed = useElapsed(state)
  const difficulty = state.difficulty

  return (
    <>
      <div className="stats">
        <div className="stat">
          <b>
            {state.flags}/{state.mines}
          </b>
          <span>cờ / mìn</span>
        </div>
        <div className="stat">
          <b>{formatMs(elapsed)}</b>
          <span>thời gian</span>
        </div>
        <div className="stat">
          <b>{PRESETS[difficulty].label}</b>
          <span>cỡ bàn</span>
        </div>
      </div>
      <div className="toolbar">
        {(Object.keys(PRESETS) as Difficulty[]).map((key) => (
          <button key={key} className="btn" data-active={key === difficulty} onClick={() => setState(createGame(key))}>
            {key === 'beginner' ? 'Dễ' : key === 'intermediate' ? 'Vừa' : 'Khó'}
          </button>
        ))}
        <button className="btn" onClick={() => setState(createGame(difficulty))}>
          Ván mới
        </button>
      </div>
      <div className="board-wrap">
        {state.status === 'won' ? (
          <div className="banner won" role="status">
            Sạch mìn.
          </div>
        ) : null}
        {state.status === 'lost' ? (
          <div className="banner lost" role="status">
            Trúng mìn.
          </div>
        ) : null}
        <div
          className="ms-board"
          onContextMenu={(event) => event.preventDefault()}
          style={{ '--cols': state.w } as CSSProperties}
        >
          {state.cells.map((row, y) =>
            row.map((cell, x) => (
              <button
                key={`${x}-${y}`}
                className={[
                  'ms-cell',
                  cell.revealed ? 'revealed' : '',
                  cell.revealed && cell.mine ? 'mine' : '',
                  cell.flagged ? 'flag' : '',
                  cell.revealed && cell.near ? `n${cell.near}` : '',
                ].join(' ')}
                aria-label={
                  cell.revealed
                    ? cell.mine
                      ? 'mìn'
                      : cell.near
                        ? `${cell.near} mìn lân cận`
                        : 'ô trống'
                    : cell.flagged
                      ? 'cờ'
                      : 'ô ẩn'
                }
                onClick={() => setState((current) => reveal(current, x, y))}
                onContextMenu={(event) => {
                  event.preventDefault()
                  setState((current) => toggleFlag(current, x, y))
                }}
              >
                {cell.revealed && cell.mine ? '●' : cell.revealed && cell.near ? cell.near : ''}
              </button>
            )),
          )}
        </div>
        <p className="help">Click mở ô. Chuột phải để cắm cờ. Click đầu tiên luôn an toàn.</p>
      </div>
    </>
  )
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

import { useEffect, useState, type CSSProperties } from 'react'
import {
  COLORS,
  clearPath,
  createGame,
  hint,
  remainingPairs,
  shuffleBoard,
  tap,
  type Pos,
  type State,
} from './engine'

export function GhepMauPreview() {
  return (
    <div className="preview-ghep">
      <span style={{ background: COLORS[0] }} />
      <span style={{ background: COLORS[4] }} />
      <span style={{ background: COLORS[0] }} />
      <span style={{ background: COLORS[2] }} />
      <span style={{ background: COLORS[6] }} />
      <span style={{ background: COLORS[2] }} />
      <span style={{ background: COLORS[4] }} />
      <span style={{ background: COLORS[6] }} />
      <span />
    </div>
  )
}

export function GhepMauView() {
  const [state, setState] = useState<State>(() => createGame())

  useEffect(() => {
    if (!state.path) return
    const id = window.setTimeout(() => setState(clearPath), 320)
    return () => window.clearTimeout(id)
  }, [state.pathId, state.path])

  const pairs = remainingPairs(state)

  return (
    <>
      <div className="stats">
        <div className="stat">
          <b>{pairs}</b>
          <span>cặp còn</span>
        </div>
        <div className="stat">
          <b>{state.matches}</b>
          <span>đã ghép</span>
        </div>
        <div className="stat">
          <b>
            {state.w}×{state.h}
          </b>
          <span>bàn</span>
        </div>
      </div>
      <div className="toolbar">
        <button className="btn" onClick={() => setState(createGame())}>
          Ván mới
        </button>
        <button className="btn" onClick={() => setState(shuffleBoard)} disabled={state.status === 'won'}>
          Xáo bài
        </button>
        <button className="btn" onClick={() => setState(hint)} disabled={state.status === 'won'}>
          Gợi ý
        </button>
      </div>
      <div className="board-wrap">
        {state.status === 'won' ? (
          <div className="banner won" role="status">
            Hết ô. Ghép {state.matches} cặp.
          </div>
        ) : null}
        {state.shuffled ? (
          <div className="banner draw" role="status">
            Không còn nước đi — đã xáo lại.
          </div>
        ) : null}
        <div className="ghep-stage" style={{ '--cols': state.w, '--rows': state.h } as CSSProperties}>
          <div className="ghep-board">
            {state.cells.flatMap((row, y) =>
              row.map((color, x) => {
                const pos = { x, y }
                const selected = samePos(state.selected, pos)
                const hinted = state.hint?.some((item) => samePos(item, pos))
                return (
                  <button
                    key={`${x}-${y}`}
                    className={`ghep-cell${color == null ? ' empty' : ''}${selected ? ' selected' : ''}${hinted ? ' hint' : ''}`}
                    style={color == null ? undefined : { background: COLORS[color] }}
                    aria-label={color == null ? 'ô trống' : `ô màu ${color + 1}`}
                    onClick={() => setState((current) => tap(current, x, y))}
                  />
                )
              }),
            )}
          </div>
          {state.path ? (
            <svg className="ghep-path" viewBox={`0 0 ${state.w} ${state.h}`} preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="#f0c36b"
                strokeWidth="0.18"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={state.path.map((point) => `${point.x + 0.5},${point.y + 0.5}`).join(' ')}
              />
            </svg>
          ) : null}
        </div>
        <p className="help">
          Chọn hai ô cùng màu. Nối được nếu có đường đi qua chỗ trống, nhiều nhất hai khúc cua — được đi vòng ra ngoài bàn.
        </p>
      </div>
    </>
  )
}

function samePos(a: Pos | null | undefined, b: Pos) {
  return !!a && a.x === b.x && a.y === b.y
}

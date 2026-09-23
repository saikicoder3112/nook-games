import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  LABELS,
  conflicts,
  createGame,
  emptyCount,
  enterDigit,
  erase,
  hint,
  moveSelection,
  selectCell,
  toggleNoteMode,
  type Difficulty,
  type State,
} from './engine'

const BEST_KEY = 'nook-sudoku-best'
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

export function SudokuPreview() {
  return (
    <div className="preview-sudoku">
      <span>5</span>
      <span>3</span>
      <span />
      <span>6</span>
      <span />
      <span />
      <span />
      <span>9</span>
      <span>8</span>
    </div>
  )
}

export function SudokuView() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [state, setState] = useState<State>(() => createGame('easy'))
  const [best, setBest] = useState(() => readBest('easy'))
  const [now, setNow] = useState(() => Date.now())
  const started = useRef<number | null>(null)
  const finished = useRef<number | null>(null)

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
    if (state.status !== 'won' || state.hints > 0) return
    const elapsed = (finished.current ?? Date.now()) - (started.current ?? Date.now())
    if (elapsed <= 0) return
    setBest((current) => {
      const next = current === 0 ? elapsed : Math.min(current, elapsed)
      writeBest(state.difficulty, next)
      return next
    })
  }, [state.status, state.hints, state.difficulty])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault()
        const dx = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
        const dy = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
        setState((current) => moveSelection(current, dx, dy))
        return
      }
      if (event.key >= '1' && event.key <= '9') {
        event.preventDefault()
        setState((current) => enterDigit(current, Number(event.key)))
        return
      }
      if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
        event.preventDefault()
        setState(erase)
        return
      }
      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault()
        setState(toggleNoteMode)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const wrong = conflicts(state)
  const empty = emptyCount(state)
  const selected = state.selected
  const selectedValue = selected != null ? state.grid[selected].value : 0
  const elapsed = started.current == null ? 0 : (finished.current ?? now) - started.current

  return (
    <>
      <div className="stats">
        <div className="stat">
          <b>{empty}</b>
          <span>ô trống</span>
        </div>
        <div className="stat">
          <b>{formatMs(elapsed)}</b>
          <span>thời gian</span>
        </div>
        <div className="stat">
          <b>{best ? formatMs(best) : '—'}</b>
          <span>kỷ lục</span>
        </div>
      </div>
      <div className="toolbar">
        {DIFFICULTIES.map((entry) => (
          <button key={entry} className="btn" data-active={entry === difficulty} onClick={() => restart(entry)}>
            {LABELS[entry]}
          </button>
        ))}
        <button className="btn" onClick={() => restart(difficulty)}>
          Ván mới
        </button>
        <button className="btn" onClick={() => setState(hint)} disabled={state.status === 'won'}>
          Gợi ý
        </button>
      </div>
      <div className="board-wrap">
        {state.status === 'won' ? (
          <div className="banner won" role="status">
            Xong lưới · {formatMs(elapsed)}
            {state.hints ? ` · ${state.hints} gợi ý` : ''}.
          </div>
        ) : null}
        <div className="sudoku-board" style={{ '--cell': '38px' } as CSSProperties}>
          {state.grid.map((cell, index) => {
            const col = index % 9
            const row = Math.floor(index / 9)
            const classes = [
              'sudoku-cell',
              cell.given ? 'given' : '',
              cell.value && !cell.given ? 'filled' : '',
              selected === index ? 'selected' : '',
              selected != null && sameUnit(selected, index) ? 'unit' : '',
              selectedValue && cell.value === selectedValue ? 'same' : '',
              wrong[index] ? 'conflict' : '',
              col % 3 === 2 && col !== 8 ? 'box-right' : '',
              row % 3 === 2 && row !== 8 ? 'box-bottom' : '',
            ]
            return (
              <button
                key={index}
                className={classes.filter(Boolean).join(' ')}
                onClick={() => setState((current) => selectCell(current, index))}
                aria-label={cell.value ? String(cell.value) : `ô trống ${row + 1}-${col + 1}`}
              >
                {cell.value ? (
                  cell.value
                ) : cell.notes ? (
                  <span className="sudoku-notes">
                    {Array.from({ length: 9 }, (_, digit) => (
                      <i key={digit}>{cell.notes & (1 << (digit + 1)) ? digit + 1 : ''}</i>
                    ))}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
        <div className="sudoku-pad">
          {Array.from({ length: 9 }, (_, index) => (
            <button key={index} className="btn" onClick={() => setState((current) => enterDigit(current, index + 1))}>
              {index + 1}
            </button>
          ))}
          <button className="btn" onClick={() => setState(erase)}>
            Xóa
          </button>
          <button className="btn" data-active={state.noteMode} onClick={() => setState(toggleNoteMode)}>
            Ghi chú
          </button>
        </div>
        <p className="help">Chọn ô, điền 1–9. Ghi chú để đánh dấu khả năng. Hàng, cột và ô 3×3 không được trùng số.</p>
      </div>
    </>
  )

  function restart(next: Difficulty) {
    setDifficulty(next)
    setBest(readBest(next))
    started.current = null
    finished.current = null
    setState(createGame(next))
  }
}

function sameUnit(a: number, b: number) {
  const ra = Math.floor(a / 9)
  const rb = Math.floor(b / 9)
  const ca = a % 9
  const cb = b % 9
  return ra === rb || ca === cb || (Math.floor(ra / 3) === Math.floor(rb / 3) && Math.floor(ca / 3) === Math.floor(cb / 3))
}

function formatMs(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function readBest(difficulty: Difficulty) {
  try {
    const raw = window.localStorage.getItem(BEST_KEY)
    if (!raw) return 0
    const parsed = JSON.parse(raw) as Record<string, number>
    return parsed[difficulty] ?? 0
  } catch {
    return 0
  }
}

function writeBest(difficulty: Difficulty, value: number) {
  try {
    const raw = window.localStorage.getItem(BEST_KEY)
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {}
    parsed[difficulty] = value
    window.localStorage.setItem(BEST_KEY, JSON.stringify(parsed))
  } catch {
    /* ignore quota / private mode */
  }
}

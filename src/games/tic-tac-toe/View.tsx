import { useEffect, useRef, useState } from 'react'
import { LABELS, createGame, playAi, playHuman, type Difficulty, type State } from './engine'

export function TicTacToePreview() {
  return (
    <div className="preview-ttt">
      <span className="ttt-cell x">X</span>
      <span className="ttt-cell o">O</span>
      <span className="ttt-cell" />
      <span className="ttt-cell" />
      <span className="ttt-cell x">X</span>
      <span className="ttt-cell o">O</span>
    </div>
  )
}

export function TicTacToeView() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [state, setState] = useState<State>(() => createGame('easy'))
  const aiTimer = useRef<number>(0)

  useEffect(() => {
    return () => window.clearTimeout(aiTimer.current)
  }, [])

  return (
    <>
      <div className="stats">
        <div className="stat">
          <b>X</b>
          <span>bạn</span>
        </div>
        <div className="stat">
          <b>O</b>
          <span>máy</span>
        </div>
        <div className="stat">
          <b>{LABELS[difficulty]}</b>
          <span>độ khó</span>
        </div>
      </div>
      <div className="toolbar">
        {(Object.keys(LABELS) as Difficulty[]).map((key) => (
          <button
            key={key}
            className="btn"
            data-active={key === difficulty}
            onClick={() => {
              setDifficulty(key)
              restart(key)
            }}
          >
            {LABELS[key]}
          </button>
        ))}
        <button className="btn" onClick={() => restart(difficulty)}>
          Ván mới
        </button>
      </div>
      <div className="board-wrap">
        {state.status === 'won' ? <div className="banner won" role="status">Bạn thắng.</div> : null}
        {state.status === 'lost' ? <div className="banner lost" role="status">Máy thắng.</div> : null}
        {state.status === 'draw' ? <div className="banner draw" role="status">Hòa.</div> : null}
        <div className="ttt-board">
          {state.board.map((cell, index) => (
            <button
              key={index}
              className={`ttt-cell ${cell ?? ''}`}
              aria-label={cell ? cell.toUpperCase() : `ô ${index + 1}`}
              disabled={state.status !== 'playing' || state.turn !== state.human || cell !== null}
              onClick={() => takeTurn(index)}
            >
              {cell ? cell.toUpperCase() : ''}
            </button>
          ))}
        </div>
        <p className="help">
          {difficulty === 'easy'
            ? 'Dễ: máy hay đi ngẫu nhiên, có thể thắng.'
            : 'Impossible: minimax hoàn hảo — máy không bao giờ thua. Chơi hay nhất cũng chỉ hòa.'}
        </p>
      </div>
    </>
  )

  function restart(next: Difficulty) {
    window.clearTimeout(aiTimer.current)
    setState(createGame(next))
  }

  function takeTurn(index: number) {
    setState((current) => {
      const afterHuman = playHuman(current, index)
      if (afterHuman === current || afterHuman.status !== 'playing') return afterHuman
      window.clearTimeout(aiTimer.current)
      aiTimer.current = window.setTimeout(() => {
        setState((waiting) => playAi(waiting))
      }, 240)
      return afterHuman
    })
  }
}

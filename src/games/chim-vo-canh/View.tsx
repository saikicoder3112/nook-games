import { useEffect, useRef, useState } from 'react'
import {
  BIRD,
  GROUND,
  H,
  PIPE,
  W,
  birdTilt,
  createGame,
  flap,
  tick,
  type State,
} from './engine'

const BEST_KEY = 'nook-flappy-bird-best'

type Hud = {
  score: number
  status: State['status']
}

export function ChimVoCanhPreview() {
  return (
    <div className="preview-bird">
      <span className="preview-bird-pipe top" />
      <span className="preview-bird-body" />
      <span className="preview-bird-pipe bot" />
    </div>
  )
}

export function ChimVoCanhView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const stateRef = useRef<State>(createGame())
  const settledRef = useRef(false)
  const [best, setBest] = useState(() => readBest())
  const [hud, setHud] = useState<Hud>(() => snapshot(stateRef.current))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false }) ?? canvas.getContext('2d')
    if (!ctx) return
    ctxRef.current = ctx

    const fit = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.max(1, window.devicePixelRatio || 1)
      const pixelW = Math.max(1, Math.round(rect.width * dpr))
      const pixelH = Math.max(1, Math.round(rect.height * dpr))
      if (canvas.width !== pixelW || canvas.height !== pixelH) {
        canvas.width = pixelW
        canvas.height = pixelH
      }
      ctx.setTransform(pixelW / W, 0, 0, pixelH / H, 0, 0)
      draw(ctx, stateRef.current)
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(canvas)

    const onPointer = (event: PointerEvent) => {
      if (event.button !== 0) return
      event.preventDefault()
      apply(flap)
    }
    canvas.addEventListener('pointerdown', onPointer, { passive: false })

    let frame = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      stateRef.current = tick(stateRef.current, dt)
      const state = stateRef.current
      if (state.status === 'dead') {
        if (!settledRef.current) {
          settledRef.current = true
          const nextBest = Math.max(readBest(), state.score)
          writeBest(nextBest)
          setBest(nextBest)
        }
      } else {
        settledRef.current = false
      }
      const nextHud = snapshot(state)
      setHud((current) => (sameHud(current, nextHud) ? current : nextHud))
      draw(ctx, state)
      frame = window.requestAnimationFrame(loop)
    }
    frame = window.requestAnimationFrame(loop)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      canvas.removeEventListener('pointerdown', onPointer)
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== ' ' && event.code !== 'Space' && event.key !== 'ArrowUp') return
      event.preventDefault()
      apply(flap)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <div className="stats">
        <div className="stat">
          <b>{hud.score}</b>
          <span>ống</span>
        </div>
        <div className="stat">
          <b>{best}</b>
          <span>kỷ lục</span>
        </div>
        <div className="stat">
          <b>{hud.status === 'dead' ? 'thua' : hud.status === 'ready' ? 'chờ' : 'bay'}</b>
          <span>trạng thái</span>
        </div>
      </div>
      <div className="toolbar">
        <button className="btn" onClick={restart}>
          Chơi lại
        </button>
      </div>
      <div className="board-wrap">
        {hud.status === 'dead' ? (
          <div className="banner lost" role="status">
            Đụng rồi. {hud.score} ống.
          </div>
        ) : null}
        <div className={`bird-stage${hud.status !== 'playing' ? ' dimmed' : ''}`}>
          <canvas ref={canvasRef} className="bird-board" role="img" aria-label="Sân Flappy Bird" />
          {hud.status === 'ready' ? (
            <div className="bird-veil" onClick={() => apply(flap)}>
              <button
                className="btn primary xep-start"
                onClick={(event) => {
                  event.stopPropagation()
                  apply(flap)
                }}
              >
                Bắt đầu
              </button>
            </div>
          ) : null}
          {hud.status === 'dead' ? (
            <div className="bird-veil" onClick={restart}>
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
        <p className="help">Bấm, Space hoặc ↑ để vỗ cánh. Luồn qua khe ống, đừng đụng ống hay đất.</p>
      </div>
    </>
  )

  function apply(update: (state: State) => State) {
    stateRef.current = update(stateRef.current)
    setHud(snapshot(stateRef.current))
    const ctx = ctxRef.current
    if (ctx) draw(ctx, stateRef.current)
  }

  function restart() {
    settledRef.current = false
    stateRef.current = createGame()
    setHud(snapshot(stateRef.current))
    const ctx = ctxRef.current
    if (ctx) draw(ctx, stateRef.current)
  }
}

function snapshot(state: State): Hud {
  return { score: state.score, status: state.status }
}

function sameHud(a: Hud, b: Hud) {
  return a.score === b.score && a.status === b.status
}

function draw(ctx: CanvasRenderingContext2D, state: State) {
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#7db4ff')
  sky.addColorStop(1, '#5eb8d6')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  drawClouds(ctx, state.time)
  for (const pipe of state.pipes) drawPipe(ctx, pipe.x, pipe.gapY)
  drawGround(ctx, state.ground)
  drawBird(ctx, state)

  ctx.fillStyle = '#f7f1e8'
  ctx.font = '700 28px Fraunces, Georgia, serif'
  ctx.textAlign = 'center'
  ctx.strokeStyle = '#2a2110'
  ctx.lineWidth = 4
  ctx.strokeText(String(state.score), W / 2, 48)
  ctx.fillText(String(state.score), W / 2, 48)
}

function drawClouds(ctx: CanvasRenderingContext2D, time: number) {
  ctx.fillStyle = 'rgba(247, 241, 232, 0.35)'
  const drift = (time * 18) % (W + 80)
  blob(ctx, 40 - drift * 0.4, 70, 28)
  blob(ctx, 220 - drift * 0.25, 110, 22)
  blob(ctx, 300 - drift * 0.35, 58, 18)
}

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.arc(x + r * 0.9, y + 4, r * 0.75, 0, Math.PI * 2)
  ctx.arc(x - r * 0.7, y + 6, r * 0.65, 0, Math.PI * 2)
  ctx.fill()
}

function drawPipe(ctx: CanvasRenderingContext2D, x: number, gapY: number) {
  const bottomY = gapY + PIPE.gap
  const bottomH = H - GROUND - bottomY
  paintPipe(ctx, x, 0, gapY, true)
  paintPipe(ctx, x, bottomY, bottomH, false)
}

function paintPipe(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, top: boolean) {
  if (h <= 0) return
  ctx.fillStyle = '#6aa84a'
  roundRect(ctx, x, y, PIPE.w, h, 6)
  ctx.fill()
  ctx.fillStyle = '#9fd36a'
  roundRect(ctx, x + 6, y, 12, h, 4)
  ctx.fill()
  const lipY = top ? y + h - 16 : y
  ctx.fillStyle = '#5b8f3a'
  roundRect(ctx, x - 5, lipY, PIPE.w + 10, 16, 5)
  ctx.fill()
}

function drawGround(ctx: CanvasRenderingContext2D, offset: number) {
  const y = H - GROUND
  ctx.fillStyle = '#c9a227'
  ctx.fillRect(0, y, W, GROUND)
  ctx.fillStyle = '#e8c36a'
  ctx.fillRect(0, y, W, 14)
  ctx.fillStyle = '#b8892a'
  for (let x = -offset; x < W + 48; x += 24) {
    ctx.fillRect(x, y + 18, 12, 8)
  }
}

function drawBird(ctx: CanvasRenderingContext2D, state: State) {
  const tilt = birdTilt(state)
  const beat = Math.sin(state.time * (state.status === 'playing' ? 22 : 5))
  ctx.save()
  ctx.translate(BIRD.x, state.birdY)
  ctx.rotate(tilt)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  ctx.save()
  ctx.translate(-7, 3)
  ctx.rotate(-0.32 + beat * 0.85)
  ctx.fillStyle = '#e24b3b'
  ctx.strokeStyle = '#3d2410'
  ctx.lineWidth = 2.1
  ctx.beginPath()
  ctx.ellipse(0, 0, 11, 7.2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = '#c43d30'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.ellipse(0, 0, 6, 3.6, 0, Math.PI * 0.15, Math.PI * 0.85)
  ctx.stroke()
  ctx.restore()

  ctx.fillStyle = '#f8d04a'
  ctx.strokeStyle = '#3d2410'
  ctx.lineWidth = 2.6
  ctx.beginPath()
  ctx.ellipse(0, 0, 17.4, 16.6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#fff6e0'
  ctx.beginPath()
  ctx.ellipse(1.2, 6.6, 12.2, 8.2, 0.06, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#f8d04a'
  ctx.strokeStyle = '#3d2410'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-7, -13)
  ctx.quadraticCurveTo(-9, -20, -3, -15.5)
  ctx.quadraticCurveTo(1, -20, 4, -13.2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#f5a33a'
  ctx.strokeStyle = '#3d2410'
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(13, -1.6)
  ctx.lineTo(23, 1)
  ctx.lineTo(13, 3.8)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#e07030'
  ctx.beginPath()
  ctx.moveTo(13, 4)
  ctx.lineTo(21.5, 5.6)
  ctx.lineTo(13, 8)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#3d2410'
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.arc(6.5, -4.6, 7.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#1a140c'
  ctx.beginPath()
  ctx.arc(9.6, -4.6, 3.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(8.2, -6.2, 1.4, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius)
    return
  }
  ctx.rect(x, y, w, h)
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

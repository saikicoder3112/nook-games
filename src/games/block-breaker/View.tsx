import { useEffect, useRef, useState } from 'react'
import {
  H,
  W,
  aimPaddle,
  createGame,
  launch,
  remainingBricks,
  tick,
  togglePause,
  type Input,
  type State,
} from './engine'

const BEST_KEY = 'nook-breaker-best'

type Hud = {
  score: number
  lives: number
  left: number
  balls: number
  status: State['status']
  attached: boolean
}

export function BlockBreakerPreview() {
  return (
    <div className="preview-breaker">
      <div className="preview-breaker-bricks">
        <span />
        <span />
        <span className="special" />
        <span />
        <span />
        <span className="special" />
        <span />
        <span />
      </div>
      <span className="preview-breaker-ball" />
      <span className="preview-breaker-paddle" />
    </div>
  )
}

export function BlockBreakerView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLSpanElement>(null)
  const aimElRef = useRef<HTMLElement | null>(null)
  const capturingRef = useRef<number | null>(null)
  const stateRef = useRef<State>(createGame())
  const inputRef = useRef<Input>({ targetX: null })
  const settledRef = useRef(false)
  const [best, setBest] = useState(() => readBest())
  const [hud, setHud] = useState<Hud>(() => snapshot(stateRef.current))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }) ?? canvas.getContext('2d')
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
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(canvas)

    const rail = railRef.current
    const aimFromEvent = (event: PointerEvent, el: HTMLElement) => {
      inputRef.current.targetX = worldXFromClient(event.clientX, el)
      aimPaddle(stateRef.current, inputRef.current.targetX)
      draw(ctx, stateRef.current)
      syncRail(stateRef.current, railRef.current, knobRef.current)
    }

    const onPointerDown = (launchOnDown: boolean) => (event: PointerEvent) => {
      if (event.button !== 0) return
      event.preventDefault()
      const el = event.currentTarget as HTMLElement
      capturingRef.current = event.pointerId
      aimElRef.current = el
      aimFromEvent(event, el)
      try {
        el.setPointerCapture(event.pointerId)
      } catch {
        /* some synthetic clicks have no capture */
      }
      if (launchOnDown && stateRef.current.attached) {
        stateRef.current = launch(stateRef.current)
        setHud(snapshot(stateRef.current))
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      const captured = capturingRef.current != null
      if (captured && event.pointerId !== capturingRef.current) return
      const el = (captured ? aimElRef.current : (event.currentTarget as HTMLElement)) ?? null
      if (!el) return
      if (!captured && event.pointerType !== 'mouse') return
      aimFromEvent(event, el)
    }

    const onCanvasDown = onPointerDown(true)
    const onRailDown = onPointerDown(false)
    canvas.addEventListener('pointerdown', onCanvasDown, { passive: false })
    canvas.addEventListener('pointermove', onPointerMove)
    rail?.addEventListener('pointerdown', onRailDown, { passive: false })
    rail?.addEventListener('pointermove', onPointerMove)

    let frame = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      stateRef.current = tick(stateRef.current, dt, inputRef.current)
      const state = stateRef.current
      if (state.status === 'dead' || state.status === 'won') {
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
      syncRail(state, railRef.current, knobRef.current)
      frame = window.requestAnimationFrame(loop)
    }
    frame = window.requestAnimationFrame(loop)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      canvas.removeEventListener('pointerdown', onCanvasDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      rail?.removeEventListener('pointerdown', onRailDown)
      rail?.removeEventListener('pointermove', onPointerMove)
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault()
        apply((current) => (current.attached ? launch(current) : togglePause(current)))
      }
    }
    const onMove = (event: PointerEvent) => {
      if (capturingRef.current == null || event.pointerId !== capturingRef.current) return
      const el = aimElRef.current
      if (!el) return
      inputRef.current.targetX = worldXFromClient(event.clientX, el)
      aimPaddle(stateRef.current, inputRef.current.targetX)
      const ctx = ctxRef.current
      if (ctx) draw(ctx, stateRef.current)
      syncRail(stateRef.current, railRef.current, knobRef.current)
    }
    const onUp = (event: PointerEvent) => {
      if (capturingRef.current !== event.pointerId) return
      capturingRef.current = null
      aimElRef.current = null
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

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
          <b>{hud.lives}</b>
          <span>mạng</span>
        </div>
        <div className="stat">
          <b>{hud.left}</b>
          <span>gạch</span>
        </div>
        <div className="stat">
          <b>{hud.balls}</b>
          <span>bóng</span>
        </div>
      </div>
      <div className="toolbar">
        <button className="btn" onClick={restart}>
          Chơi lại
        </button>
        <button className="btn" onClick={() => apply(hud.attached ? launch : togglePause)}>
          {hud.attached ? 'Phóng bóng' : hud.status === 'paused' ? 'Tiếp tục' : 'Tạm dừng'}
        </button>
      </div>
      <div className="board-wrap">
        {hud.status === 'ready' || (hud.attached && hud.status === 'playing') ? (
          <div className="banner draw" role="status">
            {hud.lives < 3 && hud.status !== 'ready' ? `Rớt bóng. Còn ${hud.lives} mạng.` : 'Chạm hoặc Space để phóng bóng.'}
          </div>
        ) : null}
        {hud.status === 'paused' ? (
          <div className="banner draw" role="status">
            Đang tạm dừng.
          </div>
        ) : null}
        {hud.status === 'dead' ? (
          <div className="banner lost" role="status">
            Hết mạng. {hud.score} điểm.
          </div>
        ) : null}
        {hud.status === 'won' ? (
          <div className="banner won" role="status">
            Phá xong hết gạch!
          </div>
        ) : null}
        <div className="breaker-stage">
          <canvas
            ref={canvasRef}
            className="breaker-board"
            role="img"
            aria-label="Sân Block Breaker"
          />
        </div>
        <div
          ref={railRef}
          className="breaker-rail"
          role="slider"
          aria-label="Thanh đỡ"
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span ref={knobRef} className="breaker-rail-knob" />
        </div>
        <p className="help">
          Kéo chuột trên sân hoặc thanh dưới để đẩy thanh đỡ. Gạch có hai chấm vàng sinh thêm bóng. Space phóng bóng và
          tạm dừng.
        </p>
      </div>
    </>
  )

  function apply(update: (state: State) => State) {
    stateRef.current = update(stateRef.current)
    setHud(snapshot(stateRef.current))
  }

  function restart() {
    inputRef.current = { targetX: null }
    capturingRef.current = null
    aimElRef.current = null
    settledRef.current = false
    stateRef.current = createGame()
    setHud(snapshot(stateRef.current))
  }
}

function snapshot(state: State): Hud {
  return {
    score: state.score,
    lives: state.lives,
    left: remainingBricks(state),
    balls: state.balls.length,
    status: state.status,
    attached: state.attached,
  }
}

function sameHud(a: Hud, b: Hud) {
  return (
    a.score === b.score &&
    a.lives === b.lives &&
    a.left === b.left &&
    a.balls === b.balls &&
    a.status === b.status &&
    a.attached === b.attached
  )
}

function worldXFromClient(clientX: number, el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  return ((clientX - rect.left) / Math.max(rect.width, 1)) * W
}

function syncRail(state: State, rail: HTMLDivElement | null, knob: HTMLSpanElement | null) {
  if (!rail || !knob) return
  const width = rail.clientWidth
  const knobW = Math.max(36, (state.paddle.w / W) * width)
  const center = ((state.paddle.x + state.paddle.w / 2) / W) * width
  knob.style.width = `${knobW}px`
  knob.style.transform = `translate3d(${center - knobW / 2}px, -50%, 0)`
}

function draw(ctx: CanvasRenderingContext2D, state: State) {
  ctx.fillStyle = '#171411'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#2b2118'
  roundRect(ctx, 8, 8, W - 16, H - 16, 18)
  ctx.fill()

  for (const brick of state.bricks) {
    if (!brick.alive) continue
    ctx.fillStyle = brick.color
    roundRect(ctx, brick.x, brick.y, brick.w, brick.h, 4)
    ctx.fill()
    if (brick.power === 'multiball') drawSpecialMark(ctx, brick)
  }

  ctx.fillStyle = '#f3ece1'
  roundRect(ctx, state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h, 8)
  ctx.fill()

  ctx.fillStyle = '#f0c36b'
  for (const ball of state.balls) {
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawSpecialMark(ctx: CanvasRenderingContext2D, brick: { x: number; y: number; w: number; h: number }) {
  const cx = brick.x + brick.w / 2
  const cy = brick.y + brick.h / 2
  ctx.strokeStyle = 'rgba(255, 246, 216, 0.85)'
  ctx.lineWidth = 1.2
  roundRect(ctx, brick.x + 1.2, brick.y + 1.2, brick.w - 2.4, brick.h - 2.4, 3)
  ctx.stroke()
  ctx.fillStyle = '#fff6d8'
  ctx.beginPath()
  ctx.arc(cx - 4.2, cy, 2.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx + 4.2, cy, 2.35, 0, Math.PI * 2)
  ctx.fill()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
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

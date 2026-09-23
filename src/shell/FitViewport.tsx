import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

type Props = {
  children: ReactNode
}

export function FitViewport({ children }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const host = hostRef.current
    const inner = innerRef.current
    if (!host || !inner) return

    const measure = () => {
      const availW = host.clientWidth
      const availH = host.clientHeight
      const needW = inner.offsetWidth
      const needH = inner.offsetHeight
      if (availW < 8 || availH < 8 || needW < 8 || needH < 8) return
      const next = Math.min(1, availW / needW, availH / needH)
      setScale((current) => (Math.abs(current - next) < 0.004 ? current : next))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(host)
    observer.observe(inner)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="fit-host" ref={hostRef}>
      <div
        className="fit-inner"
        ref={innerRef}
        style={{ '--fit': String(scale) } as CSSProperties}
      >
        {children}
      </div>
    </div>
  )
}

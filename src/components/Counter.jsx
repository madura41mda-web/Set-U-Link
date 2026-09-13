import { useEffect, useRef, useState } from 'react'

/**
 * Animated number counter — starts when scrolled into view,
 * matching the demo's `.counter[data-target]` behaviour.
 */
export default function Counter({ target }) {
  const ref = useRef(null)
  const [value, setValue] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          io.unobserve(entry.target)
          let cur = 0
          const step = Math.max(1, Math.floor(target / 80))
          const tick = () => {
            cur += step
            if (cur >= target) {
              setValue(target)
            } else {
              setValue(cur)
              raf = requestAnimationFrame(tick)
            }
          }
          tick()
        })
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [target])

  return (
    <span ref={ref}>{value.toLocaleString()}</span>
  )
}

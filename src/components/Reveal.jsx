import { useEffect, useRef } from 'react'

/**
 * Scroll-reveal wrapper: mirrors the demo's IntersectionObserver behaviour
 * (adds `.in` when the element enters the viewport, then stops observing).
 * `delay` maps to the demo's d1–d4 utility classes.
 */
export default function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const delayClass = delay ? ` d${delay}` : ''
  return (
    <Tag ref={ref} className={`reveal${delayClass}${className ? ` ${className}` : ''}`}>
      {children}
    </Tag>
  )
}

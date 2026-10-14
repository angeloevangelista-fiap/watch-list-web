import { useState } from 'react'
import { Film } from 'lucide-react'

function hue(text) {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

export default function Poster({ item }) {
  const [broken, setBroken] = useState(false)
  const showImage = item.posterUrl && !broken

  if (showImage) {
    return <img className="poster" src={item.posterUrl} alt="" loading="lazy" onError={() => setBroken(true)} />
  }

  const h = hue(item.title || '?')
  return (
    <div
      className="poster poster-generated"
      style={{
        background: `radial-gradient(120% 80% at 20% 0%, hsl(${h} 70% 45% / .9), transparent 60%),
                     linear-gradient(165deg, hsl(${h} 55% 28%), hsl(${(h + 50) % 360} 60% 10%))`,
      }}
      aria-hidden="true"
    >
      <Film className="poster-icon" size={22} />
      <span className="poster-title">{item.title}</span>
      {item.year && <span className="poster-year">{item.year}</span>}
    </div>
  )
}

import { Star } from 'lucide-react'

export default function Stars({ value, onChange, disabled, size = 16 }) {
  return (
    <div className="stars" role={onChange ? 'radiogroup' : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value != null && n <= value
        const star = <Star size={size} className={filled ? 'star filled' : 'star'} />
        if (!onChange) return <span key={n}>{star}</span>
        return (
          <button
            key={n}
            type="button"
            className="star-btn"
            disabled={disabled}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            title={value === n ? 'Clear rating' : `Rate ${n}`}
            onClick={() => onChange(value === n ? null : n)}
          >
            {star}
          </button>
        )
      })}
    </div>
  )
}

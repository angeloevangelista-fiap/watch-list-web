import { Check, Eye, Pencil, Trash2 } from 'lucide-react'
import Poster from './Poster'
import Stars from './Stars'

export default function ItemCard({ item, busy, showRating, onEdit, onDelete, onToggleWatched, onRate }) {
  return (
    <article className={`card ${item.watched ? 'is-watched' : ''} ${busy ? 'is-busy' : ''}`}>
      <div className="card-media">
        <Poster item={item} />
        <span className="badge badge-type">{item.type?.toLowerCase() === 'series' ? 'Series' : 'Movie'}</span>
        {item.watched && (
          <span className="badge badge-watched" title="Watched">
            <Check size={14} strokeWidth={3} />
          </span>
        )}
        <div className="card-actions">
          <button className="icon-btn glass" onClick={() => onEdit(item)} aria-label={`Edit ${item.title}`}>
            <Pencil size={16} />
          </button>
          <button className="icon-btn glass danger" onClick={() => onDelete(item)} aria-label={`Delete ${item.title}`}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="card-body">
        <h3 className="card-title" title={item.title}>{item.title}</h3>
        <p className="card-meta">
          {[item.year, item.genre].filter(Boolean).join(' · ') || ' '}
        </p>
        {showRating && <Stars value={item.rating ?? null} disabled={busy} onChange={(r) => onRate(item, r)} />}
        <button
          className={`watch-toggle ${item.watched ? 'on' : ''}`}
          disabled={busy}
          onClick={() => onToggleWatched(item)}
        >
          {item.watched ? <Check size={15} /> : <Eye size={15} />}
          {item.watched ? 'Watched' : 'Mark as watched'}
        </button>
      </div>
    </article>
  )
}

import { useState } from 'react'
import { Film, Tv } from 'lucide-react'
import Modal from './Modal'
import Stars from './Stars'

const MAX_YEAR = new Date().getFullYear() + 5

const FIELDS = ['title', 'type', 'year', 'genre', 'posterUrl', 'notes', 'watched', 'rating']

const EMPTY = { title: '', type: 'movie', year: '', genre: '', posterUrl: '', notes: '', watched: false, rating: null }

function clientValidate(v) {
  const errors = {}
  if (!v.title.trim()) errors.title = 'Title is required'
  else if (v.title.length > 120) errors.title = 'Title must have at most 120 characters'
  if (v.year !== '') {
    const y = Number(v.year)
    if (!Number.isInteger(y) || y < 1888 || y > MAX_YEAR) errors.year = `Year must be between 1888 and ${MAX_YEAR}`
  }
  return errors
}

/**
 * Create / edit form.
 * - `serverValidation` (Phase 2) disables every client-side check, so bad data reaches the API.
 * - Field errors returned by the API as { errors: { field: message } } are always displayed.
 */
export default function ItemForm({ item, showRating, serverValidation, onSubmit, onClose }) {
  const editing = Boolean(item)
  const [values, setValues] = useState(() => ({
    ...EMPTY,
    ...(item ?? {}),
    type: item?.type?.toLowerCase() || 'movie',
    year: item?.year ?? '',
    genre: item?.genre ?? '',
    posterUrl: item?.posterUrl ?? '',
    notes: item?.notes ?? '',
  }))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null) // { message, details: string[] }
  const [saving, setSaving] = useState(false)

  const set = (field) => (e) => {
    const value = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e
    setValues((v) => ({ ...v, [field]: value }))
    setErrors((errs) => ({ ...errs, [field]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)

    if (!serverValidation) {
      const errs = clientValidate(values)
      setErrors(errs)
      if (Object.keys(errs).length) return
    }

    const payload = {
      title: values.title.trim(),
      type: values.type,
      // With server validation on, send exactly what was typed (e.g. "abc") so the API has to deal with it.
      year: values.year === '' ? null : serverValidation && isNaN(Number(values.year)) ? values.year : Number(values.year),
      genre: values.genre.trim(),
      posterUrl: values.posterUrl.trim(),
      notes: values.notes.trim(),
      watched: values.watched,
    }
    if (showRating || (item && 'rating' in item)) payload.rating = values.rating ?? null

    setSaving(true)
    try {
      await onSubmit(payload)
      onClose()
    } catch (err) {
      setSaving(false)
      // ASP.NET Core validation errors, already normalized to { field: message }.
      const fieldErrors = err.fieldErrors ?? {}
      const shown = Object.fromEntries(Object.entries(fieldErrors).filter(([k]) => FIELDS.includes(k)))
      const others = Object.entries(fieldErrors)
        .filter(([k]) => !FIELDS.includes(k))
        .map(([k, msg]) => `${k}: ${msg}`)
      setErrors(shown)
      setFormError({ message: err.message, details: others })
    }
  }

  const field = (name) => ({ 'aria-invalid': Boolean(errors[name]), className: errors[name] ? 'invalid' : '' })

  return (
    <Modal
      title={editing ? 'Edit title' : 'Add to watchlist'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="item-form" className="btn primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add title'}
          </button>
        </>
      }
    >
      <form id="item-form" className="form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <div className="alert error column">
            <span>{formError.message}</span>
            {formError.details.length > 0 && (
              <ul>
                {formError.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <label className="field">
          <span>Title</span>
          <input autoFocus value={values.title} onChange={set('title')} placeholder="e.g. Blade Runner 2049" {...field('title')} />
          {errors.title && <small className="error-text">{errors.title}</small>}
        </label>

        <div className="field">
          <span>Type</span>
          <div className="segmented" role="radiogroup">
            {[
              ['movie', 'Movie', Film],
              ['series', 'Series', Tv],
            ].map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={values.type === value}
                className={values.type === value ? 'active' : ''}
                onClick={() => set('type')(value)}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
          {errors.type && <small className="error-text">{errors.type}</small>}
        </div>

        <div className="row">
          <label className="field">
            <span>Year</span>
            <input inputMode="numeric" value={values.year} onChange={set('year')} placeholder="2024" {...field('year')} />
            {errors.year && <small className="error-text">{errors.year}</small>}
          </label>
          <label className="field">
            <span>Genre</span>
            <input value={values.genre} onChange={set('genre')} placeholder="Sci-Fi" {...field('genre')} />
            {errors.genre && <small className="error-text">{errors.genre}</small>}
          </label>
        </div>

        <label className="field">
          <span>Poster URL <em>optional</em></span>
          <input type="url" value={values.posterUrl} onChange={set('posterUrl')} placeholder="https://…" {...field('posterUrl')} />
          {errors.posterUrl && <small className="error-text">{errors.posterUrl}</small>}
        </label>

        <label className="field">
          <span>Notes <em>optional</em></span>
          <textarea rows={3} value={values.notes} onChange={set('notes')} placeholder="Recommended by…" {...field('notes')} />
          {errors.notes && <small className="error-text">{errors.notes}</small>}
        </label>

        <div className="row center">
          <label className="switch">
            <input type="checkbox" checked={values.watched} onChange={set('watched')} />
            <span className="switch-track" />
            Already watched
          </label>
          {showRating && (
            <div className="field inline">
              <span>Rating</span>
              <Stars value={values.rating} onChange={set('rating')} size={20} />
            </div>
          )}
        </div>
        {(errors.watched || errors.rating) && (
          <small className="error-text">{errors.watched || errors.rating}</small>
        )}
      </form>
    </Modal>
  )
}

import { useState } from 'react'
import Modal from './Modal'
import Stars from './Stars'

const FIELDS = ['title', 'year', 'genre', 'posterUrl', 'notes', 'watched', 'rating']

const EMPTY = { title: '', year: '', genre: '', posterUrl: '', notes: '', watched: false, rating: null }

// "2014" → 2014, "" → null. Anything else (e.g. "abc") is sent as typed so the API has to reject it.
function toYear(value) {
  const text = String(value).trim()
  if (text === '') return null
  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : value
}

/**
 * Create / edit form. There is no validation here on purpose: the API is the
 * one that validates. Whatever 400 it returns is shown in the form.
 */
export default function ItemForm({ item, showRating, onSubmit, onClose }) {
  const editing = Boolean(item)
  const [values, setValues] = useState(() => ({
    ...EMPTY,
    ...(item ?? {}),
    year: item?.year ?? '',
    genre: item?.genre ?? '',
    posterUrl: item?.posterUrl ?? '',
    notes: item?.notes ?? '',
  }))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null) // { status, message, details: [key, message][] }
  const [saving, setSaving] = useState(false)

  const set = (field) => (e) => {
    const value = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e
    setValues((v) => ({ ...v, [field]: value }))
    setErrors((errs) => ({ ...errs, [field]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)

    setErrors({})

    const payload = {
      title: values.title,
      year: toYear(values.year),
      genre: values.genre,
      posterUrl: values.posterUrl,
      notes: values.notes,
      watched: values.watched,
    }
    if (showRating || (item && 'rating' in item)) payload.rating = values.rating ?? null

    setSaving(true)
    try {
      await onSubmit(payload)
      onClose()
    } catch (err) {
      setSaving(false)
      // Field errors (normalized to { field: message }) go under each input...
      const fieldErrors = err.fieldErrors ?? {}
      setErrors(Object.fromEntries(Object.entries(fieldErrors).filter(([k]) => FIELDS.includes(k))))
      // ...and the alert lists exactly what the API sent, with its original keys.
      const raw = err.body?.errors && typeof err.body.errors === 'object' ? err.body.errors : {}
      const details = Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v.join(' ') : String(v)])
      setFormError({ status: err.status, message: err.message, details })
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
          <div className="alert error column" role="alert">
            <span>
              {formError.status > 0 && <strong>{formError.status} · </strong>}
              {formError.message}
            </span>
            {formError.details.length > 0 && (
              <ul>
                {formError.details.map(([key, message]) => (
                  <li key={key}>
                    <code>{key}</code> {message}
                  </li>
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

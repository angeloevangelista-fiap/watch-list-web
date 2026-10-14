import { CircleAlert, CircleCheck } from 'lucide-react'

export default function Toasts({ toasts }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          {t.kind === 'error' ? <CircleAlert size={18} /> : <CircleCheck size={18} />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}

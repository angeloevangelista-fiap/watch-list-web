import { useState } from 'react'
import Modal from './Modal'

export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onClose }) {
  const [busy, setBusy] = useState(false)

  async function confirm() {
    setBusy(true)
    try {
      await onConfirm()
      onClose()
    } catch {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn danger" onClick={confirm} disabled={busy}>
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="muted">{message}</p>
    </Modal>
  )
}

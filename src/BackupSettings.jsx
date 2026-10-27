// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Stahpps
import { useRef, useState } from 'react'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { createBackup, MAX_BACKUP_BYTES, parseBackup } from './backups.js'
import { translations } from './i18n.js'

const files = registerPlugin('RemindBackup')

export default function BackupSettings({ language, events, onImport }) {
  const t = translations[language]
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState(null)
  const [message, setMessage] = useState(null)
  async function exportEvents() {
    setBusy(true)
    setMessage(null)
    try {
      const contents = createBackup(events)
      const filename = `remind-events-${new Date().toISOString().slice(0, 10)}.json`
      if (Capacitor.isNativePlatform()) {
        const result = await files.exportBackup({ contents, filename })
        if (result.cancelled) return
      } else {
        const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }))
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
      setMessage({ text: t.exportSuccess })
    } catch { setMessage({ text: t.exportError, error: true }) }
    finally { setBusy(false) }
  }
  function preview(contents) {
    setPending(parseBackup(contents))
    setMessage(null)
  }
  async function chooseImport() {
    setMessage(null)
    if (!Capacitor.isNativePlatform()) { input.current.click(); return }
    setBusy(true)
    try {
      const result = await files.importBackup()
      if (!result.cancelled) preview(result.contents)
    } catch { setMessage({ text: t.importError, error: true }) }
    finally { setBusy(false) }
  }
  async function chooseWebFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('Too large')
      preview(await file.text())
    } catch { setMessage({ text: t.importError, error: true }) }
    finally { setBusy(false) }
  }
  function confirmImport() {
    try {
      const result = onImport(pending)
      setPending(null)
      setMessage({ text: t.importSuccess(result.added, result.skipped) })
    } catch { setMessage({ text: t.importError, error: true }) }
  }
  return <section className="backup-settings" aria-label={t.backupTitle}>
    <h3 className="settings-section-label">{t.backupTitle}</h3>
    <p className="settings-hint">{t.backupHint}</p>
    <div className="backup-actions">
      <button type="button" disabled={busy || pending !== null} onClick={exportEvents}>{t.exportEvents}</button>
      <button type="button" disabled={busy || pending !== null} onClick={chooseImport}>{t.importEvents}</button>
    </div>
    <input ref={input} hidden type="file" accept=".json,application/json" onChange={chooseWebFile} aria-label={t.importEvents} />
    {pending !== null && <div className="backup-preview">
      <p>{t.importPreview(pending.length)}</p>
      <div className="backup-actions">
        <button type="button" onClick={confirmImport}>{t.confirmImport}</button>
        <button type="button" onClick={() => { setPending(null); setMessage(null) }}>{t.cancel}</button>
      </div>
    </div>}
    {message && <p className={message.error ? 'notification-error' : 'backup-result'} role={message.error ? 'alert' : 'status'}>{message.text}</p>}
  </section>
}

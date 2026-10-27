// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Stahpps
import { REMINDER_OFFSETS } from './reminders.js'

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024
const MAX_EVENTS = 10000
const categories = new Set(['Work', 'Personal', 'Important', 'Health'])

function checkedEvent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid event')
  const id = typeof value.id === 'number' && Number.isSafeInteger(value.id) ? String(value.id) : value.id
  if (typeof id !== 'string' || !id.length || id.length > 128) throw new Error('Invalid event ID')
  if (typeof value.title !== 'string' || !value.title.trim() || value.title.length > 80) throw new Error('Invalid title')
  const description = value.description ?? ''
  if (typeof description !== 'string' || description.length > 240) throw new Error('Invalid description')
  if (typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.date) || value.date.startsWith('0000')) throw new Error('Invalid date')
  const date = new Date(value.date + 'T00:00:00Z')
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value.date) throw new Error('Invalid date')
  if (typeof value.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)) throw new Error('Invalid time')
  if (!categories.has(value.category)) throw new Error('Invalid category')
  const reminders = value.reminders ?? [value.reminderMinutes ?? 15]
  if (!Array.isArray(reminders) || reminders.some(n => !REMINDER_OFFSETS.includes(n))) throw new Error('Invalid reminders')
  return { id, title: value.title.trim(), description, date: value.date, time: value.time,
    category: value.category, reminders: [...new Set(reminders)].sort((a, b) => a - b) }
}

export function parseBackup(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw new Error('Backup too large')
  const data = JSON.parse(text.replace(/^\uFEFF/, ''))
  if (!data || data.format !== 'remind-backup' || data.version !== 1 || !Array.isArray(data.events) || data.events.length > MAX_EVENTS) throw new Error('Invalid backup')
  const events = data.events.map(checkedEvent)
  if (new Set(events.map(e => e.id)).size !== events.length) throw new Error('Duplicate IDs in backup')
  return events
}

export function createBackup(events, now = new Date()) {
  const contents = JSON.stringify({ format: 'remind-backup', version: 1, exportedAt: now.toISOString(), events }, null, 2)
  parseBackup(contents)
  return contents
}

const signature = ({ title, description = '', date, time, category, reminders }) =>
  JSON.stringify([title, description, date, time, category, [...reminders].sort((a, b) => a - b)])

// Existing records win ID conflicts. Keep the imported variant as a separate event;
// importing the same file again recognizes that variant instead of duplicating it.
export function mergeBackup(current, incoming, newId = () => crypto.randomUUID()) {
  const result = current.map(checkedEvent)
  const byId = new Map(result.map(e => [e.id, e]))
  const signatures = new Set(result.map(signature))
  let added = 0
  let skipped = 0
  for (const item of incoming.map(checkedEvent)) {
    const original = byId.get(item.id)
    const key = signature(item)
    if (original && (signature(original) === key || signatures.has(key))) { skipped++; continue }
    let id = item.id
    if (original) {
      id = newId()
      if (typeof id !== 'string' || !id || id.length > 128 || byId.has(id)) throw new Error('Invalid generated ID')
    }
    const event = { ...item, id }
    result.push(event)
    byId.set(id, event)
    signatures.add(key)
    added++
  }
  if (result.length > MAX_EVENTS) throw new Error('Too many events')
  return { events: result, added, skipped }
}

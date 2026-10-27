import { localeFor, translations } from './i18n.js'

export const REMINDER_OFFSETS = [0, 5, 15, 30, 60, 1440]

export function reminderMinutesFor(event) {
  const values = Array.isArray(event.reminders)
    ? event.reminders
    : [event.reminderMinutes ?? 15]
  return [...new Set(values.map(Number).filter((value) => REMINDER_OFFSETS.includes(value)))].sort((a, b) => a - b)
}

export function normalizeEvent(event) {
  const result = { ...event, reminders: reminderMinutesFor(event) }
  delete result.reminderMinutes
  return result
}

export function eventDate(event) {
  return new Date(`${event.date}T${event.time}:00`)
}

// Android notification IDs must be positive signed 32-bit integers. Resolve
// collisions within the scheduled batch so separate alerts never replace each other.
function allocateNotificationId(key, used) {
  let hash = 0
  for (const character of key) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) | 0
  let id = (hash & 0x7fffffff) || 1
  while (used.has(id)) id = id === 0x7fffffff ? 1 : id + 1
  used.add(id)
  return id
}

export function buildNotifications(events, language = 'en', now = Date.now(), options = {}) {
  const text = translations[language] || translations.en
  const used = new Set()
  const notifications = []
  for (const event of [...events].sort((a, b) => String(a.id).localeCompare(String(b.id)))) {
    const timestamp = eventDate(event).getTime()
    const category = text.categories[event.category] || event.category
    for (const minutes of reminderMinutesFor(event)) {
      const at = new Date(timestamp - minutes * 60000)
      if (!Number.isFinite(at.getTime()) || at.getTime() <= now) continue
      notifications.push({
        id: allocateNotificationId(`${event.id}:${minutes}`, used),
        title: event.title,
        channelId: 'default',
        body: event.description ? `${category} · ${event.description}` : category,
        isExactNotification: true,
        schedule: { at, allowWhileIdle: true },
        extra: { eventId: event.id, reminderMinutes: minutes },
      })
    }
  }
  if (options.dailySummary) {
    const days = new Map()
    for (const event of events) {
      if (!Number.isFinite(eventDate(event).getTime())) continue
      if (!days.has(event.date)) days.set(event.date, [])
      days.get(event.date).push(event)
    }
    const summaryTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(options.dailySummaryTime) ? options.dailySummaryTime : '08:00'
    for (const [date, items] of [...days].sort(([a], [b]) => a.localeCompare(b))) {
      const at = new Date(`${date}T${summaryTime}:00`)
      if (at.getTime() <= now) continue
      const ordered = [...items].sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title))
      const lines = ordered.map((event) => {
        const time = new Intl.DateTimeFormat(localeFor(language), {
          hour: '2-digit', minute: '2-digit', hour12: language !== 'ro',
        }).format(eventDate(event))
        return `${time} · ${event.title} · ${text.categories[event.category] || event.category}`
      })
      notifications.push({
        id: allocateNotificationId(`daily-summary:${date}`, used),
        channelId: 'default',
        title: text.summaryNotificationTitle(ordered.length),
        body: lines.join(' • '),
        largeBody: lines.join('\n'),
        summaryText: text.summaryCount(ordered.length),
        isExactNotification: true,
        schedule: { at, allowWhileIdle: true },
        extra: { type: 'dailySummary', date, eventIds: ordered.map(({ id }) => id) },
      })
    }
  }
  return notifications
}

export function duplicateEventDraft(event, today) {
  const draft = normalizeEvent(event)
  delete draft.id
  draft.reminders = [...draft.reminders]
  if (draft.date < today) draft.date = today
  return draft
}
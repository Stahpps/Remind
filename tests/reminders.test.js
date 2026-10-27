import test from 'node:test'
import assert from 'node:assert/strict'
import { translations } from '../src/i18n.js'
import { buildNotifications, eventDate, normalizeEvent, reminderMinutesFor } from '../src/reminders.js'
import { createNotificationService } from '../src/notification-service.js'

const legacy = {
  id: 'event-1', title: 'Review', description: 'Bring documents', category: 'Work',
  date: '2030-08-15', time: '15:00', reminderMinutes: 15,
}
const timestamp = eventDate(legacy).getTime()
const now = timestamp - 2 * 86400000

function fakePlugin(permission = 'granted') {
  const pending = new Map()
  return {
    pending, requests: 0,
    async checkPermissions() { return { display: permission } },
    async requestPermissions() { this.requests++; return { display: permission } },
    async getPending() { return { notifications: [...pending.values()] } },
    async cancel({ notifications }) { for (const { id } of notifications) pending.delete(id) },
    async schedule({ notifications }) { for (const notification of notifications) pending.set(notification.id, notification) },
  }
}

test('upgrading preserves an existing event and its single selected alert', () => {
  const migrated = normalizeEvent(legacy)
  assert.deepEqual(migrated.reminders, [15])
  assert.equal(migrated.id, legacy.id)
  assert.equal(migrated.title, legacy.title)
  assert.equal(migrated.category, 'Work')
  assert.equal('reminderMinutes' in migrated, false)
  assert.deepEqual(normalizeEvent(migrated), migrated)
  assert.deepEqual(reminderMinutesFor({ ...legacy, reminderMinutes: -1 }), [])
})

test('multiple selections create independent alerts at their intended times', () => {
  const result = buildNotifications([{ ...legacy, reminders: [0, 15, 1440] }], 'en', now)
  assert.equal(result.length, 3)
  assert.equal(new Set(result.map(({ id }) => id)).size, 3)
  for (const alert of result) {
    assert.ok(alert.id > 0 && alert.id <= 2147483647)
    assert.equal(alert.title, legacy.title)
    assert.equal(alert.body, 'Work · Bring documents')
    assert.equal(alert.schedule.at.getTime(), timestamp - alert.extra.reminderMinutes * 60000)
  }
})

test('expired alerts are skipped without discarding the remaining future alerts', () => {
  const result = buildNotifications([{ ...legacy, reminders: [0, 5, 15, 1440] }], 'en', timestamp - 10 * 60000)
  assert.deepEqual(result.map(({ extra }) => extra.reminderMinutes), [0, 5])
  assert.deepEqual(buildNotifications([{ ...legacy, reminders: [] }], 'en', now), [])
})

test('duplicate choices and colliding event hashes cannot produce duplicate notifications', () => {
  assert.deepEqual(reminderMinutesFor({ reminders: [15, '15', 5, -1, 999] }), [5, 15])
  const result = buildNotifications([
    { ...legacy, id: 'Aa', reminders: [0] },
    { ...legacy, id: 'BB', reminders: [0] },
  ], 'en', now)
  assert.equal(result.length, 2)
  assert.notEqual(result[0].id, result[1].id)
})

test('Romanian notifications translate the category while preserving user text', () => {
  const [result] = buildNotifications([legacy], 'ro', now)
  assert.equal(result.title, 'Review')
  assert.equal(result.body, 'Muncă · Bring documents')
})

test('startup replaces legacy alerts; editing, disabling and deletion remove obsolete alerts', async () => {
  const plugin = fakePlugin()
  plugin.pending.set(12345, { id: 12345, title: 'Legacy alert' })
  const service = createNotificationService(plugin, () => true, () => now)
  await service.synchronize([{ ...legacy, reminders: [0, 15, 1440] }], true, 'en')
  assert.equal(plugin.pending.has(12345), false)
  assert.equal(plugin.pending.size, 3)
  await service.synchronize([{ ...legacy, reminders: [5] }], true, 'en')
  assert.equal(plugin.pending.size, 1)
  assert.equal([...plugin.pending.values()][0].extra.reminderMinutes, 5)
  await service.synchronize([legacy], false, 'en')
  assert.equal(plugin.pending.size, 0)
  await service.synchronize([legacy], true, 'ro')
  assert.equal([...plugin.pending.values()][0].body, 'Muncă · Bring documents')
  await service.synchronize([], true, 'ro')
  assert.equal(plugin.pending.size, 0)
})

test('denied permission does not repeatedly prompt when saving events', async () => {
  const plugin = fakePlugin('denied')
  const service = createNotificationService(plugin, () => true, () => now)
  await service.synchronize([legacy], true, 'en')
  await service.synchronize([{ ...legacy, reminders: [0, 15] }], true, 'en')
  assert.equal(plugin.requests, 1)
  assert.equal(plugin.pending.size, 0)
  await service.synchronize([legacy], false, 'en')
  await service.synchronize([legacy], true, 'en')
  assert.equal(plugin.requests, 2)
})

test('a fast save followed by deletion cannot leave a stale scheduled alert', async () => {
  const plugin = fakePlugin()
  const service = createNotificationService(plugin, () => true, () => now)
  const save = service.synchronize([legacy], true, 'en')
  const remove = service.synchronize([], true, 'en')
  await Promise.all([save, remove])
  assert.equal(plugin.pending.size, 0)
})

test('switching off while scheduling is in progress still clears the final pending alerts', async () => {
  const plugin = fakePlugin()
  let release
  let started
  const inSchedule = new Promise((resolve) => { started = resolve })
  const gate = new Promise((resolve) => { release = resolve })
  const schedule = plugin.schedule.bind(plugin)
  plugin.schedule = async (payload) => { started(); await gate; await schedule(payload) }
  const service = createNotificationService(plugin, () => true, () => now)
  const save = service.synchronize([legacy], true, 'en')
  await inSchedule
  const disable = service.synchronize([legacy], false, 'en')
  release()
  await Promise.all([save, disable])
  assert.equal(plugin.pending.size, 0)
})

test('Romanian and English cover every UI key and reminder choice', () => {
  function keys(value, prefix = '') {
    return Object.entries(value).flatMap(([key, item]) => typeof item === 'object' ? keys(item, `${prefix}${key}.`) : [`${prefix}${key}`])
  }
  assert.deepEqual(keys(translations.en).sort(), keys(translations.ro).sort())
  assert.ok(Object.values(translations.ro.categories).includes('Sănătate'))
})

test('reopening replaces older non-wakeup alerts with exact idle-capable alarms for every selected time', async () => {
  const plugin = fakePlugin()
  plugin.pending.set(12345, {
    id: 12345, title: legacy.title, schedule: { at: new Date(timestamp), allowWhileIdle: false },
  })
  const service = createNotificationService(plugin, () => true, () => now)
  await service.synchronize([{ ...legacy, reminders: [0, 15, 1440] }], true, 'ro')
  assert.equal(plugin.pending.has(12345), false)
  assert.equal(plugin.pending.size, 3)
  for (const notification of plugin.pending.values()) {
    assert.equal(notification.schedule.allowWhileIdle, true)
    assert.equal(notification.isExactNotification, true)
    assert.ok(notification.schedule.at.getTime() > now)
    assert.equal(notification.body, 'Muncă · Bring documents')
  }
})
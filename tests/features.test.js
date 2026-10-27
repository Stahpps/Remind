import test from 'node:test'
import assert from 'node:assert/strict'
import { buildNotifications, duplicateEventDraft } from '../src/reminders.js'
import { createNotificationService } from '../src/notification-service.js'
import { normalizeSettings } from '../src/settings.js'

const now = new Date('2030-08-14T12:00:00').getTime()
const event = { id: 'original', title: 'Project review', description: 'Bring notes', category: 'Work', date: '2030-08-15', time: '15:00', reminders: [0, 15] }
const summaryOptions = { dailySummary: true, dailySummaryTime: '08:00' }
function summaries(items, options = summaryOptions, at = now, language = 'en') {
  return buildNotifications(items, language, at, options).filter(({ extra }) => extra.type === 'dailySummary')
}
function fakePlugin() {
  const pending = new Map()
  return {
    pending,
    async checkPermissions() { return { display: 'granted' } },
    async getPending() { return { notifications: [...pending.values()] } },
    async cancel({ notifications }) { for (const { id } of notifications) pending.delete(id) },
    async schedule({ notifications }) { for (const notification of notifications) pending.set(notification.id, notification) },
  }
}

test('duplicating opens an independent unsaved draft and preserves the original', () => {
  const original = structuredClone(event)
  const draft = duplicateEventDraft(event, '2030-08-14')
  assert.equal('id' in draft, false)
  assert.equal(draft.title, event.title)
  assert.equal(draft.description, event.description)
  assert.equal(draft.category, event.category)
  assert.deepEqual(draft.reminders, event.reminders)
  draft.reminders.push(60)
  assert.deepEqual(event, original)
  assert.deepEqual(duplicateEventDraft({ ...event, date: '2030-08-10' }, '2030-08-14').date, '2030-08-14')
})

test('daily summaries cover every event in time order, even events with no individual alerts', () => {
  const items = [
    { ...event, id: 'late', time: '15:00', title: 'Afternoon review', reminders: [] },
    { ...event, id: 'early', time: '06:30', title: 'Morning walk', category: 'Health', reminders: [] },
    { ...event, id: 'tomorrow', date: '2030-08-16', reminders: [] },
  ]
  const result = summaries(items)
  assert.equal(result.length, 2)
  assert.equal(result[0].schedule.at.getTime(), new Date('2030-08-15T08:00:00').getTime())
  assert.deepEqual(result[0].extra.eventIds, ['early', 'late'])
  assert.ok(result[0].largeBody.indexOf('Morning walk') < result[0].largeBody.indexOf('Afternoon review'))
  assert.equal(result[0].largeBody.split('\n').length, 2)
  assert.ok(result[0].largeBody.includes('Health'))
  assert.equal(result[0].title, 'Remind · 2 events today')
})

test('summary toggles, empty days and already-passed morning times do not create unwanted summaries', () => {
  assert.deepEqual(summaries([]), [])
  assert.deepEqual(summaries([event], { ...summaryOptions, dailySummary: false }), [])
  assert.deepEqual(summaries([event], summaryOptions, new Date('2030-08-15T08:01:00').getTime()), [])
  const [custom] = summaries([event], { ...summaryOptions, dailySummaryTime: '07:00' })
  assert.equal(custom.schedule.at.getHours(), 7)
  assert.equal(custom.schedule.at.getMinutes(), 0)
})

test('summary content follows Romanian selection without translating event titles', () => {
  const [result] = summaries([event], summaryOptions, now, 'ro')
  assert.equal(result.title, 'Remind · 1 eveniment astăzi')
  assert.equal(result.largeBody, '15:00 · Project review · Muncă')
  assert.equal(result.summaryText, '1 eveniment')
})

test('summaries and individual alerts share the sound channel and screen-off delivery flags', () => {
  const all = buildNotifications([event], 'en', now, summaryOptions)
  assert.equal(all.length, 3)
  assert.equal(new Set(all.map(({ id }) => id)).size, 3)
  for (const notification of all) {
    assert.equal(notification.channelId, 'default')
    assert.equal(notification.isExactNotification, true)
    assert.equal(notification.schedule.allowWhileIdle, true)
  }
})

test('editing summary time, disabling summaries, deletion and the master switch clean up native schedules', async () => {
  const plugin = fakePlugin()
  const service = createNotificationService(plugin, () => true, () => now)
  await service.synchronize([event], true, 'en', summaryOptions)
  assert.equal(plugin.pending.size, 3)
  await service.synchronize([event], true, 'en', { ...summaryOptions, dailySummaryTime: '07:00' })
  assert.equal([...plugin.pending.values()].find(({ extra }) => extra.type === 'dailySummary').schedule.at.getHours(), 7)
  await service.synchronize([event], true, 'en', { ...summaryOptions, dailySummary: false })
  assert.equal(plugin.pending.size, 2)
  assert.ok([...plugin.pending.values()].every(({ extra }) => extra.eventId === event.id))
  await service.synchronize([event], false, 'en', summaryOptions)
  assert.equal(plugin.pending.size, 0)
  await service.synchronize([event], true, 'en', summaryOptions)
  await service.synchronize([], true, 'en', summaryOptions)
  assert.equal(plugin.pending.size, 0)
})

test('upgrading settings keeps the previous preferences and enables the 08:00 summary', () => {
  const settings = normalizeSettings({ theme: 'light', notifications: false, language: 'ro' })
  assert.equal(settings.theme, 'light')
  assert.equal(settings.notifications, false)
  assert.equal(settings.language, 'ro')
  assert.equal(settings.dailySummary, true)
  assert.equal(settings.dailySummaryTime, '08:00')
  assert.equal(normalizeSettings({ dailySummary: false }).dailySummary, false)
  assert.equal(normalizeSettings({ dailySummaryTime: '25:99' }).dailySummaryTime, '08:00')
  assert.equal(normalizeSettings({ dailySummaryTime: '07:30' }).dailySummaryTime, '07:30')
})

test('each date gets its own morning alarm instead of a repeating notification with stale contents', () => {
  const dates = ['2030-03-30', '2030-03-31', '2030-04-01']
  const items = dates.map((date, index) => ({ ...event, id: `dst-${index}`, date, title: `Day ${index}`, reminders: [] }))
  const result = summaries(items, summaryOptions, new Date('2030-03-29T00:00:00').getTime())
  assert.equal(result.length, 3)
  result.forEach((summary, index) => {
    assert.equal(summary.schedule.at.getHours(), 8)
    assert.equal(summary.schedule.at.getDate(), Number(dates[index].slice(-2)))
    assert.ok(summary.largeBody.includes(`Day ${index}`))
    assert.equal(summary.schedule.repeats, undefined)
  })
})
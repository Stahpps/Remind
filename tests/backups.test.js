// SPDX-License-Identifier: GPL-3.0-or-later
import test from 'node:test'
import assert from 'node:assert/strict'
import { createBackup, parseBackup, mergeBackup, MAX_BACKUP_BYTES } from '../src/backups.js'
import { buildNotifications } from '../src/reminders.js'

const event = { id: 'original', title: 'Consultație 💚', description: 'Analize', category: 'Health', date: '2030-08-15', time: '15:00', reminders: [0, 15] }
const backup = events => JSON.stringify({ format: 'remind-backup', version: 1, events })

test('backup round trip preserves Unicode, category, dates and independent notification offsets', () => {
  const result = parseBackup(createBackup([event, { ...event, id: 'silent', reminders: [] }]))
  assert.deepEqual(result, [event, { ...event, id: 'silent', reminders: [] }])
  assert.equal(buildNotifications(result, 'ro', new Date('2030-08-14').getTime()).length, 2)
})

test('old single-reminder records and numeric IDs migrate without losing alerts', () => {
  const { reminders: _reminders, ...old } = event
  void _reminders
  const [result] = parseBackup(backup([{ ...old, id: 123, reminderMinutes: 60 }]))
  assert.equal(result.id, '123')
  assert.deepEqual(result.reminders, [60])
})

test('malformed or oversized files, unknown schemas and invalid events are rejected atomically', () => {
  const variants = [null, [], {}, { ...event, date: '2030-02-30' }, { ...event, time: '24:00' },
    { ...event, category: 'Other' }, { ...event, reminders: [-1] }, { ...event, title: '' },
    { ...event, description: 'x'.repeat(241) }, { ...event, id: '' }]
  for (const invalid of variants) assert.throws(() => parseBackup(backup([event, invalid])))
  for (const value of ['not json', 'null', '[]', JSON.stringify({ format: 'remind-backup', version: 2, events: [] }), ' '.repeat(MAX_BACKUP_BYTES + 1)]) {
    assert.throws(() => parseBackup(value))
  }
  assert.throws(() => parseBackup(backup([event, event])))
})

test('import merges without replacing existing data and is idempotent even when IDs conflict', () => {
  const existing = structuredClone(event)
  const changed = { ...event, title: 'Updated appointment' }
  const original = structuredClone([existing])
  const first = mergeBackup([existing], [changed], () => 'new-id')
  assert.deepEqual([existing], original)
  assert.equal(first.added, 1)
  assert.equal(first.events[0].title, event.title)
  assert.equal(first.events[1].id, 'new-id')
  const second = mergeBackup(first.events, [changed], () => { throw new Error('Should not generate another ID') })
  assert.equal(second.added, 0)
  assert.equal(second.skipped, 1)
  assert.deepEqual(second.events, first.events)
  assert.equal(mergeBackup([event], [event]).skipped, 1)
})

test('import keeps deliberate identical events with distinct IDs and strips unrecognized data', () => {
  const [clean] = parseBackup(backup([{ ...event, unexpected: '<script>bad</script>' }]))
  assert.equal('unexpected' in clean, false)
  assert.equal(mergeBackup([event], [{ ...event, id: 'deliberate-copy' }]).added, 1)
  assert.deepEqual(parseBackup(createBackup([])), [])
})

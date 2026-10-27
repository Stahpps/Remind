// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Stahpps
import { buildNotifications } from './reminders.js'

export function createNotificationService(plugin, isNative = () => true, now = () => Date.now()) {
  let queue = Promise.resolve()
  let revision = 0
  let permissionRequested = false

  return {
    synchronize(events, enabled, language, options = {}) {
      const request = ++revision
      const snapshot = structuredClone(events)
      const snapshotOptions = structuredClone(options)
      const task = queue.catch(() => {}).then(async () => {
        if (!isNative() || request !== revision) return
        let granted = false
        if (enabled) {
          let permission = await plugin.checkPermissions()
          if (permission.display !== 'granted' && !permissionRequested) {
            permissionRequested = true
            permission = await plugin.requestPermissions()
          }
          granted = permission.display === 'granted'
        } else {
          permissionRequested = false
        }
        if (request !== revision) return
        const pending = await plugin.getPending()
        if (request !== revision) return
        // This app owns only event alerts. Clearing the pending batch also removes
        // legacy single-alert IDs and alerts deselected during editing.
        if (pending.notifications.length) {
          await plugin.cancel({ notifications: pending.notifications.map(({ id }) => ({ id })) })
        }
        if (request !== revision) return
        const notifications = granted ? buildNotifications(snapshot, language, now(), snapshotOptions) : []
        if (notifications.length) await plugin.schedule({ notifications })
      })
      queue = task
      return task
    },
  }
}
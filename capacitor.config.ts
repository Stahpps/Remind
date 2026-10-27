// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Stahpps
import type { CapacitorConfig } from '@capacitor/cli'
const config: CapacitorConfig = { appId: 'io.github.stahpps.remind', appName: 'Remind', webDir: 'dist', plugins: { LocalNotifications: { iconColor: '#00FF66' } } }
export default config


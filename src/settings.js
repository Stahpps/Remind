export const DEFAULT_SETTINGS = {
  theme: 'dark', notifications: true, language: 'en',
  dailySummary: true, dailySummaryTime: '08:00',
}

export function normalizeSettings(value = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...value }
  return {
    ...settings,
    theme: settings.theme === 'light' ? 'light' : 'dark',
    language: settings.language === 'ro' ? 'ro' : 'en',
    notifications: typeof settings.notifications === 'boolean' ? settings.notifications : true,
    dailySummary: typeof settings.dailySummary === 'boolean' ? settings.dailySummary : true,
    dailySummaryTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(settings.dailySummaryTime) ? settings.dailySummaryTime : '08:00',
  }
}
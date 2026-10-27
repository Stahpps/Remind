// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Stahpps
import { useEffect, useMemo, useState } from 'react'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { languageOptions, localeFor, translations } from './i18n.js'
import { duplicateEventDraft, eventDate, normalizeEvent, REMINDER_OFFSETS } from './reminders.js'
import { normalizeSettings } from './settings.js'
import { createNotificationService } from './notification-service.js'

const APP_VERSION = '1.4'
const deviceSettings = registerPlugin('RemindSettings')
const EVENT_KEY = 'remind.events.v1'
const SETTINGS_KEY = 'remind.settings.v1'
const notifications = createNotificationService(LocalNotifications, () => Capacitor.isNativePlatform())
const categories = [
  { name: 'Work', emoji: '💼', color: '#579cff', background: 'rgba(68,139,255,.16)', border: 'rgba(68,139,255,.42)' },
  { name: 'Personal', emoji: '👤', color: '#b19aff', background: 'rgba(151,119,255,.15)', border: 'rgba(151,119,255,.4)' },
  { name: 'Important', emoji: '⭐', color: '#ff6969', background: 'rgba(255,82,82,.14)', border: 'rgba(255,82,82,.4)' },
  { name: 'Health', emoji: '💚', color: '#24d6a0', background: 'rgba(0,206,148,.14)', border: 'rgba(0,206,148,.4)' },
]
const paths = {
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /><path d="M12 2v1" /></>,
  menu: <><circle cx="12" cy="12" r="9" /><path d="M7 8h10M7 12h10M7 16h10" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" /></>,
  close: <path d="m18 6-12 12M6 6l12 12" />,
  check: <path d="m5 12 4 4L19 6" />,
  cup: <><path d="M4 8h13v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z" /><path d="M17 10h2a2 2 0 1 1 0 4h-2M4 22h15" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
}

function Icon({ name, size = 22 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function todayKey(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

function readEvents() {
  try {
    const value = JSON.parse(localStorage.getItem(EVENT_KEY) || '[]')
    return Array.isArray(value) ? value.map(normalizeEvent) : []
  } catch { return [] }
}

function readSettings() {
  try { return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')) }
  catch { return normalizeSettings() }
}

function formatTime(value, language) {
  return new Intl.DateTimeFormat(localeFor(language), {
    hour: '2-digit', minute: '2-digit', hour12: language === 'en',
  }).format(new Date(`2000-01-01T${value}:00`))
}

function formatDate(value, language) {
  return new Intl.DateTimeFormat(localeFor(language), {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

function EventModal({ event, draft, language, onClose, onSave }) {
  const t = translations[language]
  const [form, setForm] = useState(() => (event || draft) ? {
    ...normalizeEvent(event || draft), description: (event || draft).description || '',
  } : {
    title: '', description: '', date: todayKey(), time: '09:00',
    category: 'Personal', reminders: [15],
  })
  const update = (key) => (e) => setForm((current) => ({ ...current, [key]: e.target.value }))
  function toggleReminder(minutes) {
    setForm((current) => ({
      ...current,
      reminders: current.reminders.includes(minutes)
        ? current.reminders.filter((value) => value !== minutes)
        : [...current.reminders, minutes].sort((a, b) => a - b),
    }))
  }
  function submit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    onSave(normalizeEvent({
      ...form, id: event?.id || crypto.randomUUID(),
      title: form.title.trim(), description: form.description.trim(),
    }))
  }
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <form className="modal event-modal" role="dialog" aria-modal="true" aria-labelledby="event-modal-title" onSubmit={submit}>
      <div className="modal-title-row">
        <h2 id="event-modal-title">{event ? t.editEvent : draft ? t.duplicateEvent : t.newEvent}</h2>
        <button type="button" className="close-button" onClick={onClose} aria-label={t.close}><Icon name="close" size={27} /></button>
      </div>
      {draft && <p className="duplicate-hint">{t.duplicateHint}</p>}
      <label className="form-label">{t.title}<input autoFocus required maxLength="80" value={form.title} onChange={update('title')} placeholder={t.titlePlaceholder} /></label>
      <label className="form-label">{t.description}<textarea rows="3" maxLength="240" value={form.description} onChange={update('description')} placeholder={t.descriptionPlaceholder} /></label>
      <div className="form-two-col">
        <label className="form-label">{t.date}<input type="date" required min={event ? undefined : todayKey()} value={form.date} onChange={update('date')} /></label>
        <label className="form-label">{t.time}<input type="time" required value={form.time} onChange={update('time')} /></label>
      </div>
      <fieldset className="form-label option-field">
        <legend>{t.category}</legend>
        <div className="category-options">
          {categories.map((category) => <label key={category.name} className={'category-option ' + (form.category === category.name ? 'selected' : '')}>
            <input className="choice-input" type="radio" name="category" value={category.name} checked={form.category === category.name} onChange={update('category')} />
            <span className="category-option-emoji" aria-hidden="true">{category.emoji}</span>
            <span className="category-option-name">{t.categories[category.name]}</span>
          </label>)}
        </div>
      </fieldset>
      <fieldset className="form-label option-field">
        <legend>{t.remindersLabel}</legend>
        <p className="choice-hint" id="reminder-hint">{t.remindersHint}</p>
        <div className="reminder-options" aria-describedby="reminder-hint">
          {REMINDER_OFFSETS.map((minutes) => <label key={minutes} className={'reminder-option ' + (form.reminders.includes(minutes) ? 'selected' : '')}>
            <input className="choice-input" type="checkbox" checked={form.reminders.includes(minutes)} onChange={() => toggleReminder(minutes)} />
            <span className="reminder-check" aria-hidden="true">{form.reminders.includes(minutes) && <Icon name="check" size={14} />}</span>
            <span>{t.reminders[minutes]}</span>
          </label>)}
          <label className={'reminder-option no-reminders ' + (!form.reminders.length ? 'selected' : '')}>
            <input className="choice-input" type="checkbox" checked={!form.reminders.length} onChange={() => setForm((current) => ({ ...current, reminders: [] }))} />
            <span className="reminder-check" aria-hidden="true">{!form.reminders.length && <Icon name="check" size={14} />}</span>
            <span>{t.noNotifications}</span>
          </label>
        </div>
      </fieldset>
      <button className="save-event-button" type="submit">{event ? t.saveChanges : t.saveEvent}</button>
    </form>
  </div>
}

function SettingsModal({ settings, onClose, onToggleTheme, onToggleNotifications, onChangeLanguage, onToggleSummary, onSummaryTimeChange, onOpenSound, soundStatus, soundBusy, soundError }) {
  const t = translations[settings.language]
  const isAndroid = Capacitor.getPlatform() === 'android'
  const soundLabel = !isAndroid ? t.soundAndroidOnly : soundStatus?.error ? t.soundUnavailable
    : !soundStatus ? t.soundLoading : !soundStatus.supported ? t.soundAndroidVersion
    : !soundStatus.enabled ? t.soundOff : soundStatus.silent ? t.soundSilent : soundStatus.title || t.soundDefault
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="modal settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="modal-title-row"><h2 id="settings-title">{t.settings}</h2><button className="close-button" onClick={onClose} aria-label={t.close}><Icon name="close" size={27} /></button></div>
      <p className="settings-section-label">{t.preferences}</p>
      <button className="setting-row" role="switch" aria-checked={settings.theme === 'dark'} onClick={onToggleTheme}><span>{t.darkMode}</span><span aria-hidden="true" className={'switch ' + (settings.theme === 'dark' ? 'on' : '')}><i /></span></button>
      <button className="setting-row" role="switch" aria-checked={settings.notifications} onClick={onToggleNotifications}><span>{t.allNotifications}</span><span aria-hidden="true" className={'switch ' + (settings.notifications ? 'on' : '')}><i /></span></button>
      <div className="summary-settings">
        <button className="summary-switch" role="switch" aria-checked={settings.dailySummary} disabled={!settings.notifications} onClick={onToggleSummary}>
          <span className="setting-copy"><span>{t.dailySummary}</span><small>{t.dailySummaryHint}</small></span>
          <span aria-hidden="true" className={'switch ' + (settings.dailySummary ? 'on' : '')}><i /></span>
        </button>
        <label className="summary-time-row"><span>{t.summaryTime}</span><input type="time" value={settings.dailySummaryTime} disabled={!settings.notifications || !settings.dailySummary} onChange={(e) => onSummaryTimeChange(e.target.value)} /></label>
      </div>
      <button className="setting-row sound-setting" onClick={onOpenSound} disabled={!soundStatus?.supported || soundBusy}>
        <span className="setting-copy"><span>{t.notificationSound}</span><small>{soundLabel}</small></span><Icon name="chevron" size={22} />
      </button>
      {soundStatus?.supported && <p className="settings-hint">{t.soundHint}</p>}
      {soundError && <p className="notification-error" role="alert">{t.soundError}</p>}
      <fieldset className="option-field language-field">
        <legend className="settings-section-label">{t.language}</legend>
        <div className="language-options">
          {languageOptions.map((language) => <label key={language.code} className={'language-option ' + (settings.language === language.code ? 'selected' : '')}>
            <input className="choice-input" type="radio" name="language" value={language.code} checked={settings.language === language.code} onChange={() => onChangeLanguage(language.code)} />
            <span lang={language.code}>{language.label}</span>
            {settings.language === language.code && <Icon name="check" size={19} />}
          </label>)}
        </div>
      </fieldset>
      <p className="settings-section-label about-label">{t.aboutSupport}</p>
      <div className="about-card">
        <strong>Remind v{APP_VERSION}</strong>
        <p className="license-note"><span>GPL-3.0-or-later</span> · <a href="https://github.com/Stahpps/Remind" target="_blank" rel="noreferrer">{t.sourceCode}</a> · <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noreferrer">{t.license}</a></p>
        <a className="support-cta" href="https://ko-fi.com/stahpps" target="_blank" rel="noreferrer" aria-label={t.supportLabel}>
          <span className="kofi-button"><Icon name="cup" size={20} /><span>Ko-fi</span></span>
          <span className="support-copy"><strong>{t.likeRemind}</strong><span>{t.supportCopy}</span></span>
          <span className="support-arrow"><Icon name="chevron" size={21} /></span>
        </a>
      </div>
    </section>
  </div>
}

function ReminderCard({ event, language, onEdit, onDelete, onDuplicate }) {
  const t = translations[language]
  const category = categories.find((item) => item.name === event.category) || categories[1]
  return <article className="event-card">
    <button className="event-main" onClick={() => onEdit(event)} aria-label={`${t.edit} ${event.title}`}>
      <div className="event-topline">
        <h2>{event.title}</h2>
        <span className="category-badge" style={{ '--category': category.color, '--category-bg': category.background, '--category-border': category.border }}>
          <span className="category-badge-emoji" aria-hidden="true">{category.emoji}</span>{t.categories[category.name]}
        </span>
      </div>
      {event.description && <p className="event-description">{event.description}</p>}
      <div className="event-divider" />
      <div className="event-details">
        <span><span className="emoji" aria-hidden="true">🗓️</span>{formatDate(event.date, language)}</span>
        <span><span className="emoji" aria-hidden="true">🕒</span>{formatTime(event.time, language)}</span>
      </div>
    </button>
    <div className="event-actions">
      <button className="duplicate-event" aria-label={`${t.duplicate} ${event.title}`} title={t.duplicate} onClick={() => onDuplicate(event)}><Icon name="copy" size={21} /></button>
      <button className="delete-event" aria-label={`${t.delete} ${event.title}`} title={t.delete} onClick={() => onDelete(event)}><Icon name="close" size={24} /></button>
    </div>
  </article>
}

export default function App() {
  const [events, setEvents] = useState(readEvents)
  const [settings, setSettings] = useState(readSettings)
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  const [activeTab, setActiveTab] = useState('Upcoming')
  const [editor, setEditor] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notificationError, setNotificationError] = useState(false)
  const [soundStatus, setSoundStatus] = useState(null)
  const [soundBusy, setSoundBusy] = useState(false)
  const [soundError, setSoundError] = useState(false)
  const t = translations[settings.language]

  useEffect(() => { localStorage.setItem(EVENT_KEY, JSON.stringify(events)) }, [events])
  useEffect(() => {
    const refresh = () => setCurrentTime(Date.now())
    const timer = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    document.documentElement.dataset.theme = settings.theme
    document.documentElement.lang = settings.language
  }, [settings])
  useEffect(() => {
    let active = true
    notifications.synchronize(events, settings.notifications, settings.language, {
      dailySummary: settings.dailySummary, dailySummaryTime: settings.dailySummaryTime,
    }).then(() => {
      if (active) setNotificationError(false)
    }).catch((error) => {
      console.error('Could not synchronize event notifications', error)
      if (active) setNotificationError(true)
    })
    return () => { active = false }
  }, [events, settings.notifications, settings.language, settings.dailySummary, settings.dailySummaryTime])

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return
    let active = true
    const refresh = () => {
      if (document.visibilityState === 'hidden') return
      deviceSettings.getNotificationSound().then((state) => {
        if (active) { setSoundStatus(state); setSoundError(false) }
      }).catch((error) => {
        console.error('Could not read Remind notification sound', error)
        if (active) setSoundStatus({ supported: false, error: true })
      })
    }
    refresh()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      active = false
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let active = true
    let listener
    LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
      if (notification.extra?.type === 'dailySummary') setActiveTab('Today')
    }).then((handle) => {
      if (active) listener = handle
      else void handle.remove()
    }).catch((error) => console.error('Could not listen for notification taps', error))
    return () => { active = false; if (listener) void listener.remove() }
  }, [])

  const visibleEvents = useMemo(() => {
    const today = todayKey(new Date(currentTime))
    return events.filter((event) => {
      const timestamp = eventDate(event).getTime()
      if (activeTab === 'Today') return event.date === today
      if (activeTab === 'Upcoming') return timestamp > currentTime
      return timestamp <= currentTime
    }).sort((a, b) => activeTab === 'Past' ? eventDate(b) - eventDate(a) : eventDate(a) - eventDate(b))
  }, [events, activeTab, currentTime])

  function saveEvent(event) {
    setEvents((old) => [event, ...old.filter((item) => item.id !== event.id)])
    setEditor(null)
  }
  function duplicateEvent(event) { setEditor({ event: null, draft: duplicateEventDraft(event, todayKey()) }) }
  function deleteEvent(event) { setEvents((old) => old.filter((item) => item.id !== event.id)) }
  function toggleTheme() { setSettings((old) => ({ ...old, theme: old.theme === 'dark' ? 'light' : 'dark' })) }
  function toggleNotifications() { setSettings((old) => ({ ...old, notifications: !old.notifications })) }
  function changeLanguage(language) { setSettings((old) => ({ ...old, language })) }
  function toggleSummary() { setSettings((old) => ({ ...old, dailySummary: !old.dailySummary })) }
  function changeSummaryTime(dailySummaryTime) {
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(dailySummaryTime)) setSettings((old) => ({ ...old, dailySummaryTime }))
  }
  async function openSoundSettings() {
    setSoundBusy(true)
    try {
      setSoundStatus(await deviceSettings.openNotificationSound())
      setSoundError(false)
    } catch (error) {
      console.error('Could not open Remind notification sound settings', error)
      setSoundError(true)
    } finally { setSoundBusy(false) }
  }

  return <main className="remind-screen">
    <header className="screen-header">
      <div className="app-brand"><span className="brand-icon"><Icon name="bell" size={24} /></span><span>Remind</span></div>
      <button className="settings-button" onClick={() => setSettingsOpen(true)} aria-label={t.openSettings}><Icon name="menu" size={35} /></button>
    </header>
    <nav className="time-tabs" aria-label={t.eventTime}>
      {['Upcoming', 'Today', 'Past'].map((tab) => <button key={tab} className={activeTab === tab ? 'selected' : ''} aria-current={activeTab === tab ? 'page' : undefined} onClick={() => setActiveTab(tab)}>{t.tabs[tab]}</button>)}
    </nav>
    {notificationError && <p className="notification-error" role="status">{t.notificationError}</p>}
    <section className="events-list" aria-label={`${t.tabs[activeTab]} · ${t.events}`}>
      {visibleEvents.length ? visibleEvents.map((event) => <ReminderCard key={event.id} event={event} language={settings.language} onEdit={(item) => setEditor({ event: item })} onDelete={deleteEvent} onDuplicate={duplicateEvent} />) :
        <div className="empty-events"><span className="empty-bell"><Icon name="bell" size={25} /></span><h2>{t.empty[activeTab]}</h2><p>{t.emptyHint}</p></div>}
    </section>
    <button className="floating-add" onClick={() => setEditor({ event: null })} aria-label={t.addEvent}><Icon name="plus" size={45} /></button>
    {editor && <EventModal event={editor.event} draft={editor.draft} language={settings.language} onClose={() => setEditor(null)} onSave={saveEvent} />}
    {settingsOpen && <SettingsModal settings={settings} onClose={() => setSettingsOpen(false)} onToggleTheme={toggleTheme} onToggleNotifications={toggleNotifications} onChangeLanguage={changeLanguage} onToggleSummary={toggleSummary} onSummaryTimeChange={changeSummaryTime} onOpenSound={openSoundSettings} soundStatus={soundStatus} soundBusy={soundBusy} soundError={soundError} />}
  </main>
}
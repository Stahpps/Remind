import type { CapacitorConfig } from '@capacitor/cli'
const config: CapacitorConfig = { appId: 'com.remind.app', appName: 'Remind', webDir: 'dist', plugins: { LocalNotifications: { iconColor: '#00FF66' } } }
export default config


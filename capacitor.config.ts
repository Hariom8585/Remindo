import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.remindo.app',
  appName: 'Remindo',
  webDir: 'out',
  server: {
    url: 'https://remindo-alpha.vercel.app',
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#6366f1',
      sound: 'beep.wav'
    }
  }
};

export default config;

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.remindo.app',
  appName: 'Remindo',
  webDir: 'out',
  server: {
    // For local dev on Android device/emulator:
    // url: 'http://10.0.2.2:3000',
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

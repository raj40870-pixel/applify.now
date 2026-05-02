import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.appifynow.appifynow',
  appName: 'My Web App',
  webDir: 'dist',
  server: {
    url: 'https://start-making--kamaljit444501.replit.app',
    cleartext: true,
    allowNavigation: ['*']
  },
  overrideUserAgent: 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 Mobile Safari/537.36'
};

export default config;
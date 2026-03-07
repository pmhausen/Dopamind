import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dopamind.app',
  appName: 'Dopamind',
  webDir: 'build',
  server: {
    // Live-reload: React Dev-Server auf dem Mac
    url: 'http://10.0.2.2:3000',
    cleartext: true,
  },
};

export default config;

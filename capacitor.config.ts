import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fourdsmartops.operixgo',
  appName: 'OperixGo',
  webDir: 'dist',
  bundledWebRuntime: false,

  // Web-view settings
  server: {
    androidScheme: 'https',
    // For live-reload during development on real device,
    // set url to your Mac's LAN IP + :8080. Leave commented in production.
    // url: 'http://192.168.1.100:8080',
    // cleartext: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#1E3A5F',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1E3A5F',
    },
  },

  // Android-specific
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // set true for dev builds
  },

  // iOS-specific
  ios: {
    contentInset: 'always',
    backgroundColor: '#FFFFFF',
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
  },
};

export default config;

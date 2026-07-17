/// <reference types="vite/client" />

interface MeditationAppBridge {
  name: string;
  version: string;
}

interface Window {
  meditationApp?: MeditationAppBridge;
}

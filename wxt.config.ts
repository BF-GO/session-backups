import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  publicDir: 'public',
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Session Saver',
    description: 'Automatic browser session recovery and snapshots.',
    permissions: ['tabs', 'storage', 'alarms', 'notifications', 'tabGroups'],
    icons: {
      16: 'icon16.png',
      32: 'icon32.png',
      48: 'icon48.png',
      96: 'icon96.png',
      128: 'icon128.png',
    },
    action: {
      default_icon: {
        16: 'icon16.png',
        32: 'icon32.png',
        48: 'icon48.png',
        96: 'icon96.png',
        128: 'icon128.png',
      },
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
    },
  },
});

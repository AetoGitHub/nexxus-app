// https://nuxt.com/docs/api/configuration/nuxt-config
function resolveApiBaseUrl(): string {
  if (process.env.NUXT_PUBLIC_API_BASE_URL) {
    return process.env.NUXT_PUBLIC_API_BASE_URL
  }

  const host = (process.env.API_URL ?? 'http://127.0.0.1').replace(/:+$/, '')
  const port = process.env.API_PORT ?? '8000'

  if (/:\d+$/.test(host)) {
    return host
  }

  return `${host}:${port}`
}

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  modules: ['@nuxt/ui', '@nuxtjs/i18n', '@vueuse/nuxt'],
  css: ['~/assets/css/main.css'],

  routeRules: {
    '/home': { redirect: '/' },
  },

  app: {
    head: {
      titleTemplate: 'Nexxus - %s',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },

  vite: {
    optimizeDeps: {
      include: [
        '@fullcalendar/core/locales/es',
        '@fullcalendar/daygrid',
        '@fullcalendar/interaction',
        '@fullcalendar/vue3',
        '@tanstack/vue-query',
      ]
    }
  },


  devServer: {
    port: 9000,
  },

  runtimeConfig: {
    public: {
      apiBaseUrl: resolveApiBaseUrl(),
      wsBaseUrl: process.env.NUXT_PUBLIC_WS_BASE_URL ?? '',
      apiAuthPath: process.env.NUXT_PUBLIC_API_AUTH_PATH ?? '/api/auth/login/',
      apiAuthLogoutPath: process.env.NUXT_PUBLIC_API_AUTH_LOGOUT_PATH ?? '/auth/logout/',
    },
  },

  dir: {
    layouts: 'shared/layouts',
  },

  components: [
    { path: '~/shared/components', pathPrefix: false },
    { path: '~/features', pathPrefix: true, pattern: '**/components/**/*.vue' },
  ],

  imports: {
    dirs: [
      'shared/composables',
      'shared/utils',
      // /** incluye subdominios (workspace/, list/, kanban/, form/, shared/…)
      'features/**/composables/**',
      'features/**/schemas/**',
      'features/**/utils/**',
    ],
    presets: [
      { from: 'zod', imports: ['z'] },
    ],
  },

  i18n: {
    restructureDir: 'app',
    defaultLocale: 'es',
    strategy: 'no_prefix',
    locales: [
      { code: 'es', name: 'Español', file: 'es.json' },
      { code: 'en', name: 'English', file: 'en.json' },
    ],
    langDir: 'shared/i18n/locales',
  },
})

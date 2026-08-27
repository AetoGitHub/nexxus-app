// https://nuxt.com/docs/api/configuration/nuxt-config
function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '')
}

function isLoopbackHost(url: string): boolean {
  try {
    const parsed = new URL(url.includes('://') ? url : `http://${url}`)
    return parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost'
  }
  catch {
    return false
  }
}

function resolveApiBaseUrl(): string {
  const explicit = process.env.NUXT_PUBLIC_API_BASE_URL?.trim()
  if (explicit) {
    return stripTrailingSlashes(explicit)
  }

  const host = stripTrailingSlashes(
    (process.env.API_URL ?? 'http://127.0.0.1').trim().replace(/:+$/, ''),
  )

  if (/:\d+$/.test(host)) {
    return host
  }

  // Puerto solo en local. En prod (Railway, etc.) el host público ya escucha en 443.
  if (isLoopbackHost(host)) {
    const port = process.env.API_PORT ?? '8000'
    return `${host}:${port}`
  }

  return host
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

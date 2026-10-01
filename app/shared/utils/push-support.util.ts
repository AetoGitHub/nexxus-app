/**
 * Detección de plataforma y soporte de Web Push. Todo son funciones puras (reciben el entorno) para
 * calcular el estado una sola vez en `usePushNotifications` y no en cada componente.
 */

export type PushPlatform = 'android' | 'ios' | 'desktop'

/** `chromium` = otro navegador basado en Chromium (Opera, Samsung...) sin ajuste directo conocido. */
export type PushBrowser = 'brave' | 'edge' | 'chrome' | 'firefox' | 'safari' | 'chromium'

/** Qué problema se está explicando: permiso bloqueado, o el servicio de push del navegador no responde. */
export type PushHelpKind = 'denied' | 'push-service'

export type PushStatus =
  /** El backend respondió 404 en vapid_public_key: el servidor no tiene push configurado. */
  | 'unavailable'
  /** El navegador no tiene Push API (p. ej. iOS menor a 16.4). */
  | 'unsupported'
  /** iPhone/iPad en Safari, pero la app no está instalada en la pantalla de inicio. */
  | 'ios-needs-install'
  /** Abierto dentro de WhatsApp/Instagram/Facebook/etc. */
  | 'in-app-browser'
  /** Soportado y todavía no se ha pedido permiso. */
  | 'default'
  /** Permiso dado y este dispositivo registrado. */
  | 'granted-subscribed'
  /** Permiso dado pero falta registrar o volver a registrar. */
  | 'granted-not-subscribed'
  /** El usuario bloqueó las notificaciones. */
  | 'denied'

export interface PushEnvironment {
  userAgent: string
  platform: string
  maxTouchPoints: number
}

const IN_APP_BROWSER_PATTERN = /FBAN|FBAV|Instagram|Line\/|WhatsApp|wv\)/i

/** iPhone, iPod, iPad y iPad con iPadOS 13+ (se identifica como Mac pero tiene pantalla táctil). */
export function isIosDevice(env: PushEnvironment): boolean {
  return /iPad|iPhone|iPod/.test(env.userAgent)
    || (env.platform === 'MacIntel' && env.maxTouchPoints > 1)
}

/** Plataforma que se manda al backend al registrar el dispositivo. */
export function detectPushPlatform(env: PushEnvironment): PushPlatform {
  if (isIosDevice(env)) {
    return 'ios'
  }
  return /Android/i.test(env.userAgent) ? 'android' : 'desktop'
}

export function isInAppBrowser(userAgent: string): boolean {
  return IN_APP_BROWSER_PATTERN.test(userAgent)
}

/** Brave se identifica como Chrome en el user-agent: solo se distingue por `navigator.brave`. */
export function isBraveBrowser(): boolean {
  return typeof navigator !== 'undefined' && 'brave' in navigator
}

/** Navegador, para mostrar las instrucciones correctas cuando el permiso está bloqueado. */
export function detectPushBrowser(userAgent: string, isBrave = false): PushBrowser {
  if (isBrave) {
    return 'brave'
  }
  if (/Firefox|FxiOS/i.test(userAgent)) {
    return 'firefox'
  }
  if (/Edg\//i.test(userAgent)) {
    return 'edge'
  }
  if (/OPR\/|SamsungBrowser|Vivaldi/i.test(userAgent)) {
    return 'chromium'
  }
  if (/Chrome|CriOS/i.test(userAgent)) {
    return 'chrome'
  }
  return /Safari/i.test(userAgent) ? 'safari' : 'chromium'
}

/**
 * Dirección del ajuste a la que hay que llegar. Una web no puede abrirla (los navegadores bloquean los
 * enlaces internos), así que se copia para que el usuario la pegue en la barra de direcciones.
 * `null` si ese navegador no tiene una dirección útil (Safari, móviles, otros Chromium).
 */
export function pushSettingsUrl(kind: PushHelpKind, browser: PushBrowser, origin: string): string | null {
  if (kind === 'push-service') {
    return browser === 'brave' ? 'brave://settings/privacy' : null
  }
  // La página del sitio muestra directamente sus permisos, incluido «Notificaciones».
  const site = `settings/content/siteDetails?site=${encodeURIComponent(origin)}`
  switch (browser) {
    case 'chrome':
      return `chrome://${site}`
    case 'edge':
      return `edge://${site}`
    case 'brave':
      return `brave://${site}`
    case 'firefox':
      return 'about:preferences#privacy'
    default:
      return null
  }
}

/** La app corre instalada (pantalla de inicio / ventana propia), no en una pestaña del navegador. */
export function isInstalledApp(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function readPushEnvironment(): PushEnvironment {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
  }
}

export function hasPushApi(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export interface PushStatusInput {
  /** `null` mientras no se ha consultado vapid_public_key. */
  vapidAvailable: boolean | null
  env: PushEnvironment
  standalone: boolean
  hasPush: boolean
  permission: NotificationPermission
  /** Este navegador tiene una suscripción push activa. */
  hasSubscription: boolean
  /** El usuario apagó las notificaciones en este dispositivo (la suscripción se borró a propósito). */
  deviceOptedOut: boolean
}

/** Estado de push en este dispositivo. `null` mientras todavía no se puede saber. */
export function resolvePushStatus(input: PushStatusInput): PushStatus | null {
  if (input.vapidAvailable == null) {
    return null
  }
  if (!input.vapidAvailable) {
    return 'unavailable'
  }
  if (isInAppBrowser(input.env.userAgent)) {
    return 'in-app-browser'
  }
  // En iOS la Push API solo existe dentro de la app instalada: esto va ANTES de concluir "unsupported".
  if (isIosDevice(input.env) && !input.standalone) {
    return 'ios-needs-install'
  }
  if (!input.hasPush) {
    return 'unsupported'
  }
  if (input.permission === 'denied') {
    return 'denied'
  }
  if (input.permission === 'default' || input.deviceOptedOut) {
    return 'default'
  }
  return input.hasSubscription ? 'granted-subscribed' : 'granted-not-subscribed'
}

/** `applicationServerKey` llega en base64url; PushManager lo necesita como bytes. */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index)
  }
  return bytes
}

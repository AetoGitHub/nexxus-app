/**
 * `true` mientras esta sesión se cierra desde la propia app (logout en curso). El backend cierra los sockets con 4403
 * al cerrar sesión; los sockets propios lo miran para no tomar ese cierre por una revocación de acceso: ni avisar,
 * ni sondear la sesión, ni mandar a «sesión expirada».
 */
export function useSessionClosing() {
  return useState<boolean>('session-closing', () => false)
}

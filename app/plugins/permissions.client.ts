/**
 * Al abrir la app con sesión se vuelven a pedir los permisos (pudieron cambiar desde la última vez). Mientras tanto se
 * usan los guardados en la sesión, así no parpadean botones ni menús.
 */
export default defineNuxtPlugin(() => {
  const { refreshPermissions } = usePermissions()
  void refreshPermissions()
})

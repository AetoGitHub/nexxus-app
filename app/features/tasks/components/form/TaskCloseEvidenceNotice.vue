<script setup lang="ts">
/**
 * Aviso de los modales que cierran una tarea con evidencia obligatoria: el archivo se sube en el chat de la tarea,
 * no aquí. Mientras falte, el botón de confirmar queda deshabilitado.
 */
const { t } = useI18n()
</script>

<template>
  <UAlert
    color="warning"
    variant="subtle"
    icon="i-lucide-paperclip"
    :title="t('tasks.processClose.evidenceMissingTitle')"
    :description="t('tasks.processClose.evidenceMissingDescription')"
  />
</template>

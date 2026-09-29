<script setup lang="ts">
/** Estado vacío de Configuración master mientras no hay una organización elegida. */
defineProps<{
  message: string
}>()
</script>

<template>
  <div class="flex flex-1 flex-col items-center justify-center py-12 text-center">
    <UIcon
      name="i-lucide-building-2"
      class="mb-2 text-4xl text-dimmed"
    />
    <h3 class="text-lg font-semibold text-highlighted">
      {{ message }}
    </h3>
  </div>
</template>

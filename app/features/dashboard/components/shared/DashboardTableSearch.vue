<script setup lang="ts">
/**
 * Buscador de una tabla del Dashboard (la búsqueda la hace el backend con `search`). Solo reduce las filas de su tabla:
 * no cambia las tarjetas ni la distribución de carga. Lo escrito se manda ~300 ms después de dejar de teclear.
 */
const search = defineModel<string>({ required: true })

defineProps<{
  placeholder: string
}>()

const { t } = useI18n()
</script>

<template>
  <UInput
    v-model="search"
    size="xs"
    icon="i-lucide-search"
    class="w-44 sm:w-56"
    :placeholder="placeholder"
    :aria-label="placeholder"
    maxlength="100"
    @keydown.esc="search = ''"
  >
    <template
      v-if="search"
      #trailing
    >
      <UButton
        type="button"
        color="neutral"
        variant="link"
        size="xs"
        icon="i-lucide-x"
        :aria-label="t('dashboard.table.clearSearch')"
        :title="t('dashboard.table.clearSearch')"
        @click="search = ''"
      />
    </template>
  </UInput>
</template>

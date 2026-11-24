<script setup lang="ts">
import TaskWeekCalendar from '~/features/tasks/components/shared/TaskWeekCalendar.vue'

/**
 * Selector de fecha (YYYY-MM-DD) de los formularios y modales de tareas: botón con la fecha y, al abrirlo, el mismo
 * calendario del atajo de la tarjeta (`TaskWeekCalendar`: semana en curso pintada, abre en el mes de hoy si la fecha
 * ya pasó). Un clic en un día lo elige y cierra.
 */
const model = defineModel<string>({ default: '' })

defineProps<{
  min?: string
  max?: string
  disabled?: boolean
}>()

const { t, locale } = useI18n()
const popoverOpen = ref(false)

function onPick(day: string | null) {
  // Volver a tocar el día ya elegido llega como null: se conserva y solo se cierra.
  if (day) {
    model.value = day
  }
  popoverOpen.value = false
}

const formattedDate = computed(() => {
  if (!model.value) {
    return t('tasks.form.datePlaceholder')
  }

  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${model.value}T00:00:00Z`))
})
</script>

<template>
  <UPopover v-model:open="popoverOpen">
    <UButton
      type="button"
      color="neutral"
      variant="subtle"
      icon="i-lucide-calendar"
      :disabled="disabled"
      class="w-full justify-start"
    >
      {{ formattedDate }}
    </UButton>

    <template #content>
      <TaskWeekCalendar
        :model-value="model || null"
        :min="min"
        :max="max"
        class="p-2"
        @pick="onPick"
      />
    </template>
  </UPopover>
</template>

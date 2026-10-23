<script setup lang="ts">
import { useArchiveRepeatTaskProcess } from '~/features/tasks/composables/form/useArchiveRepeatTaskProcess'
import { businessDayKey } from '~/shared/utils/date'

/** Eliminar una tarea repetitiva: se archiva, solo esta o también las futuras de su serie. */
const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  taskId: number
  /** Fecha de inicio de esta tarea: las futuras son las de la serie desde esa fecha. */
  startDate?: string | null
}>()

const emit = defineEmits<{
  success: []
}>()

const { t, locale } = useI18n()
const { mutateAsync: archiveRepeat, isPending } = useArchiveRepeatTaskProcess()

const includeFuture = ref(false)
const comment = ref('')

/** Día de inicio como fecha larga («23 de octubre de 2026»); se toma el día calendario de negocio, no el instante en UTC. */
const startLabel = computed(() => {
  const day = businessDayKey(props.startDate)
  const [year, month, date] = day ? day.split('-').map(Number) : []
  if (!year || !month || !date) {
    return ''
  }
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }).format(new Date(year, month - 1, date))
})

watch(open, (isOpen) => {
  if (!isOpen) {
    includeFuture.value = false
    comment.value = ''
  }
})

async function onConfirm() {
  try {
    await archiveRepeat({
      task: props.taskId,
      future: includeFuture.value,
      comment: comment.value.trim() || undefined,
    })
    open.value = false
    emit('success')
  }
  catch {
    // El toast de error ya se muestra en la mutación.
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('tasks.repeatArchive.modalTitle')"
    :description="t('tasks.repeatArchive.modalDescription')"
    :ui="{
      content: 'sm:max-w-lg',
      footer: 'justify-end',
    }"
  >
    <template #body>
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-4 rounded-lg border border-border px-3.5 py-3">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-foreground">
              {{ startLabel
                ? t('tasks.repeatArchive.futureLabel', { date: startLabel })
                : t('tasks.repeatArchive.futureLabelNoDate') }}
            </p>
            <p class="text-[12px] text-muted-foreground mt-0.5">
              {{ t('tasks.repeatArchive.futureHelp') }}
            </p>
          </div>
          <USwitch
            v-model="includeFuture"
            :disabled="isPending"
            :aria-label="t('tasks.repeatArchive.futureAria')"
            class="shrink-0 pt-0.5"
          />
        </div>

        <UFormField
          :label="`${t('tasks.repeatArchive.comment')} (${t('tasks.repeatArchive.optional')})`"
          name="comment"
        >
          <UTextarea
            v-model="comment"
            :placeholder="t('tasks.repeatArchive.commentPlaceholder')"
            :rows="3"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>

    <template #footer="{ close }">
      <UButton
        :label="t('tasks.form.cancel')"
        color="neutral"
        variant="outline"
        :disabled="isPending"
        @click="close()"
      />
      <UButton
        :label="t('tasks.repeatArchive.confirm')"
        color="error"
        :loading="isPending"
        :disabled="isPending"
        @click="onConfirm"
      />
    </template>
  </UModal>
</template>

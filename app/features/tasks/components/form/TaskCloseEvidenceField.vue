<script setup lang="ts">
import { fileTypeIcon } from '~/features/tasks/utils/form/task-message.util'

/**
 * Campo de evidencia de los modales que cierran una tarea: elegir archivos (se suben al confirmar). Es obligatorio
 * cuando la tarea exige evidencia y todavía no tiene ninguna (ni en el chat ni en un paso previo).
 */
defineProps<{
  files: File[]
  /** La tarea exige evidencia y falta adjuntarla. */
  required: boolean
  /** La tarea exige evidencia pero ya la tiene (chat o paso previo). */
  satisfied?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  add: [files: File[]]
  remove: [index: number]
}>()

const { t } = useI18n()
const inputEl = useTemplateRef<HTMLInputElement>('inputEl')

function onSelected(event: Event) {
  const input = event.target as HTMLInputElement
  emit('add', input.files ? Array.from(input.files) : [])
  input.value = ''
}
</script>

<template>
  <UFormField
    :label="`${t('tasks.processClose.evidence')} (${required ? t('tasks.processClose.evidenceRequired') : t('tasks.processClose.optional')})`"
    :hint="required ? undefined : (satisfied ? t('tasks.processClose.evidenceAlready') : undefined)"
    :help="required ? t('tasks.processClose.evidenceHelp') : undefined"
    :error="required && !files.length ? t('tasks.processClose.evidenceMissing') : undefined"
    name="evidence"
  >
    <div class="space-y-2">
      <input
        ref="inputEl"
        type="file"
        multiple
        class="hidden"
        @change="onSelected"
      >
      <UButton
        icon="i-lucide-paperclip"
        color="neutral"
        variant="outline"
        size="sm"
        :label="t('tasks.processClose.addEvidence')"
        :disabled="disabled"
        @click="inputEl?.click()"
      />
      <ul
        v-if="files.length"
        class="flex flex-wrap gap-1.5"
      >
        <li
          v-for="(file, index) in files"
          :key="`${file.name}-${index}`"
          class="flex max-w-56 min-w-0 items-center gap-1.5 rounded-lg border border-border bg-muted/40 py-1 pl-2 pr-1 text-xs text-foreground"
        >
          <UIcon
            :name="fileTypeIcon(file.name)"
            class="h-3.5 w-3.5 shrink-0 text-muted-foreground"
          />
          <span
            class="min-w-0 truncate"
            :title="file.name"
          >{{ file.name }}</span>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            :disabled="disabled"
            :aria-label="t('tasks.messenger.attachments.remove')"
            @click="emit('remove', index)"
          />
        </li>
      </ul>
    </div>
  </UFormField>
</template>

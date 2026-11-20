<script setup lang="ts">
import { usePrivateProjects } from '~/features/projects/composables/usePrivateProjects'
import { THEME_COLORS } from '~/features/projects/types/project.types'

/** Alta de un proyecto privado: nombre y color (`POST /api/enterprise/projects/private/create/`). */
const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  /** Proyecto creado: el padre puede abrirlo o marcarlo como activo. */
  created: [projectId: number]
}>()

const { t } = useI18n()
const { createProject } = usePrivateProjects({ enabled: false })

const name = ref('')
const color = ref<string>(THEME_COLORS[1]!.name)
/** Admite tareas en backlog (inicia en true, como el default del backend). */
const backlog = ref(true)

const canSubmit = computed(() => name.value.trim().length > 0 && !createProject.isPending.value)

watch(open, (isOpen) => {
  if (isOpen) {
    name.value = ''
    color.value = THEME_COLORS[1]!.name
    backlog.value = true
  }
})

async function onSubmit() {
  if (!canSubmit.value) {
    return
  }
  try {
    const project = await createProject.mutateAsync({
      name: name.value.trim(),
      color: color.value,
      backlog: backlog.value,
    })
    open.value = false
    emit('created', project.id)
  }
  catch {
    // El toast de error ya se muestra en la mutación.
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('privateProjects.create.title')"
    :description="t('privateProjects.create.description')"
    :ui="{ content: 'sm:max-w-md', footer: 'justify-end' }"
  >
    <template #body>
      <form
        class="space-y-4"
        @submit.prevent="onSubmit"
      >
        <UFormField :label="t('privateProjects.create.name')">
          <UInput
            v-model="name"
            class="w-full"
            maxlength="255"
            autofocus
            :placeholder="t('privateProjects.create.namePlaceholder')"
          />
        </UFormField>

        <UFormField :label="t('privateProjects.create.color')">
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="option in THEME_COLORS"
              :key="option.name"
              type="button"
              class="h-7 w-7 rounded-full ring-offset-2 ring-offset-default transition"
              :class="color === option.name ? 'ring-2 ring-foreground/50' : 'hover:scale-105'"
              :style="{ background: option.hex }"
              :aria-label="option.name"
              :aria-pressed="color === option.name"
              @click="color = option.name"
            />
          </div>
        </UFormField>

        <!-- Admite tareas en backlog (apagado: no se pueden crear ni regresar tareas a su backlog). -->
        <div class="rounded-lg border border-border px-3 py-2.5">
          <USwitch
            v-model="backlog"
            :label="t('taskSettings.projectModal.backlog')"
            :description="t('taskSettings.projectModal.backlogHelp')"
          />
        </div>
      </form>
    </template>

    <template #footer="{ close }">
      <UButton
        :label="t('tasks.form.cancel')"
        color="neutral"
        variant="outline"
        :disabled="createProject.isPending.value"
        @click="close()"
      />
      <UButton
        :label="t('privateProjects.create.submit')"
        icon="i-lucide-lock"
        :loading="createProject.isPending.value"
        :disabled="!canSubmit"
        @click="onSubmit"
      />
    </template>
  </UModal>
</template>

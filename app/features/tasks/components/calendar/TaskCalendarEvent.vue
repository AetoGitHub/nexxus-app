<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string
    projectName?: string
    status: string
    type: string
    /** En barras multi-día, los chips van solo en el tramo inicial. */
    showBadges?: boolean
  }>(),
  {
    projectName: '',
    showBadges: true,
  },
)

const { t } = useI18n()
const typeMeta = computed(() => taskTypeMeta(props.type))
const statusMeta = computed(() => taskStatusMeta(props.status))
const resolvedProjectName = computed(() => props.projectName.trim())
</script>

<template>
  <div class="fc-event-body">
    <span class="fc-event-title-text">
      {{ title }}
    </span>

    <div
      v-if="showBadges"
      class="fc-event-badges"
    >
      <UBadge
        v-if="resolvedProjectName"
        icon="i-lucide-folder-kanban"
        :label="resolvedProjectName"
        color="primary"
        variant="soft"
        size="xs"
        :aria-label="t('tasks.projectName', { name: resolvedProjectName })"
      />
      <UBadge
        :label="t(statusMeta.labelKey)"
        :color="statusMeta.color"
        variant="soft"
        size="xs"
      />
      <UBadge
        :icon="typeMeta.icon"
        :label="t(typeMeta.labelKey)"
        :color="typeMeta.color"
        variant="soft"
        size="xs"
      />
    </div>
  </div>
</template>

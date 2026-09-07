<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string
    projectName?: string
    status: string
    type: string
    /** Color legible (negro/blanco) según el fondo elegido por el usuario. */
    textColor?: string
    /** En barras multi-día, los chips van solo en el tramo inicial. */
    showBadges?: boolean
  }>(),
  {
    projectName: '',
    textColor: 'currentColor',
    showBadges: true,
  },
)

const { t } = useI18n()
const typeMeta = computed(() => taskTypeMeta(props.type))
const statusMeta = computed(() => taskStatusMeta(props.status))
const resolvedProjectName = computed(() => props.projectName.trim())

/**
 * Veladura oscura fija detrás de los badges: sin importar el color de fondo
 * del evento (lo elige el usuario), un fondo negro semitransparente siempre
 * queda mejor visualmente que uno claro y no compite con el color propio de
 * cada badge (icono/texto), que se conserva porque es lo que distingue
 * proyecto, estatus y tipo.
 */
const BADGE_SCRIM_STYLE = {
  backgroundColor: 'color-mix(in oklab, black 18%, transparent)',
}
</script>

<template>
  <div
    class="fc-event-body"
    :style="{ color: textColor }"
  >
    <span class="fc-event-title-text">
      {{ title }}
    </span>

    <div
      v-if="showBadges"
      class="dark fc-event-badges"
    >
      <UBadge
        v-if="resolvedProjectName"
        icon="i-lucide-folder-kanban"
        :label="resolvedProjectName"
        color="primary"
        variant="soft"
        size="xs"
        :style="BADGE_SCRIM_STYLE"
        :aria-label="t('tasks.projectName', { name: resolvedProjectName })"
      />
      <UBadge
        :label="t(statusMeta.labelKey)"
        :color="statusMeta.color"
        variant="soft"
        size="xs"
        :style="BADGE_SCRIM_STYLE"
      />
      <UBadge
        :icon="typeMeta.icon"
        :label="t(typeMeta.labelKey)"
        :color="typeMeta.color"
        variant="soft"
        size="xs"
        :style="BADGE_SCRIM_STYLE"
      />
    </div>
  </div>
</template>

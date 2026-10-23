<script setup lang="ts">
import DashboardTaskDetailCard from '~/features/dashboard/components/shared/DashboardTaskDetailCard.vue'
import { useDashboardTaskDetail } from '~/features/dashboard/composables/useDashboardTaskDetail'
import type { ApiDashboardTask } from '~/features/dashboard/types/dashboard-api.types'

/**
 * Contador de una celda (`5/6`) que al darle clic abre el detalle de las tareas que lo forman. Lo usan los contadores de
 * TCT (tareas que vencen en el periodo) y de TC (tareas que pasaron a En progreso) de Rendimiento individual. Al elegir una
 * tarea de la lista se abre su detalle (slideover) y la lista **se queda abierta**: en pantallas anchas se fija a la
 * izquierda del detalle, al mismo nivel visual, para seguir con el scroll y abrir la siguiente tarea sin cerrarlo
 * (el detalle no es modal, ver `outsideInteractiveSelector`); en pantallas angostas queda debajo del detalle.
 */
const props = defineProps<{
  /** Texto del contador, p. ej. `5/6`. */
  counter: string
  /** Tareas del detalle (`tct_task` / `tc_task`). */
  tasks: ApiDashboardTask[]
  /** Encabezado del detalle. */
  title: string
  /** Qué tareas son, bajo el encabezado. */
  description: string
  /** Tooltip nativo del contador. */
  hint?: string
  /** Contador sin tareas: se ve más tenue. */
  muted?: boolean
  /**
   * Divide la lista en dos: arriba las tareas sin completar (pendientes, en progreso, en revisión…) y debajo las
   * completadas, cada grupo con su separador. Es la lectura del TCT: lo que falta y lo que ya cuenta.
   */
  groupByStatus?: boolean
}>()

const { t } = useI18n()
const { open: detailOpen, openTask } = useDashboardTaskDetail()

const open = ref(false)

interface TaskSection {
  key: 'open' | 'done' | 'all'
  /** Etiqueta del separador; sin ella (lista sin dividir) no hay separador. */
  label?: string
  color?: 'neutral' | 'success'
  tasks: ApiDashboardTask[]
}

/** Las secciones vacías no se pintan; dentro de cada una se conserva el orden en que llegan las tareas. */
const sections = computed<TaskSection[]>(() => {
  if (!props.groupByStatus) {
    return [{ key: 'all', tasks: props.tasks }]
  }

  const done = props.tasks.filter(task => task.status === 'complete')
  const pending = props.tasks.filter(task => task.status !== 'complete')
  return [
    { key: 'open' as const, label: t('dashboard.individual.taskList.sectionOpen', { count: pending.length }), color: 'neutral' as const, tasks: pending },
    { key: 'done' as const, label: t('dashboard.individual.taskList.sectionDone', { count: done.length }), color: 'success' as const, tasks: done },
  ].filter(section => section.tasks.length > 0)
})

/** El detalle de la tarea es un modal encima: lo que cuente como «clic afuera» para la lista no debe cerrarla mientras esté. */
function onUpdateOpen(value: boolean) {
  if (!value && detailOpen.value) {
    return
  }
  open.value = value
}
</script>

<template>
  <UPopover
    :open="open"
    :portal="false"
    :content="{ side: 'bottom', align: 'start', sideOffset: 6 }"
    :ui="{ content: ['z-40 w-[min(24rem,calc(100vw-1.5rem))] p-0 overflow-hidden', detailOpen && 'dashboard-task-list--docked'] }"
    @update:open="onUpdateOpen"
  >
    <button
      type="button"
      class="cursor-pointer rounded-sm font-mono text-[11px] tabular-nums underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aeto-teal"
      :class="muted ? 'text-muted-foreground/60' : 'text-muted-foreground'"
      :title="hint"
      :aria-label="`${t('dashboard.individual.taskList.open')}: ${counter}`"
    >
      {{ counter }}
    </button>

    <template #content>
      <div
        class="dashboard-task-list flex h-full flex-col"
        data-dashboard-task-list
      >
        <header class="border-b border-border px-3 py-2.5">
          <p class="text-sm font-semibold text-foreground">
            {{ title }}
            <span class="font-mono text-xs font-normal text-muted-foreground">· {{ tasks.length }}</span>
          </p>
          <p class="text-xs text-muted-foreground">
            {{ description }}
          </p>
        </header>

        <div
          v-if="tasks.length"
          class="dashboard-task-list__items max-h-96 min-h-0 flex-1 space-y-4 overflow-y-auto p-3"
        >
          <section
            v-for="section in sections"
            :key="section.key"
            class="space-y-2"
          >
            <USeparator
              v-if="section.label"
              :label="section.label"
              :color="section.color"
              :ui="{ label: 'text-[11px] font-semibold uppercase tracking-wide' }"
            />
            <ul class="space-y-2">
              <li
                v-for="task in section.tasks"
                :key="task.id"
              >
                <DashboardTaskDetailCard
                  :task="task"
                  @select="openTask"
                />
              </li>
            </ul>
          </section>
        </div>
        <p
          v-else
          class="px-3 py-6 text-center text-sm text-muted-foreground"
        >
          {{ t('dashboard.individual.taskList.empty') }}
        </p>
      </div>
    </template>
  </UPopover>
</template>

<style>
/*
 * Con el detalle abierto la lista se fija a la izquierda del slideover (ancho 60rem, ver `TaskNewTaskSlideover`),
 * a toda la altura y pegada a su borde. Se pisa el `transform` que Floating UI pone en el contenedor del popover.
 * Por debajo de 76rem no hay espacio a su izquierda: la lista se queda como popover, detrás del detalle.
 */
@media (min-width: 76rem) {
  [data-reka-popper-content-wrapper]:has(> .dashboard-task-list--docked) {
    transform: none !important;
    top: 0 !important;
    bottom: 0 !important;
    left: auto !important;
    right: 60rem !important;
  }

  .dashboard-task-list--docked {
    height: 100%;
    width: min(24rem, calc(100vw - 60rem));
    border-radius: 0;
    border-width: 0 1px 0 0;
  }

  .dashboard-task-list--docked .dashboard-task-list__items {
    max-height: none;
  }
}
</style>

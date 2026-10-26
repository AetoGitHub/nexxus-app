<script setup lang="ts">
import type { DocumentKind } from '~/features/tasks/utils/form/task-message.util'

/**
 * Imagen predeterminada de un documento (PDF, Word, Excel, PowerPoint) cuando no hay miniatura: no se generó (archivo
 * dañado, con contraseña, formato antiguo, subido antes de las miniaturas) o la imagen no cargó. Es un SVG en línea,
 * sin archivos aparte, con el color de cada tipo.
 */
const props = defineProps<{ kind: DocumentKind }>()

const META: Record<DocumentKind, { color: string, label: string }> = {
  pdf: { color: '#dc2626', label: 'PDF' },
  word: { color: '#2563eb', label: 'DOC' },
  excel: { color: '#16a34a', label: 'XLS' },
  powerpoint: { color: '#ea580c', label: 'PPT' },
}

const meta = computed(() => META[props.kind])
</script>

<template>
  <svg
    viewBox="0 0 120 120"
    class="h-full max-h-32 w-auto"
    role="img"
    aria-hidden="true"
    focusable="false"
  >
    <!-- Hoja con esquina doblada -->
    <path
      d="M30 8h42l22 22v78a4 4 0 0 1-4 4H30a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z"
      fill="#ffffff"
      stroke="#cbd5e1"
      stroke-width="2"
    />
    <path
      d="M72 8v18a4 4 0 0 0 4 4h18z"
      fill="#e2e8f0"
    />

    <!-- Contenido de ejemplo según el tipo -->
    <g
      v-if="kind === 'excel'"
      :stroke="meta.color"
      stroke-opacity="0.45"
      stroke-width="1.5"
      fill="none"
    >
      <rect x="36" y="36" width="48" height="24" />
      <path d="M52 36v24M68 36v24M36 44h48M36 52h48" />
    </g>
    <g
      v-else-if="kind === 'powerpoint'"
      :fill="meta.color"
      fill-opacity="0.55"
    >
      <rect x="40" y="52" width="9" height="10" rx="1" />
      <rect x="54" y="44" width="9" height="18" rx="1" />
      <rect x="68" y="36" width="9" height="26" rx="1" />
    </g>
    <g
      v-else
      fill="#cbd5e1"
    >
      <rect x="36" y="38" width="38" height="4" rx="2" />
      <rect x="36" y="47" width="48" height="4" rx="2" />
      <rect x="36" y="56" width="42" height="4" rx="2" />
    </g>

    <!-- Etiqueta del tipo -->
    <rect
      x="22"
      y="72"
      width="64"
      height="24"
      rx="5"
      :fill="meta.color"
    />
    <text
      x="54"
      y="89"
      text-anchor="middle"
      font-family="ui-sans-serif, system-ui, sans-serif"
      font-size="15"
      font-weight="700"
      fill="#ffffff"
    >
      {{ meta.label }}
    </text>
  </svg>
</template>

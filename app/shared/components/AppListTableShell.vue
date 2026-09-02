<script setup lang="ts">
import {
  LIST_TABLE_CARD_CLASS,
  LIST_TABLE_INNER_CLASS,
} from '~/shared/constants/list-table'

defineOptions({ inheritAttrs: false })

defineProps<{
  title?: string
  cardClass?: string
  innerClass?: string
}>()
</script>

<template>
  <div :class="[cardClass ?? LIST_TABLE_CARD_CLASS, $attrs.class]">
    <div
      v-if="title || $slots.header"
      class="flex flex-wrap items-center gap-3 border-b border-slate-200/40 px-4 py-3.5 dark:border-white/10"
    >
      <slot name="header">
        <h3
          v-if="title"
          class="text-sm font-semibold"
        >
          {{ title }}
        </h3>
      </slot>
    </div>

    <div :class="innerClass ?? LIST_TABLE_INNER_CLASS">
      <slot />
    </div>
  </div>
</template>

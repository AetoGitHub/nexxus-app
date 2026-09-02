<script setup lang="ts">
defineOptions({ inheritAttrs: false })

defineProps<{
  label: string
  ariaLabel: string
}>()
</script>

<template>
  <UButton
    v-bind="$attrs"
    icon="i-lucide-plus"
    variant="subtle"
    color="primary"
    class="shrink-0"
    :aria-label="ariaLabel"
  >
    <span class="hidden sm:inline">{{ label }}</span>
  </UButton>
</template>

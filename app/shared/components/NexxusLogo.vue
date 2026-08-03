<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const colorMode = useColorMode()

const isDark = computed(() => colorMode.value === 'dark')

interface Props {
  /** When true, shows only the isotipo (mark) instead of the full wordmark. */
  collapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
})

/** Transparent PNG variants for UI (no baked background). */
const LOGO = {
  full: {
    dark: '/logos/Nexxus_Tasks_DarkMode.png',
    light: '/logos/Nexxus_Logo_LightMode.png',
  },
  mark: {
    dark: '/logos/Nexxus_Isotipo_DarkMode.png',
    light: '/logos/Nexxus_Isotipo_FondoClaro.png',
  },
} as const

const src = computed(() => {
  const variant = props.collapsed ? LOGO.mark : LOGO.full
  return isDark.value ? variant.dark : variant.light
})
</script>

<template>
  <ClientOnly>
    <template #fallback>
      <USkeleton
        :class="[
          'rounded-lg h-6',
          { 'w-[140px]': !collapsed, 'w-8': collapsed },
        ]"
      />
    </template>

    <div
      v-bind="attrs"
      class="inline-flex items-center justify-center"
    >
      <img
        :src="src"
        alt="Nexxus"
        class="max-h-full max-w-full object-contain"
      >
    </div>
  </ClientOnly>
</template>

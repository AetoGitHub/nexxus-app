<script setup lang="ts">
defineProps<{
  to: string
  icon: string
  title: string
  description: string
}>()
</script>

<template>
  <NuxtLink
    :to="to"
    class="group rounded-xl border border-border bg-card p-6 flex flex-col gap-4 transition-all hover:border-aeto-teal hover:shadow-lg"
  >
    <div class="flex items-center justify-between">
      <div class="h-12 w-12 rounded-lg flex items-center justify-center bg-aeto-teal-light">
        <UIcon :name="icon" class="h-6 w-6 text-aeto-teal-dark" />
      </div>
      <UIcon
        name="i-lucide-arrow-right"
        class="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-aeto-teal"
      />
    </div>
    <div>
      <h2 class="text-base font-bold text-foreground">
        {{ title }}
      </h2>
      <p class="text-sm text-muted-foreground mt-1">
        {{ description }}
      </p>
    </div>
  </NuxtLink>
</template>

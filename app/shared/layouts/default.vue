<script setup lang="ts">
import { useTaskChannelSocket } from '~/features/tasks/composables/workspace/useTaskChannelSocket'

// Túnel único para toda la app autenticada: sincroniza el tablero y alimenta
// el indicador de conexión del sidebar.
useTaskChannelSocket()
</script>

<template>
  <div class="h-screen flex overflow-hidden bg-background text-foreground">
    <AppSidebar />

    <div class="flex-1 flex flex-col min-w-0 min-h-0">
      <AppToolbar />
      <main
        class="flex-1 min-h-0 min-w-0 overflow-y-auto flex flex-col pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0"
      >
        <slot />
      </main>
    </div>

    <AppBottomNav />
  </div>
</template>

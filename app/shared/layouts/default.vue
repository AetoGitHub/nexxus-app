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

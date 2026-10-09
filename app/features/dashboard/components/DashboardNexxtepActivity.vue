<script setup lang="ts">
/**
 * Actividad de los ejecutivos virtuales de Nexxtep. Todavía no hay API: se muestra la estructura (esqueletos, sin cifras de
 * ejemplo) dentro de `WipOverlay`. Cuando exista el endpoint se reemplaza el contenido y se quita el envoltorio.
 */
const { t } = useI18n()

const tiles = ['active', 'waiting', 'escalated', 'autonomous'] as const
</script>

<template>
  <WipOverlay>
    <section class="rounded-xl border border-border bg-card p-4">
      <h2 class="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <UIcon
          name="i-lucide-bot"
          class="size-3.5"
        />
        {{ t('dashboard.nexxtepActivity.title') }}
      </h2>

      <div class="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <article
          v-for="tile in tiles"
          :key="tile"
          class="rounded-xl border border-border px-3.5 py-3"
        >
          <USkeleton class="h-6 w-12" />
          <p class="mt-2 truncate text-[11px] text-muted-foreground">
            {{ t(`dashboard.nexxtepActivity.tiles.${tile}`) }}
          </p>
        </article>
      </div>

      <h3 class="mt-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {{ t('dashboard.nexxtepActivity.byExecutive') }}
      </h3>
      <div class="mt-2 space-y-2">
        <USkeleton
          v-for="n in 3"
          :key="n"
          class="h-9 w-full rounded-lg"
        />
      </div>
    </section>
  </WipOverlay>
</template>

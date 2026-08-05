<script setup lang="ts">
const { t, locale, locales, setLocale } = useI18n()

const availableLocales = computed(() => locales.value)

async function selectLocale(code: string) {
  await setLocale(code as typeof locale.value)
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-xl font-bold text-foreground">
        {{ t('settings.nav.preferences') }}
      </h2>
      <p class="text-sm text-muted-foreground mt-1">
        {{ t('settings.language.description') }}
      </p>
    </div>

    <section class="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div class="mb-4">
        <h3 class="text-sm font-semibold text-foreground">
          {{ t('settings.language.title') }}
        </h3>
        <p class="text-sm text-muted-foreground">
          {{ t('settings.language.description') }}
        </p>
      </div>

      <div class="space-y-2">
        <button
          v-for="loc in availableLocales"
          :key="loc.code"
          type="button"
          class="w-full flex items-center justify-between px-4 py-2.5 text-sm rounded-md border transition-colors"
          :class="locale === loc.code
            ? 'border-aeto-teal bg-aeto-teal-light text-aeto-teal-dark font-medium'
            : 'border-border text-foreground hover:bg-muted'"
          @click="selectLocale(loc.code)"
        >
          <span>{{ loc.name }}</span>
          <UIcon
            v-if="locale === loc.code"
            name="i-lucide-check"
            class="h-4 w-4"
          />
        </button>
      </div>
    </section>
  </div>
</template>

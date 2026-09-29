<script setup lang="ts">
const props = withDefaults(defineProps<{
  dark?: boolean
  pageNumber?: number
  periodLabel?: string
  gradientBar?: boolean
  hideFooter?: boolean
}>(), {
  dark: false,
  pageNumber: undefined,
  periodLabel: '',
  gradientBar: false,
  hideFooter: false,
})

const { t } = useI18n()

const isoUrl = computed(() =>
  props.dark ? '/logos/Nexxus_Isotipo_DarkMode.png' : '/logos/Nexxus_Isotipo_FondoClaro.png',
)
</script>

<template>
  <section
    class="cr-page"
    :class="{ 'cr-page--dark': dark }"
  >
    <div
      v-if="gradientBar"
      class="cr-page__bar"
    />
    <slot />
    <footer
      v-if="!hideFooter"
      class="cr-footer"
    >
      <span class="cr-footer__brand">
        <img :src="isoUrl" alt="">
        {{ t('ceoReport.footer.brand') }}
      </span>
      <span class="cr-footer__dots">· · ·</span>
      <span>
        {{ periodLabel }} · {{ t('ceoReport.footer.confidential') }}
        <span
          v-if="pageNumber != null"
          class="cr-footer__page"
        >{{ pageNumber }}</span>
      </span>
    </footer>
  </section>
</template>

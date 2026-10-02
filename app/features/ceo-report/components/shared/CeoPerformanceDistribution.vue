<script setup lang="ts">
import type { CeoDistribution, CeoRating } from '~/features/ceo-report/types/ceo-report.types'
import { initialsOf } from '~/features/ceo-report/utils/ceo-report.util'

const props = defineProps<{ distribution?: CeoDistribution }>()

const { t } = useI18n()
const uid = useId()

const CHART_HEIGHT = 110
const MIN_BAR_HEIGHT = 8

const COLORS: Record<CeoRating, string> = {
  excellent: '#16a34a',
  good: '#2dd4bf',
  regular: '#d4a017',
  critical: '#dc2626',
}

const chart = useTemplateRef<HTMLElement>('chart')

/** Rango con el tooltip abierto (hover, foco de teclado o tap). */
const activeRange = ref<CeoRating | null>(null)
/** Rango abierto por foco de teclado: solo ese se cierra al perder el foco. */
const keyboardRange = ref<CeoRating | null>(null)

onClickOutside(chart, () => {
  activeRange.value = null
})

const buckets = computed(() => props.distribution?.buckets ?? [])

function barHeight(count: number): number {
  const max = props.distribution?.maxCount ?? 0
  if (!count || !max) {
    return MIN_BAR_HEIGHT
  }
  return Math.max(MIN_BAR_HEIGHT, (count / max) * CHART_HEIGHT)
}

function open(range: CeoRating) {
  activeRange.value = range
}

function close(range: CeoRating) {
  if (activeRange.value === range) {
    activeRange.value = null
  }
}

function toggle(range: CeoRating) {
  activeRange.value = activeRange.value === range ? null : range
}

function onPointerEnter(event: PointerEvent, range: CeoRating) {
  if (event.pointerType === 'mouse') {
    open(range)
  }
}

function onPointerLeave(event: PointerEvent, range: CeoRating) {
  if (event.pointerType === 'mouse') {
    close(range)
  }
}

function onClick(event: MouseEvent, range: CeoRating) {
  // Con mouse el hover ya lo abrió: el clic no debe cerrarlo. Con tap, alterna.
  if ((event as PointerEvent).pointerType === 'mouse') {
    open(range)
    return
  }
  toggle(range)
}

function onFocus(event: FocusEvent, range: CeoRating) {
  // Solo el foco de teclado abre; el foco que trae un clic/tap lo maneja `onClick`.
  if ((event.currentTarget as HTMLElement).matches(':focus-visible')) {
    keyboardRange.value = range
    open(range)
  }
}

function onBlur(range: CeoRating) {
  if (keyboardRange.value === range) {
    keyboardRange.value = null
    close(range)
  }
}

function tipAlign(index: number): string {
  if (index === 0) {
    return 'is-start'
  }
  return index === buckets.value.length - 1 ? 'is-end' : 'is-center'
}

function percent(value: number | null): string {
  return value == null ? '—' : `${value}%`
}
</script>

<template>
  <section
    v-if="distribution"
    class="cr-dist"
  >
    <div class="cr-dist__head">
      {{ t('ceoReport.distribution.title') }}
      <span
        v-if="distribution.criticalCount > 0"
        class="cr-pill-red"
      >{{ t('ceoReport.distribution.critical', { n: distribution.criticalCount }, distribution.criticalCount) }}</span>
    </div>

    <div
      ref="chart"
      class="cr-dist__plot"
      :style="{ '--cr-dist-height': `${CHART_HEIGHT}px` }"
    >
      <div
        v-if="distribution.goal != null"
        class="cr-dist__goal"
        aria-hidden="true"
      >
        <span>{{ t('ceoReport.distribution.goal', { n: distribution.goal }) }}</span>
      </div>

      <div
        v-for="(bucket, index) in buckets"
        :key="bucket.range"
        class="cr-dist__col"
        @pointerenter="onPointerEnter($event, bucket.range)"
        @pointerleave="onPointerLeave($event, bucket.range)"
      >
        <div
          class="cr-dist__hit"
          tabindex="0"
          role="button"
          :aria-expanded="activeRange === bucket.range"
          :aria-describedby="activeRange === bucket.range ? `${uid}-${bucket.range}` : undefined"
          :aria-label="t('ceoReport.distribution.aria', { range: t(`ceoReport.rating.${bucket.range}`), n: bucket.count }, bucket.count)"
          @click="onClick($event, bucket.range)"
          @focus="onFocus($event, bucket.range)"
          @blur="onBlur(bucket.range)"
          @keydown.enter.prevent="toggle(bucket.range)"
          @keydown.space.prevent="toggle(bucket.range)"
          @keydown.esc="close(bucket.range)"
        >
          <span
            class="cr-dist__count"
            :style="{ color: COLORS[bucket.range] }"
          >{{ bucket.count }}</span>
          <span
            class="cr-dist__bar"
            :class="{ 'is-empty': !bucket.count }"
            :style="{ height: `${barHeight(bucket.count)}px`, background: COLORS[bucket.range] }"
          />
        </div>

        <div
          v-if="activeRange === bucket.range"
          :id="`${uid}-${bucket.range}`"
          class="cr-dist__tip"
          :class="tipAlign(index)"
          role="tooltip"
        >
          <div class="cr-dist__tip-head">
            <i :style="{ background: COLORS[bucket.range] }" />
            <b>{{ t(`ceoReport.rating.${bucket.range}`) }}</b>
            ({{ bucket.rangeLabel }}) · {{ t('ceoReport.distribution.tipCount', { n: bucket.count }, bucket.count) }}
          </div>
          <ul
            v-if="bucket.people.length"
            class="cr-dist__tip-list"
          >
            <li
              v-for="person in bucket.people"
              :key="person.id"
            >
              <span
                class="cr-dist__tip-avatar"
                :style="{ background: COLORS[bucket.range] }"
              >{{ initialsOf(person.name) }}</span>
              <span class="cr-dist__tip-name">{{ person.name }}</span>
              <span class="cr-dist__tip-pct">{{ percent(person.completion) }}</span>
              <span class="cr-dist__tip-tasks">{{ t('ceoReport.people.tasks', { n: person.tasks }, person.tasks) }}</span>
            </li>
          </ul>
          <p
            v-else
            class="cr-dist__tip-empty"
          >
            {{ t('ceoReport.distribution.empty') }}
          </p>
        </div>
      </div>
    </div>

    <div class="cr-legend">
      <span
        v-for="bucket in buckets"
        :key="bucket.range"
      >
        <i :style="{ background: COLORS[bucket.range] }" />{{ t(`ceoReport.rating.${bucket.range}`).toUpperCase() }} {{ bucket.rangeLabel }}
      </span>
    </div>
  </section>

  <p
    v-else
    class="cr-dist__missing"
  >
    {{ t('ceoReport.distribution.regenerate') }}
  </p>
</template>

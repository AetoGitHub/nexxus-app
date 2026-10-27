<script setup lang="ts">
import { mentionDisplayName, useMentionUsers } from '~/shared/composables/useMentionUsers'
import type { MentionProfile } from '~/shared/composables/useMentionUsers'
import { getCaretCoordinates } from '~/shared/utils/caret-coordinates.util'
import {
  displaySegments,
  displayToTokens,
  findActiveMentionQuery,
  findMentionRanges,
  hasMentions,
  tokensToDisplay,
} from '~/shared/utils/mention.util'

/**
 * Textarea con menciones `@usuario` y autocompletado.
 *
 * - `v-model` lleva el texto que se guarda y se envía: las menciones como token `@[Nombre Apellido](id)`.
 * - En pantalla cada mención se ve como `@Nombre Apellido` con un resaltado de chip (se dibuja detrás del texto
 *   copiando la tipografía del textarea, así se conserva el textarea nativo: teclado móvil, IME, autoresize).
 * - Al teclear «@» se abre la lista de usuarios (↑/↓, Enter o Tab para elegir, Esc para cerrar, o clic).
 * - Backspace/Supr junto a un chip lo borra completo.
 * - `companyId`: solo se sugiere a miembros de esa compañía (la del proyecto de la tarea).
 * - `mentionsEnabled`: en `false` no se abre el autocompletado (tareas de un proyecto privado: el backend no admite menciones).
 */
const model = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    companyId?: number | null
    mentionsEnabled?: boolean
    placeholder?: string
    rows?: number
    maxrows?: number
    autoresize?: boolean
    disabled?: boolean
    ui?: Record<string, unknown>
  }>(),
  {
    companyId: null,
    mentionsEnabled: true,
    placeholder: undefined,
    rows: 1,
    maxrows: 0,
    autoresize: true,
    disabled: false,
    ui: undefined,
  },
)

const { t } = useI18n()

const inner = useTemplateRef<{ textareaRef: HTMLTextAreaElement | null }>('inner')
const wrapper = useTemplateRef<HTMLElement>('wrapper')
const textareaRef = computed(() => inner.value?.textareaRef ?? null)
defineExpose({ textareaRef })

/** Menciones conocidas del texto: nombre → id (las que ya venían guardadas y las que se eligen). */
const registry = reactive(new Map<string, number>())
const display = ref(tokensToDisplay(model.value ?? '', registry))
let lastEmitted = model.value ?? ''

watch(model, (value) => {
  if (value === lastEmitted) {
    return
  }
  lastEmitted = value ?? ''
  display.value = tokensToDisplay(lastEmitted, registry)
  void nextTick(syncBackdrop)
})

function emitTokens() {
  lastEmitted = displayToTokens(display.value, registry)
  model.value = lastEmitted
}

function onUpdate(value: string) {
  // Un token pegado (`@[Ana](31)`) se vuelve chip en el momento.
  display.value = hasMentions(value) ? tokensToDisplay(value, registry) : value
  emitTokens()
  void nextTick(() => {
    syncBackdrop()
    refreshSuggest()
  })
}

// --- Resaltado de chips ---------------------------------------------------------------------------------------
const segments = computed(() => displaySegments(display.value, registry))
const hasChips = computed(() => segments.value.some(segment => segment.type === 'mention'))
const backdropStyle = ref<Record<string, string>>({})
const scrollTop = ref(0)

function syncBackdrop() {
  const textarea = textareaRef.value
  if (!textarea) {
    return
  }
  const computed = getComputedStyle(textarea)
  const borders = Number.parseFloat(computed.borderLeftWidth) + Number.parseFloat(computed.borderRightWidth)
  const scrollbar = Math.max(0, textarea.offsetWidth - textarea.clientWidth - borders)
  backdropStyle.value = {
    boxSizing: computed.boxSizing,
    paddingTop: computed.paddingTop,
    paddingBottom: computed.paddingBottom,
    paddingLeft: computed.paddingLeft,
    paddingRight: `calc(${computed.paddingRight} + ${scrollbar}px)`,
    borderTopWidth: computed.borderTopWidth,
    borderBottomWidth: computed.borderBottomWidth,
    borderLeftWidth: computed.borderLeftWidth,
    borderRightWidth: computed.borderRightWidth,
    borderStyle: 'solid',
    borderColor: 'transparent',
    fontFamily: computed.fontFamily,
    fontSize: computed.fontSize,
    fontWeight: computed.fontWeight,
    fontStyle: computed.fontStyle,
    lineHeight: computed.lineHeight,
    letterSpacing: computed.letterSpacing,
    wordSpacing: computed.wordSpacing,
    textIndent: computed.textIndent,
    textTransform: computed.textTransform,
    tabSize: computed.tabSize,
  }
  scrollTop.value = textarea.scrollTop
}

onMounted(syncBackdrop)
useEventListener(textareaRef, 'scroll', () => {
  scrollTop.value = textareaRef.value?.scrollTop ?? 0
  if (open.value) {
    positionMenu()
  }
})
useResizeObserver(textareaRef, syncBackdrop)

// --- Autocompletado ---------------------------------------------------------------------------------------------
const { results, isLoading, search, cancel } = useMentionUsers(() => props.companyId)
const open = ref(false)
const term = ref('')
const anchor = ref(0)
const active = ref(0)
const menuStyle = ref<Record<string, string>>({})
const menuEl = useTemplateRef<HTMLElement>('menu')

function closeMenu() {
  open.value = false
  term.value = ''
  cancel()
}

function refreshSuggest() {
  const textarea = textareaRef.value
  if (!props.mentionsEnabled || !textarea || props.disabled || document.activeElement !== textarea || textarea.selectionStart !== textarea.selectionEnd) {
    closeMenu()
    return
  }

  const caret = textarea.selectionStart
  const query = findActiveMentionQuery(
    display.value.slice(0, caret),
    caret,
    findMentionRanges(display.value, registry),
  )
  if (!query) {
    closeMenu()
    return
  }

  anchor.value = query.start
  const wasOpen = open.value
  if (!wasOpen || query.term !== term.value) {
    term.value = query.term
    active.value = 0
    search(query.term, !wasOpen)
  }
  open.value = true
  positionMenu()
}

/** Menú junto al «@»: debajo de la línea, o arriba si abajo no cabe (el input del chat está al pie del panel). */
function positionMenu() {
  const textarea = textareaRef.value
  const box = wrapper.value
  if (!textarea || !box) {
    return
  }

  const MENU_WIDTH = 288
  const MENU_HEIGHT = 240
  const textareaRect = textarea.getBoundingClientRect()
  const boxRect = box.getBoundingClientRect()
  const caret = getCaretCoordinates(textarea, anchor.value)

  const width = Math.min(MENU_WIDTH, boxRect.width)
  const left = Math.min(Math.max(0, textareaRect.left - boxRect.left + caret.left - textarea.scrollLeft), boxRect.width - width)
  const lineTop = textareaRect.top - boxRect.top + caret.top - textarea.scrollTop
  const spaceBelow = window.innerHeight - (boxRect.top + lineTop + caret.height)
  const spaceAbove = boxRect.top + lineTop

  menuStyle.value = spaceBelow < MENU_HEIGHT && spaceAbove > spaceBelow
    ? { left: `${left}px`, width: `${width}px`, bottom: `${boxRect.height - lineTop + 4}px` }
    : { left: `${left}px`, width: `${width}px`, top: `${lineTop + caret.height + 4}px` }
}

function pick(profile: MentionProfile) {
  const textarea = textareaRef.value
  if (!textarea) {
    return
  }

  const name = mentionDisplayName(profile)
  registry.set(name, profile.id)

  const caret = textarea.selectionStart
  const before = display.value.slice(0, anchor.value)
  const after = display.value.slice(caret)
  const insertion = `@${name}${/^\s/.test(after) ? '' : ' '}`

  display.value = before + insertion + after
  emitTokens()
  closeMenu()

  const position = before.length + insertion.length
  void nextTick(() => {
    textarea.focus()
    textarea.setSelectionRange(position, position)
    syncBackdrop()
  })
}

function removeMention(range: { start: number, end: number }) {
  const textarea = textareaRef.value
  display.value = display.value.slice(0, range.start) + display.value.slice(range.end)
  emitTokens()
  closeMenu()
  void nextTick(() => {
    textarea?.setSelectionRange(range.start, range.start)
    syncBackdrop()
  })
}

function swallow(event: KeyboardEvent) {
  event.preventDefault()
  event.stopImmediatePropagation()
}

/**
 * En captura sobre `window`: llega antes que el Escape de los modales/paneles (que escuchan en `document`) y que el
 * Enter del chat (que envía el mensaje), para que con la lista abierta esas teclas solo la manejen a ella.
 */
function onKeydown(event: KeyboardEvent) {
  const textarea = textareaRef.value
  if (!textarea || event.target !== textarea || event.isComposing) {
    return
  }

  if (open.value) {
    if (event.key === 'Escape') {
      swallow(event)
      closeMenu()
      return
    }

    const count = results.value.length
    if (count && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      swallow(event)
      active.value = (active.value + (event.key === 'ArrowDown' ? 1 : count - 1)) % count
      void nextTick(() => menuEl.value?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }))
      return
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      // Mientras busca no se envía el mensaje con un «@he» a medias; sin resultados, Enter sigue su curso normal.
      if (count) {
        swallow(event)
        const profile = results.value[active.value]
        if (profile) {
          pick(profile)
        }
        return
      }
      if (isLoading.value) {
        swallow(event)
        return
      }
    }
  }

  if ((event.key === 'Backspace' || event.key === 'Delete') && textarea.selectionStart === textarea.selectionEnd) {
    const caret = textarea.selectionStart
    const ranges = findMentionRanges(display.value, registry)
    const range = event.key === 'Backspace'
      ? ranges.find(item => caret > item.start && caret <= item.end)
      : ranges.find(item => caret >= item.start && caret < item.end)
    if (range) {
      swallow(event)
      removeMention(range)
    }
  }
}

useEventListener(window, 'keydown', onKeydown, { capture: true })
useEventListener(textareaRef, 'click', refreshSuggest)
useEventListener(textareaRef, 'keyup', (event: KeyboardEvent) => {
  if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    refreshSuggest()
  }
})
useEventListener(textareaRef, 'blur', closeMenu)
useEventListener(window, 'resize', () => {
  if (open.value) {
    positionMenu()
  }
})
</script>

<template>
  <div
    ref="wrapper"
    class="relative"
  >
    <UTextarea
      ref="inner"
      :model-value="display"
      :placeholder="placeholder"
      :rows="rows"
      :maxrows="maxrows"
      :autoresize="autoresize"
      :disabled="disabled"
      :ui="ui"
      class="w-full"
      @update:model-value="onUpdate"
    />

    <!-- Resaltado de los chips: copia el texto en transparente y pinta solo el fondo de cada mención. -->
    <div
      v-if="hasChips"
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div
        class="mention-backdrop"
        :style="{ ...backdropStyle, transform: `translateY(${-scrollTop}px)` }"
      ><template v-for="(segment, index) in segments" :key="index"><mark
        v-if="segment.type === 'mention'"
        class="mention-mark"
      >{{ segment.name }}</mark><template v-else>{{ segment.text }}</template></template>&#8203;</div>
    </div>

    <div
      v-if="open"
      ref="menu"
      role="listbox"
      class="absolute z-50 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
      :style="menuStyle"
      :aria-label="t('mentions.listLabel')"
      @mousedown.prevent
    >
      <p
        v-if="!results.length"
        class="px-3 py-2 text-sm text-muted-foreground"
      >
        {{ isLoading ? t('mentions.loading') : t('mentions.empty') }}
      </p>
      <ul
        v-else
        class="max-h-56 overflow-y-auto py-1"
      >
        <li
          v-for="(profile, index) in results"
          :key="profile.id"
          role="option"
          :aria-selected="index === active"
          class="cursor-pointer px-3 py-1.5"
          :class="index === active ? 'bg-primary/10' : ''"
          @mouseenter="active = index"
          @click="pick(profile)"
        >
          <p class="truncate text-sm font-medium text-foreground">
            {{ mentionDisplayName(profile) }}
          </p>
          <p class="truncate text-xs text-muted-foreground">
            @{{ profile.username }}
          </p>
        </li>
      </ul>
    </div>
  </div>
</template>

<style>
.mention-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  color: transparent;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

/* Sin padding ni cambio de fuente: el texto de atrás debe medir igual que el del textarea. */
.mention-mark {
  color: transparent;
  border-radius: 0.375rem;
  background: color-mix(in oklab, var(--ui-primary, #14b8a6) 22%, transparent);
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--ui-primary, #14b8a6) 38%, transparent);
}
</style>

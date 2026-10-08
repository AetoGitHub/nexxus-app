<script setup lang="ts">
import { useTooltipTouchTap } from '~/features/dashboard/composables/useTooltipTouchTap'
import { avatarColor } from '~/features/dashboard/utils/dashboard.util'
import { getInitials } from '~/shared/utils/initials'

/**
 * Miembros de un proyecto como círculos de iniciales con el color de cada persona (el mismo del Rendimiento
 * individual). Se muestran `visible` y el resto va como «+N»: al pasar el cursor (o con foco / tap en touch) un tooltip
 * lista a quienes no caben.
 */
const props = withDefaults(
  defineProps<{
    members: { id: number, name: string }[]
    /** Círculos visibles antes del «+N». */
    visible?: number
  }>(),
  {
    visible: 3,
  },
)

const { t } = useI18n()

const shown = computed(() => props.members.slice(0, props.visible))
const hidden = computed(() => props.members.slice(props.visible))

// En touch no hay hover: el tap abre y cierra el tooltip (ver `useTooltipTouchTap`).
const { open, onPointerDown, endTouchTap, onUpdateOpen, onClick } = useTooltipTouchTap()
</script>

<template>
  <div class="flex items-center">
    <UserAvatar
      v-for="(member, index) in shown"
      :key="member.id"
      class="border-2 border-card"
      :class="index > 0 ? '-ml-1.5' : ''"
      :user-id="member.id"
      :initials="getInitials(member.name)"
      :size="24"
      :font-size="9"
      :fallback-color="avatarColor(member.id)"
      :title="member.name"
    />

    <UTooltip
      v-if="hidden.length"
      :open="open"
      :content="{ side: 'top', align: 'center', sideOffset: 6 }"
      :ui="{ content: 'h-auto max-w-[280px] items-start p-2.5' }"
      @update:open="onUpdateOpen"
    >
      <button
        type="button"
        class="ml-1.5 cursor-help rounded-sm px-0.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aeto-teal"
        :aria-label="t('dashboard.topics.moreMembers', { count: hidden.length })"
        @pointerdown.capture="onPointerDown"
        @pointerup="endTouchTap"
        @pointercancel="endTouchTap"
        @click="onClick"
      >
        +{{ hidden.length }}
      </button>

      <template #content>
        <ul class="space-y-1.5 text-left">
          <li
            v-for="member in hidden"
            :key="member.id"
            class="flex items-center gap-2"
          >
            <UserAvatar
              :user-id="member.id"
              :initials="getInitials(member.name)"
              :size="20"
              :font-size="8"
              :fallback-color="avatarColor(member.id)"
            />
            <span class="text-xs text-foreground">{{ member.name }}</span>
          </li>
        </ul>
      </template>
    </UTooltip>
  </div>
</template>

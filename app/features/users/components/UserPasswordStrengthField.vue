<script setup lang="ts">
const props = defineProps<{
  name: string
  label: string
  placeholder: string
}>()

const password = defineModel<string>({ required: true })
const { t } = useI18n()
const show = ref(false)
const fieldId = useId()
const descriptionId = `${fieldId}-strength`

const requirements = computed(() => [
  {
    met: password.value.length >= 8,
    text: t('configuration.user.passwordStrength.requirements.length'),
  },
  {
    met: /\d/.test(password.value),
    text: t('configuration.user.passwordStrength.requirements.number'),
  },
  {
    met: /[a-z]/.test(password.value),
    text: t('configuration.user.passwordStrength.requirements.lowercase'),
  },
  {
    met: /[A-Z]/.test(password.value),
    text: t('configuration.user.passwordStrength.requirements.uppercase'),
  },
])

const score = computed(() =>
  requirements.value.filter(requirement => requirement.met).length,
)

const color = computed(() => {
  if (score.value === 0) return 'neutral'
  if (score.value <= 1) return 'error'
  if (score.value <= 3) return 'warning'
  return 'success'
})

const strengthText = computed(() => {
  if (score.value === 0) return t('configuration.user.passwordStrength.empty')
  if (score.value <= 2) return t('configuration.user.passwordStrength.weak')
  if (score.value === 3) return t('configuration.user.passwordStrength.medium')
  return t('configuration.user.passwordStrength.strong')
})
</script>

<template>
  <div class="space-y-2">
    <UFormField
      :name="props.name"
      :label="props.label"
      required
    >
      <UInput
        :id="fieldId"
        v-model="password"
        :placeholder="props.placeholder"
        :color="color"
        :type="show ? 'text' : 'password'"
        :aria-invalid="score < 4"
        :aria-describedby="descriptionId"
        :ui="{ trailing: 'pe-1' }"
        class="w-full"
      >
        <template #trailing>
          <UButton
            type="button"
            color="neutral"
            variant="link"
            size="sm"
            :icon="show ? 'i-lucide-eye-off' : 'i-lucide-eye'"
            :aria-label="show
              ? t('configuration.user.passwordStrength.hide')
              : t('configuration.user.passwordStrength.show')"
            :aria-pressed="show"
            :aria-controls="fieldId"
            @click="show = !show"
          />
        </template>
      </UInput>
    </UFormField>

    <UProgress
      :color="color"
      :model-value="score"
      :max="4"
      :get-value-text="() => strengthText"
      size="sm"
    />

    <p
      :id="descriptionId"
      class="text-sm font-medium"
    >
      {{ strengthText }}. {{ t('configuration.user.passwordStrength.mustContain') }}
    </p>

    <ul
      class="space-y-1"
      :aria-label="t('configuration.user.passwordStrength.requirementsLabel')"
    >
      <li
        v-for="(requirement, index) in requirements"
        :key="index"
        class="flex items-center gap-1"
        :class="requirement.met ? 'text-success' : 'text-muted'"
      >
        <UIcon
          :name="requirement.met
            ? 'i-lucide-circle-check'
            : 'i-lucide-circle-x'"
          class="size-4 shrink-0"
        />
        <span class="text-xs font-light">
          {{ requirement.text }}
          <span class="sr-only">
            {{ requirement.met
              ? t('configuration.user.passwordStrength.met')
              : t('configuration.user.passwordStrength.notMet') }}
          </span>
        </span>
      </li>
    </ul>
  </div>
</template>

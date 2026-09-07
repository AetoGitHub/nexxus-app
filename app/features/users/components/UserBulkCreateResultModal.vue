<script setup lang="ts">
import type { BulkCreatedUserCredential } from '~/features/users/types/user.types'

const props = defineProps<{
  modelValue: boolean
  credentials: BulkCreatedUserCredential[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { t } = useI18n()
const toast = useToast()
const { copy } = useClipboard()

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

function formatCredential(credential: BulkCreatedUserCredential): string {
  return `${t('configuration.user.bulkCreate.result.usernameLabel')}: ${credential.username}\n`
    + `${t('configuration.user.bulkCreate.result.passwordLabel')}: ${credential.password}`
}

async function copyPassword(credential: BulkCreatedUserCredential) {
  try {
    await copy(credential.password)
    toast.add({
      title: t('configuration.user.bulkCreate.result.copySuccess', { username: credential.username }),
      color: 'success',
      icon: 'i-lucide-check',
    })
  }
  catch {
    toast.add({
      title: t('configuration.user.bulkCreate.result.copyError'),
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  }
}

async function copyAll() {
  const text = props.credentials.map(formatCredential).join('\n')

  try {
    await copy(text)
    toast.add({
      title: t('configuration.user.bulkCreate.result.copyAllSuccess'),
      color: 'success',
      icon: 'i-lucide-check',
    })
  }
  catch {
    toast.add({
      title: t('configuration.user.bulkCreate.result.copyError'),
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('configuration.user.bulkCreate.result.title')"
    :description="t('configuration.user.bulkCreate.result.description')"
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <div class="flex justify-end">
          <UButton
            type="button"
            color="primary"
            variant="subtle"
            size="sm"
            icon="i-lucide-copy"
            :label="t('configuration.user.bulkCreate.result.copyAll')"
            @click="copyAll"
          />
        </div>

        <div class="flex max-h-[50vh] flex-col gap-3 overflow-y-auto pr-1">
          <div
            v-for="credential in credentials"
            :key="credential.username"
            class="rounded-lg border border-default p-3"
          >
            <p class="text-sm font-medium text-highlighted">
              {{ credential.username }}
            </p>
            <UInput
              :model-value="credential.password"
              readonly
              autocomplete="off"
              class="mt-1.5 w-full font-mono"
              :ui="{ trailing: 'pe-1' }"
              @focus="($event.target as HTMLInputElement).select()"
            >
              <template #trailing>
                <UButton
                  type="button"
                  color="neutral"
                  variant="link"
                  size="sm"
                  icon="i-lucide-copy"
                  :aria-label="t('configuration.user.bulkCreate.result.copyOne')"
                  @click="copyPassword(credential)"
                />
              </template>
            </UInput>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end">
        <UButton
          type="button"
          color="neutral"
          variant="outline"
          :label="t('configuration.user.bulkCreate.result.close')"
          @click="open = false"
        />
      </div>
    </template>
  </UModal>
</template>

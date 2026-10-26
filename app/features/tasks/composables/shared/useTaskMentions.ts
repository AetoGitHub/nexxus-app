import type { MaybeRefOrGetter } from 'vue'
import type { TaskMention } from '~/features/tasks/types/task.types'
import { profileFullName } from '~/features/auth/utils/profile-appearance.util'

/** Menciones de una tarea frente al usuario logueado: `mentionsMe` y los nombres a mostrar (primero «Tú»). */
export function useTaskMentions(mentions: MaybeRefOrGetter<TaskMention[] | null | undefined>) {
  const { t } = useI18n()
  const { user } = useAuth()

  const list = computed(() => toValue(mentions) ?? [])
  const mentionsMe = computed(() => user.value != null && list.value.some(mention => mention.id === user.value?.id))

  /** «first_name last_name», o el username si vienen vacíos; quien está logueado va primero como «Tú». */
  const names = computed(() => {
    const myId = user.value?.id
    const others = list.value
      .filter(mention => mention.id !== myId)
      .map(mention => profileFullName(mention))
    return mentionsMe.value ? [t('tasks.mentions.you'), ...others] : others
  })

  return { mentions: list, count: computed(() => list.value.length), mentionsMe, names }
}

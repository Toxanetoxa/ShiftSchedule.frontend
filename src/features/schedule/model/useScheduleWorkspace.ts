import type { CalendarResponse, PublicationMeta, PublishRequest } from '@schedule/api/types'
import type { CalendarView, DateRange, IsoDate } from '@schedule/domain/types'
import type { FrozenScheduleSave, RebaseResolution } from './useScheduleDraft'
import { configuredScheduleId, createPublication, saveCells } from '@schedule/api/api'
import { scheduleKeys, useCalendarQuery } from '@schedule/api/query'
import {
  calendarDates,
  calendarRange,
  calendarRangeLabel,
  monthPublicationRange,
  todayInZone,
} from '@schedule/domain/calendar'
import { isIsoDate } from '@schedule/domain/format'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, onMounted, onScopeDispose, ref, shallowRef, watch } from 'vue'
import { ApiError } from '@/shared/api/client'
import { useScheduleDraft } from './useScheduleDraft'

type Target = { page: 'home' | 'schedule' } | { view: CalendarView; date: IsoDate }

export function useScheduleWorkspace() {
  const scheduleId = ref(configuredScheduleId)
  const view = ref<CalendarView>('week')
  const activeDate = ref(todayInZone())
  const currentPage = ref<'home' | 'schedule'>('schedule')
  const range = computed(() => calendarRange(view.value, activeDate.value))
  const draft = useScheduleDraft()
  const busy = ref(false)
  const stage = ref<'save' | 'publish' | 'review' | null>(null)
  const error = ref('')
  const message = ref('')
  const savedAt = ref<string | null>(null)
  const offline = ref(typeof navigator !== 'undefined' && !navigator.onLine)
  const reviewOpen = ref(false)
  const unsavedOpen = ref(false)
  const pendingTarget = shallowRef<Target | null>(null)
  const latestPublication = shallowRef<PublicationMeta | null>(null)
  const reconciliationRequired = ref(false)
  let pendingPublication: { scheduleId: string; input: PublishRequest } | null = null
  const client = useQueryClient()
  const query = useCalendarQuery(
    scheduleId,
    range,
    computed(() => !busy.value && currentPage.value === 'schedule'),
  )
  const saveMutation = useMutation({
    mutationFn: (frozen: FrozenScheduleSave) =>
      saveCells(frozen.scheduleId, {
        expectedVersion: frozen.expectedVersion,
        changes: frozen.changes,
      }),
    retry: false,
    networkMode: 'always',
  })
  const publishMutation = useMutation({
    mutationFn: (proposal: { scheduleId: string; input: PublishRequest }) =>
      createPublication(proposal.scheduleId, proposal.input),
    retry: false,
    networkMode: 'always',
  })

  function accept(snapshot: CalendarResponse | undefined): void {
    if (
      snapshot?.schedule.id === scheduleId.value &&
      snapshot.range.from === range.value.from &&
      snapshot.range.to === range.value.to
    )
      draft.acceptCalendar(snapshot)
  }
  watch(query.data, accept, { immediate: true })
  const isLoading = computed(
    () => !draft.latestRemote.value && (query.isPending.value || query.isFetching.value),
  )
  const loadError = computed(() => (query.isError.value ? errorText(query.error.value) : ''))
  const remoteUpdated = computed(() => draft.remoteUpdated.value || reconciliationRequired.value)
  const canEdit = computed(
    () =>
      Boolean(draft.latestRemote.value) && !busy.value && !reviewOpen.value && !unsavedOpen.value,
  )
  const canSave = computed(
    () =>
      Boolean(draft.latestRemote.value) &&
      draft.dirtyCount.value > 0 &&
      !busy.value &&
      !offline.value,
  )
  const canPublish = computed(
    () => Boolean(draft.latestRemote.value) && !busy.value && !offline.value,
  )
  const title = computed(() => draft.latestRemote.value?.schedule.name || 'График сотрудников')
  const dates = computed(() =>
    calendarDates(range.value, todayInZone(draft.latestRemote.value?.schedule.timeZone)),
  )
  const rangeLabel = computed(() => calendarRangeLabel(view.value, range.value))
  const defaultPublicationRange = computed(() => monthPublicationRange(activeDate.value))

  function errorText(value: unknown): string {
    const text = value instanceof Error ? value.message : 'Не удалось выполнить запрос.'
    if (!(value instanceof ApiError)) return text
    const workDate = typeof value.details?.workDate === 'string' ? value.details.workDate : ''
    const employeeId = typeof value.details?.employeeId === 'string' ? value.details.employeeId : ''
    const employee = draft.rows.value.find((row) => row.employee.id === employeeId)?.employee.name
    const conflictingDate =
      typeof value.details?.conflictingWorkDate === 'string'
        ? value.details.conflictingWorkDate
        : ''
    return [
      text,
      employee,
      workDate,
      conflictingDate && conflictingDate !== workDate
        ? `Пересечение со сменой ${conflictingDate}`
        : '',
    ]
      .filter(Boolean)
      .join(' · ')
  }

  async function fetchRemote(): Promise<boolean> {
    const result = await query.refetch({ throwOnError: true })
    accept(result.data)
    return Boolean(result.data)
  }

  async function review(): Promise<void> {
    if (busy.value || offline.value) return
    busy.value = true
    stage.value = 'review'
    error.value = ''
    try {
      if (await fetchRemote()) reviewOpen.value = true
    } catch (failure) {
      error.value = errorText(failure)
    } finally {
      busy.value = false
      stage.value = null
    }
  }

  function confirmRebase(resolution: {
    remoteVersion: number
    resolutions: RebaseResolution[]
  }): boolean {
    if (busy.value || !draft.rebase(resolution.remoteVersion, resolution.resolutions)) {
      error.value = 'Серверная версия обновилась. Проверьте решения ещё раз.'
      return false
    }
    reconciliationRequired.value = false
    reviewOpen.value = false
    error.value = ''
    message.value = 'Серверная версия принята. Ваши выбранные правки остаются в черновике.'
    return true
  }

  async function retry(): Promise<void> {
    if (busy.value) return
    if (remoteUpdated.value) {
      await review()
      return
    }
    error.value = ''
    try {
      await fetchRemote()
    } catch (failure) {
      error.value = errorText(failure)
    }
  }

  function uncertain(failure: unknown): boolean {
    return (
      !(failure instanceof ApiError) ||
      failure.status >= 500 ||
      failure.status < 400 ||
      failure.status === 408
    )
  }

  async function performSave(frozen: FrozenScheduleSave): Promise<number | null> {
    stage.value = 'save'
    await client.cancelQueries({ queryKey: scheduleKeys.calendars(frozen.scheduleId) })
    try {
      const response = await saveMutation.mutateAsync(frozen)
      draft.acceptSave(response, frozen)
      const accepted = draft.latestRemote.value
      if (accepted)
        client.setQueryData<CalendarResponse>(
          scheduleKeys.calendar(frozen.scheduleId, frozen.range),
          (previous) =>
            previous && previous.schedule.version > accepted.schedule.version ? previous : accepted,
        )
      await client.invalidateQueries({
        queryKey: scheduleKeys.calendars(frozen.scheduleId),
        refetchType: 'none',
      })
      savedAt.value = new Date().toISOString()
      error.value = ''
      message.value = 'Изменения сохранены.'
      return response.version
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === 'SCHEDULE_VERSION_CONFLICT') {
        reconciliationRequired.value = true
        error.value = ''
        message.value = 'На сервере появилась новая версия. Согласуйте её с вашим черновиком.'
        try {
          if (await fetchRemote()) reviewOpen.value = true
        } catch (readFailure) {
          error.value = errorText(readFailure)
        }
      } else if (uncertain(failure)) {
        reconciliationRequired.value = true
        error.value =
          'Результат сохранения неизвестен. Проверьте соединение и перечитайте график перед повтором; черновик сохранён.'
      } else error.value = errorText(failure)
      return null
    }
  }

  async function save(): Promise<boolean> {
    if (busy.value || offline.value || !draft.latestRemote.value) return false
    if (remoteUpdated.value) {
      await review()
      return false
    }
    busy.value = true
    error.value = ''
    try {
      const frozen = draft.freeze()
      return frozen ? (await performSave(frozen)) !== null : true
    } catch (failure) {
      error.value = errorText(failure)
      return false
    } finally {
      busy.value = false
      stage.value = null
    }
  }

  function validPublicationRange(value: DateRange): boolean {
    if (!isIsoDate(value.startDate) || !isIsoDate(value.endDate)) return false
    const days =
      (Date.parse(`${value.endDate}T12:00:00Z`) - Date.parse(`${value.startDate}T12:00:00Z`)) /
      86_400_000
    return days >= 1 && days <= 62
  }

  async function publish(value: DateRange): Promise<boolean> {
    if (busy.value || offline.value || !draft.latestRemote.value) return false
    if (
      pendingPublication &&
      (value.startDate !== pendingPublication.input.from ||
        value.endDate !== pendingPublication.input.to)
    ) {
      error.value = `Для повторной попытки сохранён диапазон ${pendingPublication.input.from} — ${pendingPublication.input.to}. Верните эти даты или закройте окно и начните новую публикацию.`
      return false
    }
    if (!pendingPublication && remoteUpdated.value) {
      await review()
      return false
    }
    if (!pendingPublication && !validPublicationRange(value)) {
      error.value = 'Выберите диапазон публикации от 1 до 62 дней. Дата окончания не включается.'
      return false
    }
    busy.value = true
    error.value = ''
    const selectedRange = { ...value }
    try {
      if (!pendingPublication) {
        const frozen = draft.freeze()
        const cleanVersion = draft.latestRemote.value.schedule.version
        const version = frozen ? await performSave(frozen) : cleanVersion
        if (version === null) return false
        pendingPublication = {
          scheduleId: scheduleId.value,
          input: {
            expectedVersion: version,
            from: selectedRange.startDate,
            to: selectedRange.endDate,
          },
        }
      }
      stage.value = 'publish'
      await client.cancelQueries({
        queryKey: scheduleKeys.calendars(pendingPublication.scheduleId),
      })
      latestPublication.value = await publishMutation.mutateAsync({
        scheduleId: pendingPublication.scheduleId,
        input: { ...pendingPublication.input },
      })
      pendingPublication = null
      message.value = 'График опубликован. Открыт сохранённый снимок.'
      return true
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === 'SCHEDULE_VERSION_CONFLICT') {
        error.value =
          'График изменился перед публикацией. Сохранённые правки остаются на сервере. Закройте окно, проверьте актуальный график и подтвердите новую публикацию.'
        try {
          await fetchRemote()
        } catch {
          /* The publication error remains actionable. */
        }
      } else if (uncertain(failure)) {
        error.value =
          'Результат публикации неизвестен. Повторная попытка в этом окне проверит тот же диапазон и версию.'
      } else {
        error.value = errorText(failure)
        pendingPublication = null
      }
      return false
    } finally {
      busy.value = false
      stage.value = null
    }
  }

  function cancelPublication(): void {
    if (!busy.value) {
      pendingPublication = null
      error.value = ''
    }
  }

  function applyTarget(target: Target): void {
    pendingTarget.value = null
    unsavedOpen.value = false
    if ('page' in target) currentPage.value = target.page
    else {
      const nextRange = calendarRange(target.view, target.date)
      if (nextRange.from !== range.value.from || nextRange.to !== range.value.to) {
        void client.cancelQueries({
          queryKey: scheduleKeys.calendar(scheduleId.value, range.value),
          exact: true,
        })
        draft.reset()
        reconciliationRequired.value = false
      }
      view.value = target.view
      activeDate.value = target.date
    }
    error.value = ''
    message.value = ''
  }
  function requestTarget(target: Target): void {
    if (busy.value) return
    if (draft.dirtyCount.value) {
      pendingTarget.value = target
      unsavedOpen.value = true
    } else applyTarget(target)
  }
  function requestPeriod(nextView: CalendarView, date: IsoDate): void {
    if (busy.value) return
    if (!isIsoDate(date)) {
      error.value = 'Укажите существующую дату.'
      return
    }
    const nextRange = calendarRange(nextView, date)
    if (nextRange.from === range.value.from && nextRange.to === range.value.to) {
      view.value = nextView
      activeDate.value = date
      return
    }
    requestTarget({ view: nextView, date })
  }
  function navigate(page: 'home' | 'schedule'): void {
    if (page !== currentPage.value) requestTarget({ page })
  }
  function cancelTransition(): void {
    if (!busy.value) {
      pendingTarget.value = null
      unsavedOpen.value = false
    }
  }
  function discardAndContinue(): void {
    if (busy.value || !pendingTarget.value) return
    const target = pendingTarget.value
    draft.discard()
    reconciliationRequired.value = false
    applyTarget(target)
  }
  async function saveAndContinue(): Promise<void> {
    const target = pendingTarget.value
    if (target && (await save())) applyTarget(target)
  }

  onMounted(() => {
    const beforeUnload = (event: BeforeUnloadEvent): void => {
      if (draft.dirtyCount.value || busy.value) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    const online = (): void => {
      offline.value = false
      void retry()
    }
    const offlineHandler = (): void => {
      offline.value = true
    }
    window.addEventListener('beforeunload', beforeUnload)
    window.addEventListener('online', online)
    window.addEventListener('offline', offlineHandler)
    onScopeDispose(() => {
      window.removeEventListener('beforeunload', beforeUnload)
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offlineHandler)
    })
  })

  return {
    scheduleId,
    view,
    activeDate,
    currentPage,
    range,
    dates,
    rangeLabel,
    title,
    templates: draft.templates,
    rows: draft.rows,
    dirtyKeys: draft.dirtyKeys,
    conflicts: draft.conflicts,
    remoteUpdated,
    remoteVersion: computed(() => draft.latestRemote.value?.schedule.version ?? 0),
    saveVersion: draft.saveVersion,
    isLoading,
    isFetching: query.isFetching,
    loadError,
    error,
    message,
    savedAt,
    busy,
    saving: computed(() => stage.value === 'save'),
    publishing: computed(() => stage.value === 'publish'),
    offline,
    canEdit,
    canSave,
    canPublish,
    latestPublication,
    reviewOpen,
    unsavedOpen,
    defaultPublicationRange,
    retry,
    save,
    publish,
    cancelPublication,
    review,
    confirmRebase,
    requestPeriod,
    navigate,
    cancelTransition,
    discardAndContinue,
    saveAndContinue,
  }
}

<script setup lang="ts">
import type { ScheduleDate, ScheduleRow, ShiftTone } from '@schedule/domain/types'
import { getPublication } from '@schedule/api/api'
import { scheduleKeys } from '@schedule/api/query'
import { calendarDates } from '@schedule/domain/calendar'
import ScheduleGrid from '@schedule/ui/ScheduleGrid/ScheduleGrid.vue'
import { useQuery } from '@tanstack/vue-query'
import { UiButton } from '@ui'
import { computed, ref } from 'vue'

const props = defineProps<{ scheduleId: string; publicationId: string }>()
const { data, isPending, isError, error, isFetching, refetch } = useQuery({
  queryKey: computed(() => scheduleKeys.publication(props.scheduleId, props.publicationId)),
  queryFn: ({ signal }) => getPublication(props.scheduleId, props.publicationId, signal),
  enabled: computed(() => Boolean(props.scheduleId && props.publicationId)),
  staleTime: Infinity,
  retry: false,
  networkMode: 'always',
})
const errorMessage = computed(() =>
  error.value instanceof TypeError
    ? 'Не удалось загрузить публикацию. Проверьте подключение и повторите попытку.'
    : error.value?.message || 'Не удалось загрузить публикацию.',
)
const copyMessage = ref('')
const shareUrl = computed(() => {
  if (typeof window === 'undefined') return ''
  const url = new URL(window.location.href)
  url.hash = new URLSearchParams({ publication: props.publicationId }).toString()
  return url.toString()
})
const dates = computed<ScheduleDate[]>(() => {
  const range = data.value?.snapshot.range
  return range ? calendarDates(range, '') : []
})

function tone(value: string): ShiftTone {
  return value === 'morning' || value === 'day' || value === 'evening' ? value : 'custom'
}

const rows = computed<ScheduleRow[]>(() => {
  const snapshot = data.value?.snapshot
  if (!snapshot) return []
  return snapshot.employees.map((employee) => ({
    employee: {
      id: employee.id,
      name: employee.fullName,
      position: employee.positionTitle,
      avatarUrl: employee.avatarUrl,
      active: employee.isActive,
    },
    scheduledMinutes: employee.scheduledMinutes,
    cells: Object.fromEntries(
      snapshot.shifts
        .filter((shift) => shift.employeeId === employee.id)
        .map((shift) => [
          shift.workDate,
          {
            id: shift.id,
            label: shift.label,
            colorKey: tone(shift.colorKey),
            startTime: shift.startTime,
            endTime: shift.endTime,
            endDayOffset: shift.endDayOffset,
            sourceTemplateId: shift.sourceTemplateId,
            durationMinutes: shift.durationMinutes,
          },
        ]),
    ),
  }))
})
const coverage = computed(() =>
  Object.fromEntries(
    (data.value?.snapshot.coverage || []).map((item) => [item.date, item.shiftCount]),
  ),
)
const publishedAt = computed(() => {
  if (!data.value) return ''
  return new Intl.DateTimeFormat('ru', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: data.value.snapshot.schedule.timeZone,
  }).format(new Date(data.value.publishedAt))
})

async function copyLink(): Promise<void> {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copyMessage.value = 'Ссылка на публикацию скопирована.'
  } catch {
    copyMessage.value = 'Выделите и скопируйте ссылку из поля ниже.'
  }
}

function selectLink(event: FocusEvent): void {
  if (event.target instanceof HTMLInputElement) event.target.select()
}
</script>

<template>
  <section :class="$style.publication" aria-label="Опубликованный график">
    <p v-if="isPending" :class="$style.text" role="status">Загружаем опубликованный график…</p>
    <div v-else-if="isError" :class="$style.error" role="alert">
      <p :class="$style.text">{{ errorMessage }}</p>
      <UiButton :loading="isFetching" @click="refetch()">Повторить загрузку</UiButton>
    </div>
    <template v-else-if="data">
      <header :class="$style.heading">
        <h3 :class="$style.title">{{ data.snapshot.schedule.name }}</h3>
        <p :class="$style.text">Версия {{ data.sourceVersion }} · {{ publishedAt }}</p>
        <p :class="$style.text">
          {{ data.range.from }} — {{ data.range.to }} (дата окончания не включается)
        </p>
        <p :class="$style.text">
          Это зафиксированный график. Последующие изменения рабочего графика его не меняют.
        </p>
      </header>
      <div :class="$style.share">
        <UiButton color="neutral" variant="tertiary" size="compact" @click="copyLink"
          >Скопировать ссылку</UiButton
        >
        <input :value="shareUrl" readonly aria-label="Ссылка на публикацию" @focus="selectLink" />
        <p v-if="copyMessage" :class="$style.text" role="status">{{ copyMessage }}</p>
      </div>
      <ScheduleGrid
        :class="$style.grid"
        :rows="rows"
        :dates="dates"
        :view="dates.length > 7 ? 'month' : 'week'"
        :coverage-counts="coverage"
        disabled
      />
    </template>
  </section>
</template>

<style module lang="scss">
.publication {
  display: grid;
  gap: var(--figma-spacing-padding-2xl);
  min-inline-size: 0;
  .grid {
    max-block-size: 65vh;
  }
}
.heading {
  display: grid;
  gap: var(--figma-spacing-margin-m);
  .text {
    color: var(--schedule-color-label-secondary);
    font-size: var(--schedule-font-size-small);
    line-height: var(--schedule-line-height-small);
  }
}
.title,
.text {
  margin: 0;
}
.title {
  font-size: var(--schedule-font-size-body);
  font-weight: var(--schedule-font-weight-semibold);
}
.share {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--figma-spacing-margin-m);
  input {
    flex: 1 1 240px;
    min-inline-size: 0;
    min-block-size: 36px;
    padding: 8px;
    border: 1px solid var(--schedule-color-border-subtle);
    border-radius: var(--schedule-radius-control);
    background: var(--schedule-color-surface-muted);
    color: var(--schedule-color-label-primary);
    font: inherit;
    font-size: var(--schedule-font-size-caption);
  }
  input:focus-visible {
    outline: var(--schedule-focus-width) solid var(--schedule-color-focus);
    outline-offset: var(--schedule-focus-offset);
  }
  .text {
    inline-size: 100%;
    font-size: var(--schedule-font-size-small);
  }
}
.error {
  display: grid;
  justify-items: start;
  gap: var(--figma-spacing-padding-xl);
  color: var(--schedule-color-field-error);
}
</style>

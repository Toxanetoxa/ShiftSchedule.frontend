<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { getLocalTimeZone, parseDate, today } from '@internationalized/date'
import UiIcon from '@ui/UiIcon/UiIcon.vue'
import {
  DatePickerAnchor,
  DatePickerCalendar,
  DatePickerCell,
  DatePickerCellTrigger,
  DatePickerContent,
  DatePickerField,
  DatePickerGrid,
  DatePickerGridBody,
  DatePickerGridHead,
  DatePickerGridRow,
  DatePickerHeadCell,
  DatePickerHeader,
  DatePickerHeading,
  DatePickerInput,
  DatePickerNext,
  DatePickerPrev,
  DatePickerRoot,
  DatePickerTrigger,
} from 'reka-ui'
import { computed, ref, shallowRef, useId, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label: string
    hideLabel?: boolean
    id?: string
    size?: 'default' | 'compact'
    disabled?: boolean
    required?: boolean
    invalid?: boolean
    describedBy?: string
    min?: string
    max?: string
  }>(),
  { hideLabel: false, size: 'default', disabled: false, required: false, invalid: false },
)
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const generatedId = useId()
const inputId = computed(() => props.id || generatedId)
const open = ref(false)

function parse(value?: string): DateValue | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  try {
    return parseDate(value)
  } catch {
    return undefined
  }
}

const value = computed(() => parse(props.modelValue))
const minValue = computed(() => parse(props.min))
const maxValue = computed(() => parse(props.max))
const currentDate = shallowRef<DateValue>(today(getLocalTimeZone()))
const placeholder = shallowRef<DateValue>(value.value ?? currentDate.value)
const invalidValue = computed(
  () => props.invalid || Boolean(props.modelValue && (!value.value || !isAllowed(value.value))),
)
const selectedLabel = computed(() =>
  value.value
    ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).format(
        value.value.toDate(getLocalTimeZone()),
      )
    : 'Дата не выбрана',
)

function isAllowed(date: DateValue): boolean {
  return (
    (!minValue.value || date.compare(minValue.value) >= 0) &&
    (!maxValue.value || date.compare(maxValue.value) <= 0)
  )
}

function updateDate(date: DateValue | undefined): void {
  if (props.disabled || (date && !isAllowed(date))) return
  emit('update:modelValue', date?.toString() ?? '')
}

function closeAfterPick(date: DateValue): void {
  if (!props.disabled && isAllowed(date)) open.value = false
}

function chooseToday(): void {
  currentDate.value = today(getLocalTimeZone())
  if (props.disabled || !isAllowed(currentDate.value)) return
  updateDate(currentDate.value)
  open.value = false
}

watch(value, (date) => {
  if (date) placeholder.value = date
})
watch(open, (isOpen) => {
  if (!isOpen) return
  currentDate.value = today(getLocalTimeZone())
  let date = value.value ?? currentDate.value
  if (minValue.value && date.compare(minValue.value) < 0) date = minValue.value
  if (maxValue.value && date.compare(maxValue.value) > 0) date = maxValue.value
  placeholder.value = date
})
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) open.value = false
  },
)
</script>

<template>
  <div :class="$style.picker" :data-size="size">
    <label
      :id="`${inputId}-label`"
      :for="inputId"
      :class="[$style.label, { [$style.srOnly]: hideLabel }]"
      >{{ label }}</label
    >
    <DatePickerRoot
      :id="inputId"
      v-model:open="open"
      v-model:placeholder="placeholder"
      :model-value="value"
      :min-value="minValue"
      :max-value="maxValue"
      :disabled="disabled"
      :required="required"
      locale="ru-RU"
      granularity="day"
      :week-starts-on="1"
      weekday-format="short"
      fixed-weeks
      prevent-deselect
      close-on-select
      @update:model-value="updateDate"
    >
      <DatePickerAnchor>
        <DatePickerField
          v-slot="{ segments }"
          :class="$style.field"
          :aria-labelledby="`${inputId}-label`"
          :aria-describedby="describedBy"
          :aria-invalid="invalidValue || undefined"
          :data-invalid="invalidValue ? '' : undefined"
          :data-open="open || undefined"
        >
          <div :class="$style.segments">
            <template v-for="segment in segments" :key="segment.part">
              <span v-if="segment.part === 'literal'" :class="$style.literal" aria-hidden="true">{{
                segment.value
              }}</span>
              <DatePickerInput
                v-else
                :part="segment.part"
                :class="$style.segment"
                :aria-invalid="invalidValue || undefined"
                :aria-describedby="describedBy"
                >{{ segment.value }}</DatePickerInput
              >
            </template>
          </div>
          <DatePickerTrigger
            :class="$style.trigger"
            :aria-label="`Открыть календарь: ${label}`"
            type="button"
          >
            <UiIcon name="calendar" :size="18" />
          </DatePickerTrigger>
        </DatePickerField>
      </DatePickerAnchor>
      <DatePickerContent
        :class="$style.content"
        :aria-label="`Календарь: ${label}`"
        align="start"
        :side-offset="8"
        :collision-padding="12"
      >
        <DatePickerCalendar v-slot="{ grid, weekDays }" :calendar-label="label">
          <DatePickerHeader :class="$style.header">
            <DatePickerHeading :class="$style.heading" />
            <div :class="$style.navigation">
              <DatePickerPrev :class="$style.navButton" aria-label="Предыдущий месяц" type="button">
                <UiIcon name="chevron-left" :size="18" />
              </DatePickerPrev>
              <DatePickerNext :class="$style.navButton" aria-label="Следующий месяц" type="button">
                <UiIcon name="chevron-right" :size="18" />
              </DatePickerNext>
            </div>
          </DatePickerHeader>
          <DatePickerGrid v-for="month in grid" :key="month.value.toString()" :class="$style.grid">
            <DatePickerGridHead>
              <DatePickerGridRow>
                <DatePickerHeadCell v-for="day in weekDays" :key="day" :class="$style.weekday">
                  {{ day }}
                </DatePickerHeadCell>
              </DatePickerGridRow>
            </DatePickerGridHead>
            <DatePickerGridBody>
              <DatePickerGridRow v-for="(week, index) in month.rows" :key="index">
                <DatePickerCell
                  v-for="day in week"
                  :key="day.toString()"
                  :date="day"
                  :class="$style.cell"
                >
                  <DatePickerCellTrigger
                    :day="day"
                    :month="month.value"
                    :class="$style.day"
                    @click="closeAfterPick(day)"
                    @keydown.enter.space="closeAfterPick(day)"
                  />
                </DatePickerCell>
              </DatePickerGridRow>
            </DatePickerGridBody>
          </DatePickerGrid>
        </DatePickerCalendar>
        <div :class="$style.footer">
          <button
            type="button"
            :class="$style.today"
            :disabled="disabled || !isAllowed(currentDate)"
            @click="chooseToday"
          >
            Сегодня
          </button>
          <span :class="$style.selection">{{ selectedLabel }}</span>
        </div>
      </DatePickerContent>
    </DatePickerRoot>
  </div>
</template>

<style module lang="scss">
.picker {
  display: grid;
  min-inline-size: 0;
  gap: 8px;
  font-family: var(--schedule-font-family), system-ui, sans-serif;

  &[data-size='compact'] .field {
    min-block-size: var(--schedule-button-compact-min-height);
    padding: 2px 4px 2px 10px;
    font-size: var(--schedule-font-size-small);
  }
}
.label {
  color: var(--schedule-color-label-secondary);
  font-size: var(--schedule-font-size-small);
  line-height: var(--schedule-line-height-small);
}
.field {
  display: flex;
  align-items: center;
  gap: 12px;
  min-block-size: var(--schedule-button-min-height);
  padding: 6px 8px 6px 12px;
  border: 1px solid var(--schedule-color-border-subtle);
  border-radius: var(--schedule-radius-control);
  background: var(--schedule-color-surface-primary);
  color: var(--schedule-color-label-primary);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;

  &:hover:not([data-disabled]) {
    border-color: var(--schedule-color-border-base);
  }
  &:focus-within,
  &[data-open] {
    border-color: var(--schedule-color-brand-action);
    box-shadow: 0 0 0 3px var(--figma-button-brand-secondary-background-default);
  }
  &[data-invalid] {
    border-color: var(--schedule-color-field-error);
  }
  &[data-disabled] {
    opacity: 0.5;
    background: var(--schedule-color-surface-muted);
  }
}
.segments {
  display: flex;
  align-items: center;
  flex: 1;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.segment {
  padding: 2px;
  border-radius: 4px;
  outline: none;
  caret-color: transparent;

  &[data-placeholder] {
    color: var(--schedule-color-label-secondary);
  }
  &:focus {
    color: var(--figma-button-brand-secondary-text-default);
    background: var(--figma-button-brand-secondary-background-default);
  }
}
.literal {
  color: var(--schedule-color-label-secondary);
}
.trigger,
.navButton,
.today {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-block-size: 32px;
  border: 0;
  border-radius: var(--schedule-radius-control);
  padding: 6px;
  background: transparent;
  color: var(--schedule-color-label-secondary);
  font: inherit;
  cursor: pointer;
  transition:
    background 160ms ease,
    color 160ms ease;

  &:hover:not(:disabled) {
    color: var(--schedule-color-label-primary);
    background: var(--schedule-color-surface-muted);
  }
  &:focus-visible {
    outline: var(--schedule-focus-width) solid var(--schedule-color-focus);
    outline-offset: var(--schedule-focus-offset);
  }
  &:disabled {
    cursor: default;
  }
}
.content {
  z-index: calc(var(--schedule-z-dialog) + 2);
  inline-size: 320px;
  max-inline-size: min(calc(100vw - 24px), var(--reka-popover-content-available-width));
  max-block-size: var(--reka-popover-content-available-height);
  overflow: auto;
  padding: 16px;
  border: 1px solid var(--schedule-color-border-subtle);
  border-radius: var(--schedule-radius-panel);
  background: var(--schedule-color-surface-primary);
  color: var(--schedule-color-label-primary);
  box-shadow:
    0 12px 40px rgb(16 24 40 / 0.12),
    0 2px 8px rgb(16 24 40 / 0.04);
  font-family: var(--schedule-font-family), system-ui, sans-serif;
  transform-origin: var(--reka-popover-content-transform-origin);

  &[data-state='open'] {
    animation: appear 160ms ease-out;
  }
  &[data-state='closed'] {
    animation: disappear 120ms ease-in;
  }
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-block-end: 12px;
}
.heading {
  font-size: var(--schedule-font-size-body);
  line-height: var(--schedule-line-height-body);
  font-weight: var(--schedule-font-weight-semibold);
  &::first-letter {
    text-transform: uppercase;
  }
}
.navigation {
  display: flex;
  gap: 4px;
}
.navButton {
  inline-size: 32px;
  &[data-disabled] {
    opacity: 0.35;
  }
}
.grid {
  inline-size: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.weekday {
  block-size: 32px;
  padding: 0;
  color: var(--schedule-color-label-secondary);
  font-size: var(--schedule-font-size-caption);
  font-weight: var(--schedule-font-weight-regular);
  text-transform: capitalize;
}
.cell {
  padding: 2px;
}
.day {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-block-size: 36px;
  border-radius: var(--schedule-radius-control);
  font-size: var(--schedule-font-size-small);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    background 140ms ease,
    color 140ms ease;

  &:hover:not([data-disabled]) {
    background: var(--schedule-color-surface-muted);
  }
  &[data-outside-view] {
    color: var(--schedule-color-label-secondary);
    opacity: 0.5;
  }
  &[data-today]::after {
    content: '';
    position: absolute;
    inset-block-end: 4px;
    inline-size: 4px;
    block-size: 4px;
    border-radius: 50%;
    background: currentColor;
  }
  &[data-selected] {
    color: var(--schedule-color-label-inverted);
    background: var(--schedule-color-brand-action);
    opacity: 1;
    &:hover {
      background: var(--figma-button-brand-primary-background-hover);
    }
  }
  &[data-disabled] {
    opacity: 0.3;
    cursor: default;
  }
  &:focus-visible {
    outline: var(--schedule-focus-width) solid var(--schedule-color-focus);
    outline-offset: 1px;
  }
}
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-block-start: 12px;
  padding-block-start: 12px;
  border-block-start: 1px solid var(--schedule-color-border-subtle);
}
.today {
  padding-inline: 10px;
  color: var(--figma-button-brand-secondary-text-default);
  font-size: var(--schedule-font-size-small);
  &:hover:not(:disabled) {
    color: var(--figma-button-brand-secondary-text-default);
    background: var(--figma-button-brand-secondary-background-default);
  }
  &:disabled {
    opacity: 0.4;
  }
}
.selection {
  color: var(--schedule-color-label-secondary);
  font-size: var(--schedule-font-size-caption);
  white-space: nowrap;
}
.srOnly {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
@keyframes appear {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes disappear {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .content {
    animation: none;
  }
  .field,
  .trigger,
  .navButton,
  .today,
  .day {
    transition: none;
  }
}
</style>

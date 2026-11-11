import type { Meta, StoryObj } from '@storybook/vue3-vite'

const colors = [
  { name: 'Фон страницы', token: '--schedule-color-surface-muted' },
  { name: 'Основная поверхность', token: '--schedule-color-surface-primary' },
  { name: 'Вторичная поверхность', token: '--schedule-color-surface-secondary' },
  { name: 'Основной текст', token: '--schedule-color-label-primary' },
  { name: 'Вторичный текст', token: '--schedule-color-label-secondary' },
  { name: 'Основной акцент', token: '--schedule-color-brand-action' },
  { name: 'Нейтральная рамка', token: '--schedule-color-border-subtle' },
  { name: 'Выделение', token: '--schedule-color-coverage-filled-bg' },
  { name: 'Ошибка', token: '--schedule-color-field-error' },
  { name: 'Утро', token: '--schedule-shift-morning-bg' },
  { name: 'День', token: '--schedule-shift-day-bg' },
  { name: 'Вечер', token: '--schedule-shift-evening-bg' },
]

const meta = {
  title: 'Foundations/Tokens',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Семантические токены интерфейса. Палитра использует CSS-переменные напрямую и работает без API.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Palette: Story = {
  render: () => ({
    setup: () => ({ colors }),
    template: `
            <div class="token-palette">
                <article v-for="color in colors" :key="color.token" class="token-swatch">
                    <div class="token-swatch__color" :style="{ backgroundColor: 'var(' + color.token + ')' }" aria-hidden="true"></div>
                    <div class="token-swatch__label">{{ color.name }}<code>{{ color.token }}</code></div>
                </article>
            </div>
        `,
  }),
}

export const Typography: Story = {
  render: () => ({
    template: `
            <div style="display: grid; gap: var(--figma-spacing-padding-2xl)">
                <h1>График сотрудников</h1>
                <p>Manrope · основной текст 16 / 24, weight 400</p>
                <p style="font-weight: var(--schedule-font-weight-semibold)">Полужирный текст 16 / 24, weight 600</p>
                <p style="font-size: var(--schedule-font-size-small); line-height: var(--schedule-line-height-small)">Подпись 14 / 20, weight 400</p>
                <p style="font-size: var(--schedule-font-size-caption); line-height: var(--schedule-line-height-caption)">Подпись 12 / 16, weight 400</p>
            </div>
        `,
  }),
}

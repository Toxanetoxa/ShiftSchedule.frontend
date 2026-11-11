import type { Meta, StoryObj } from '@storybook/vue3-vite'
import UiButton from './UiButton.vue'

const meta = {
  title: 'UI/UiButton',
  component: UiButton,
  tags: ['autodocs'],
  args: {
    color: 'brand',
    variant: 'primary',
    size: 'default',
    disabled: false,
    loading: false,
  },
  argTypes: {
    color: { control: 'select', options: ['brand', 'neutral'] },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'tertiary', 'quaternary', 'quinary'],
    },
    size: { control: 'select', options: ['default', 'compact'] },
    type: { control: 'select', options: ['button', 'submit', 'reset'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Восемь сочетаний: Brand primary/secondary/tertiary и пять Neutral. Brand quaternary/quinary нормализуются в tertiary. Hover и active работают через CSS, disabled — нативное состояние. Loading и focus — дополнения реализации.',
      },
    },
  },
  render: (args) => ({
    components: { UiButton },
    setup: () => ({ args }),
    template: '<UiButton v-bind="args">Сохранить</UiButton>',
  }),
} satisfies Meta<typeof UiButton>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {}
export const Secondary: Story = { args: { variant: 'secondary' } }
export const Tertiary: Story = { args: { variant: 'tertiary' } }
export const NeutralPrimary: Story = { args: { color: 'neutral' } }
export const NeutralSecondary: Story = { args: { color: 'neutral', variant: 'secondary' } }
export const NeutralTertiary: Story = { args: { color: 'neutral', variant: 'tertiary' } }
export const NeutralQuaternary: Story = { args: { color: 'neutral', variant: 'quaternary' } }
export const NeutralQuinary: Story = { args: { color: 'neutral', variant: 'quinary' } }
export const Disabled: Story = { args: { disabled: true } }
export const Loading: Story = { args: { loading: true } }
export const Compact: Story = { args: { size: 'compact' } }

export const AllVariants: Story = {
  render: () => ({
    components: { UiButton },
    template: `
            <div class="story-variants">
                <UiButton color="brand" variant="primary">Brand / Primary</UiButton>
                <UiButton color="brand" variant="secondary">Brand / Secondary</UiButton>
                <UiButton color="brand" variant="tertiary">Brand / Tertiary</UiButton>
                <UiButton color="neutral" variant="primary">Neutral / Primary</UiButton>
                <UiButton color="neutral" variant="secondary">Neutral / Secondary</UiButton>
                <UiButton color="neutral" variant="tertiary">Neutral / Tertiary</UiButton>
                <UiButton color="neutral" variant="quaternary">Neutral / Quaternary</UiButton>
                <UiButton color="neutral" variant="quinary">Neutral / Quinary</UiButton>
            </div>
        `,
  }),
}

export const DisabledVariants: Story = {
  render: () => ({
    components: { UiButton },
    template: `
            <div class="story-variants">
                <UiButton color="brand" variant="primary" disabled>Brand / Primary</UiButton>
                <UiButton color="brand" variant="secondary" disabled>Brand / Secondary</UiButton>
                <UiButton color="brand" variant="tertiary" disabled>Brand / Tertiary</UiButton>
                <UiButton color="neutral" variant="primary" disabled>Neutral / Primary</UiButton>
                <UiButton color="neutral" variant="secondary" disabled>Neutral / Secondary</UiButton>
                <UiButton color="neutral" variant="tertiary" disabled>Neutral / Tertiary</UiButton>
                <UiButton color="neutral" variant="quaternary" disabled>Neutral / Quaternary</UiButton>
                <UiButton color="neutral" variant="quinary" disabled>Neutral / Quinary</UiButton>
            </div>
        `,
  }),
}

export const IconOnly: Story = {
  args: { iconOnly: true, ariaLabel: 'Добавить', variant: 'secondary' },
  render: (args) => ({
    components: { UiButton },
    setup: () => ({ args }),
    template: `
            <UiButton v-bind="args">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
            </UiButton>
        `,
  }),
}

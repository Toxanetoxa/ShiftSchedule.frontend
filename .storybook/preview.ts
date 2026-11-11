import type { Preview } from '@storybook/vue3-vite'
import { setup } from '@storybook/vue3-vite'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createQueryClient } from '@/app/queryClient'
import '@/app/styles.css'

setup((app) => {
  app.use(VueQueryPlugin, { queryClient: createQueryClient() })
})

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: {
      expanded: true,
    },
    a11y: {
      test: 'error',
    },
  },
}

export default preview

import { VueQueryPlugin } from '@tanstack/vue-query'
import { createApp } from 'vue'
import { createQueryClient } from '@/app/queryClient'
import App from './App.vue'
import '@/app/styles.css'

createApp(App).use(VueQueryPlugin, { queryClient: createQueryClient() }).mount('#app')

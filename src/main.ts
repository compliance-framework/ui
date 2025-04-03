import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import CatalogGroup from '@/views/CatalogGroup.vue'
import CatalogControl from '@/views/CatalogControl.vue'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// This is a recursive component so should be registered globally
app.component('CatalogGroup', CatalogGroup)
app.component('CatalogControl', CatalogControl)

app.mount('#app')

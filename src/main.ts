import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from './App.vue'
import router from './router'
import CatalogGroup from '@/views/CatalogGroup.vue'
import CatalogControl from '@/views/CatalogControl.vue'

import PrimeVue from 'primevue/config';

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.use(PrimeVue, {
  unstyled: true
});

// This is a recursive component so should be registered globally
app.component('CatalogGroup', CatalogGroup)
app.component('CatalogControl', CatalogControl)

app.mount('#app')

import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from './App.vue'
import router from './router'
import CatalogGroup from '@/views/catalog/CatalogGroup.vue'
import CatalogControl from '@/views/catalog/CatalogControl.vue'

import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';
import TooltipPt from '@/volt/Tooltip';
import PrimaryButton from '@/volt/PrimaryButton.vue'
import SecondaryButton from '@/volt/SecondaryButton.vue'

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.use(PrimeVue, {
  unstyled: true,
  pt: {
    ...TooltipPt
  }
});
app.use(ConfirmationService);
app.directive('tooltip', Tooltip);
app.component('PrimaryButton', PrimaryButton)
app.component('SecondaryButton', SecondaryButton)

// This is a recursive component so should be registered globally
app.component('CatalogGroup', CatalogGroup)
app.component('CatalogControl', CatalogControl)

app.use(ToastService);

app.mount('#app')

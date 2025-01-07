import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Config {
  API_URL: string
}

export const useConfigStore = defineStore('config', () => {
  const config = ref<Config>()

  async function getConfig(): Promise<Config> {
    if (config.value) {
      return config.value
    }

    const response = await fetch(window.location.origin + import.meta.env.BASE_URL + '/config.json')
    config.value = (await response.json()) as Config
    return config.value
  }

  return { getConfig }
})

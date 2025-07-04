import { defineStore } from 'pinia'
import { ref } from 'vue'
import builtInConfig from '../defaultconfig.json'

export interface Config {
  API_URL: string
}

export const useConfigStore = defineStore('config', () => {
  const config = ref<Config>()
  const showLabels = ref<boolean>(true);

  async function getConfig(): Promise<Config> {
    if (config.value) {
      return config.value
    }

    const response = await fetch(window.location.origin + import.meta.env.BASE_URL + '/config.json')
    let returnedConfig = {} as Config
    if (response.ok) {
      try {
        returnedConfig = (await response.json()) as Config
      } catch (e: unknown) {
        if (e instanceof SyntaxError) {
          console.error('Unable to read the configuration response. Reverting to builin config.');
        } else {
          throw e
        }
      }
    }
    config.value = {
      ...builtInConfig,
      ...returnedConfig,
    }
    return config.value
  }

  function toggleLabels() {
    showLabels.value = !showLabels.value
  }

  return { showLabels, toggleLabels, getConfig }
})

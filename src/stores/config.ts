import { defineStore } from 'pinia'

export const useConfigStore = defineStore('config', {
  state: () => ({
    config: {},
  }),
  actions: {
    async getConfig() {
      if (this.config.value) {
        return this.config.value;
      }

      const response = await fetch(window.location.origin + import.meta.env.BASE_URL + '/config.json');
      this.config.value = await response.json()
      return this.config.value;
    },
  },
});

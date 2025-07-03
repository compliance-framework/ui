import { defineStore } from 'pinia'
import { useConfigStore } from '@/stores/config.ts'
import { type Filter } from '@/parsers/labelfilter.ts'
import type { DataResponse } from '@/stores/types.ts'

export interface Dashboard {
  id?: string
  uuid?: string
  name: string
  filter: Filter
}

export const useDashboardStore = defineStore('dashboards', () => {
  const configStore = useConfigStore()

  async function get(id: string): Promise<DataResponse<Dashboard>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/dashboards/${id}`)
    return (await response.json()) as DataResponse<Dashboard>
  }

  async function list(): Promise<DataResponse<Dashboard[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/dashboards`)
    return (await response.json()) as DataResponse<Dashboard[]>
  }

  async function create(plan: Dashboard): Promise<Dashboard> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/dashboards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(plan),
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }

    const data = (await response.json()) as DataResponse<Dashboard>
    return data.data as Dashboard
  }

  async function destroy(id: string): Promise<void> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/dashboards/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }

    return
  }

  return {
    get,
    list,
    create,
    destroy,
  }
})

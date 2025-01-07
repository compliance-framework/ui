import { defineStore } from 'pinia'
import { useConfigStore } from '@/stores/config.ts'

export interface Plan {
  _id: string
  id: string
  title: string
  status: string
}

export interface Observation {
  id: string
  title: string
  description: string
}

export interface Finding {
  id: string
  title: string
  description: string
  remarks: string
}

export interface Log {
  title: string
  description: string
}

export interface Result {
  _id: string
  id: string
  title: string
  start: string
  end: string
  streamId: string
  observations: Observation[]
  findings: Finding[]
  assessmentLogEntries: Log[]
}

export interface DataResponse<T> {
  data: T
}

export const useApiStore = defineStore('api', () => {
  const configStore = useConfigStore()

  async function createPlan(plan: Plan): Promise<Plan> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(plan),
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }

    const data = (await response.json()) as Plan
    return {
      ...plan,
      ...data,
    } as Plan
  }

  async function getPlan(id: string): Promise<Plan> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/plan/${id}`)
    return (await response.json()) as Plan
  }

  async function getPlans(): Promise<Plan[]> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/plans`)
    return (await response.json()) as Plan[]
  }

  async function getResult(id: string): Promise<DataResponse<Result>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/results/${id}`)
    return (await response.json()) as DataResponse<Result>
  }

  async function getPlanResults(id: string): Promise<DataResponse<Result[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/results/plan/${id}`)
    return (await response.json()) as DataResponse<Result[]>
  }

  async function getStreamResults(streamId: string): Promise<DataResponse<Result[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/results/stream/${streamId}`)
    return (await response.json()) as DataResponse<Result[]>
  }

  return {
    getPlan,
    getPlans,
    createPlan,
    getResult,
    getPlanResults,
    getStreamResults,
  }
})

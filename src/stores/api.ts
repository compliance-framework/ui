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

export interface Result {
  _id: string
  id: string
  title: string
  start: string
  end: string
  streamId: string
  observations: Observation[]
  findings: Finding[]
}

export interface DataResponse<T> {
  data: T
}

export const useApiStore = defineStore('api', () => {
  const configStore = useConfigStore()

  async function createPlan(plan: Plan): Promise<Plan> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(plan),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const data = await response.json() as Plan;
    return {
      ...plan,
      ...data,
    } as Plan;
  }

  async function getPlan(id: string): Promise<Plan> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/plan/${id}`)
    const plan: Plan = await response.json()
    return plan
  }

  async function getPlans(): Promise<Plan[]> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/plans`)
    return await response.json() as Plan[]
  }

  async function getPlanResults(id: string): Promise<DataResponse<Result[]>> {
    const config = await configStore.getConfig()
    return fetch(`${config.API_URL}/api/results/plan/${id}`).then((response) => {
      return response.json()
    })
  }

  return {
    getPlan,
    getPlanResults,
    createPlan,
    getPlans,
  }
})

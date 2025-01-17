import { defineStore } from 'pinia'
import { useConfigStore } from '@/stores/config.ts'
import { type Filter } from '@/parsers/labelfilter.ts'

export interface Plan {
  _id: string
  id: string
  title: string
  status: string
  filter: Filter
}

export interface Observation {
  id: string
  title: string
  description: string
}

export interface Activity {
  id: string
  title: string
  description: string
}

export interface Task {
  id: string
  title: string
  description: string
  activities: Activity[]
}

export interface Finding {
  id: string
  title: string
  description: string
  remarks: string
  tasks: Task[]
  status?: string
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
  labels: LabelMap,
}

export interface LabelMap {
  [label: string]: string
}

export interface ComplianceBySearchResultRecord {
  title: string
  interval: string
  findings: number
  observations: number
  hasRecords: boolean
}

export interface ComplianceBySearchResult {
  id: string
  records: ComplianceBySearchResultRecord[]
}

export interface DataResponse<T> {
  data: T
}

export const useApiStore = defineStore('api', () => {
  const configStore = useConfigStore()

  async function createPlan(plan: Plan, filter: Filter): Promise<Plan> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...plan,
        filter,
      }),
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }

    const data = (await response.json()) as DataResponse<Plan>
    const planData = data.data as Plan
    return {
      ...plan,
      ...planData,
    } as Plan
  }

  async function getPlan(id: string): Promise<DataResponse<Plan>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/plan/${id}`)
    return (await response.json()) as DataResponse<Plan>
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

  async function searchResults(filter: Filter): Promise<DataResponse<Result[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/results/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "filter": filter,
      }),
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }

    return (await response.json()) as DataResponse<Result[]>
  }

  async function getComplianceForSearch(filter: Filter): Promise<DataResponse<ComplianceBySearchResult[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/results/compliance-by-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "filter": filter,
      }),
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }

    return (await response.json()) as DataResponse<ComplianceBySearchResult[]>
  }

  async function getComplianceForStream(stream: string): Promise<DataResponse<ComplianceBySearchResult[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/results/compliance-by-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "streamId": stream,
      }),
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }

    return (await response.json()) as DataResponse<ComplianceBySearchResult[]>
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
    searchResults,
    getComplianceForSearch,
    getComplianceForStream,
    getPlanResults,
    getStreamResults,
  }
})

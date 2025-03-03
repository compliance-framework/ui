import { defineStore } from 'pinia'
import { useConfigStore } from '@/stores/config.ts'
import { type Filter } from '@/parsers/labelfilter.ts'

export interface Metadata {
  title: string
}

export interface Plan {
  uuid: string
  metadata: Metadata
  resultFilter: Filter
}

export interface Observation {
  uuid: string
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

export interface FindingTargetImplementationStatus {
  remarks: string
  state: string
}

export interface FindingTargetStatus {
  reason: string
  remarks: string
  state: string
}

export interface FindingTarget {
  type: string
  title: string
  status: FindingTargetStatus
  implementationStatus: FindingTargetImplementationStatus
}

export interface Finding {
  uuid: string
  title: string
  description: string
  remarks: string
  tasks: Task[]
  target: FindingTarget
}

export interface Log {
  title: string
  description: string
}

export interface Result {
  uuid: string
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
  findings_pass: number
  findings_fail: number
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
    const response = await fetch(`${config.API_URL}/api/assessment-plans`, {
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
    const response = await fetch(`${config.API_URL}/api/assessment-plans/${id}`)
    return (await response.json()) as DataResponse<Plan>
  }

  async function getPlans(): Promise<DataResponse<Plan[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/assessment-plans`)
    return (await response.json()) as DataResponse<Plan[]>
  }

  async function getResult(id: string): Promise<DataResponse<Result>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/assessment-results/${id}`)
    return (await response.json()) as DataResponse<Result>
  }

  async function searchResults(filter: Filter): Promise<DataResponse<Result[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/assessment-results/search`, {
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
    const response = await fetch(`${config.API_URL}/api/assessment-results/compliance-by-search`, {
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
    const response = await fetch(`${config.API_URL}/api/assessment-results/compliance-by-stream`, {
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
    const response = await fetch(`${config.API_URL}/api/assessment-results/plan/${id}`)
    return (await response.json()) as DataResponse<Result[]>
  }

  async function getStreamResults(streamId: string): Promise<DataResponse<Result[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/assessment-results/stream/${streamId}`)
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

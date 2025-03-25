import { defineStore } from 'pinia'
import { useConfigStore } from '@/stores/config.ts'
import { type Filter } from '@/parsers/labelfilter.ts'
import type { ControlReference, FindingStatus, Link, Origin, Property, RiskReference } from '@/stores/types.ts'

export interface Finding {
  _id?: string;
  uuid: string;
  title: string;
  description: string;
  collected: string; // ISO 8601
  remarks?: string;
  labels: Record<string, string>;
  origins?: Origin[];
  subjects?: string[];
  components?: string[];
  observations?: string[];
  controls?: ControlReference[];
  risks?: RiskReference[];
  status: FindingStatus;
  links?: Link[];
  props?: Property[];
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

export const useFindingsStore = defineStore('findings', () => {
  const configStore = useConfigStore()

  // async function getResult(id: string): Promise<DataResponse<Result>> {
  //   const config = await configStore.getConfig()
  //   const response = await fetch(`${config.API_URL}/api/assessment-results/${id}`)
  //   return (await response.json()) as DataResponse<Result>
  // }

  async function searchFindings(filter: Filter): Promise<DataResponse<Finding[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/findings/search`, {
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

    return (await response.json()) as DataResponse<Finding[]>
  }

  // async function getComplianceForSearch(filter: Filter): Promise<DataResponse<ComplianceBySearchResult[]>> {
  //   const config = await configStore.getConfig()
  //   const response = await fetch(`${config.API_URL}/api/assessment-results/compliance-by-search`, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({
  //       "filter": filter,
  //     }),
  //   })
  //
  //   if (!response.ok) {
  //     throw new Error(`Error: ${response.statusText}`)
  //   }
  //
  //   return (await response.json()) as DataResponse<ComplianceBySearchResult[]>
  // }
  //
  // async function getComplianceForStream(stream: string): Promise<DataResponse<ComplianceBySearchResult[]>> {
  //   const config = await configStore.getConfig()
  //   const response = await fetch(`${config.API_URL}/api/assessment-results/compliance-by-stream`, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({
  //       "streamId": stream,
  //     }),
  //   })
  //
  //   if (!response.ok) {
  //     throw new Error(`Error: ${response.statusText}`)
  //   }
  //
  //   return (await response.json()) as DataResponse<ComplianceBySearchResult[]>
  // }
  //
  // async function getStreamResults(streamId: string): Promise<DataResponse<Result[]>> {
  //   const config = await configStore.getConfig()
  //   const response = await fetch(`${config.API_URL}/api/assessment-results/stream/${streamId}`)
  //   return (await response.json()) as DataResponse<Result[]>
  // }

  return {
    // getResult,
    searchFindings: searchFindings,
    // getComplianceForSearch,
    // getComplianceForStream,
    // getStreamResults,
  }
})

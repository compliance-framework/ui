import { defineStore } from 'pinia';
import { useConfigStore } from '@/stores/config.ts';
import { type Filter } from '@/parsers/labelfilter.ts';
import type {
  ControlReference, DataResponse,
  FindingStatus,
  Link,
  Origin,
  Property,
  RiskReference
} from '@/stores/types.ts'

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

export interface ComplianceIntervalStatus {
  status: string;
  count: number;
}

export interface ComplianceInterval {
  interval: string;
  statuses: ComplianceIntervalStatus[];
}

export interface FindingBySubject {
  subject: string;
  findings: Finding[];
}

export interface FindingsByClassName {
  controlid: string;
  findings: Finding[];
}

export const useFindingsStore = defineStore('findings', () => {
  const configStore = useConfigStore();

  async function get(id: string): Promise<DataResponse<Finding>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/findings/${id}`);
    return (await response.json()) as DataResponse<Finding>;
  }

  async function search(filter: Filter): Promise<DataResponse<Finding[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/findings/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: filter,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return (await response.json()) as DataResponse<Finding[]>;
  }

  async function searchBySubject(filter: Filter): Promise<DataResponse<FindingBySubject[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/findings/search-by-subject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: filter,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return (await response.json()) as DataResponse<FindingBySubject[]>;
  }

  async function getByControlClass(className: string): Promise<DataResponse<FindingsByClassName[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/findings/by-control/${className}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return (await response.json()) as DataResponse<FindingsByClassName[]>;
  }

  async function history(uuid: string): Promise<DataResponse<Finding[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/findings/history/${uuid}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return (await response.json()) as DataResponse<Finding[]>;
  }

  async function getComplianceForSearch(
    filter: Filter,
  ): Promise<DataResponse<ComplianceInterval[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/findings/compliance-by-search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: filter,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return (await response.json()) as DataResponse<ComplianceInterval[]>;
  }

  async function getComplianceForUUID(
    uuid: string,
  ): Promise<DataResponse<ComplianceInterval[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/findings/compliance-by-uuid/${uuid}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return (await response.json()) as DataResponse<ComplianceInterval[]>;
  }

  async function getAllControlClasses(): Promise<DataResponse<string[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/findings/list-control-classes`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return (await response.json()) as DataResponse<string[]>;
  }

  // async function getStreamResults(streamId: string): Promise<DataResponse<Result[]>> {
  //   const config = await configStore.getConfig()
  //   const response = await fetch(`${config.API_URL}/api/assessment-results/stream/${streamId}`)
  //   return (await response.json()) as DataResponse<Result[]>
  // }

  return {
    get: get,
    search: search,
    searchBySubject,
    history: history,
    getComplianceForSearch,
    getComplianceForUUID,
    getByControlClass,
    getAllControlClasses,
  };
});

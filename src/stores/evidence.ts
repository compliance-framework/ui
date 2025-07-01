import { defineStore } from 'pinia';
import { useConfigStore } from '@/stores/config.ts';
import { type Filter } from '@/parsers/labelfilter.ts';
import type {
  Activity,
  DataResponse,
  Link,
  Property
} from '@/stores/types.ts'

export interface EvidenceStatus {
  reason: string
  state: string
}

export interface EvidenceLabel {
  name: string
  value: string
}

export interface Evidence {
  id: string
  uuid: string
  title: string
  description?: string
  labels: EvidenceLabel[]
  start: string; // ISO 8601
  end: string; // ISO 8601
  links?: Link[];
  props?: Property[];
  status: EvidenceStatus
  activities: Activity[]
}

export interface ComplianceIntervalStatus {
  status: string;
  count: number;
}

export interface ComplianceInterval {
  interval: string;
  statuses: ComplianceIntervalStatus[];
}

// export interface FindingBySubject {
//   subject: string;
//   findings: Evidence[];
// }
//
// export interface FindingsByClassName {
//   controlid: string;
//   findings: Evidence[];
// }

export const useEvidenceStore = defineStore('evidence', () => {
  const configStore = useConfigStore();

  async function get(id: string): Promise<DataResponse<Evidence>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/evidence/${id}`);
    return (await response.json()) as DataResponse<Evidence>;
  }

  async function search(filter: Filter): Promise<DataResponse<Evidence[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/evidence/search`, {
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

    return (await response.json()) as DataResponse<Evidence[]>;
  }

  // async function searchForControlID(_class: string, id: string): Promise<DataResponse<Finding[]>> {
  //   const config = await configStore.getConfig();
  //   const response = await fetch(`${config.API_URL}/api/findings/by-control/${_class}/${id}`);
  //
  //   if (!response.ok) {
  //     throw new Error(`Error: ${response.statusText}`);
  //   }
  //
  //   return (await response.json()) as DataResponse<Finding[]>;
  // }
  //
  // async function searchBySubject(
  //   filter: Filter,
  // ): Promise<DataResponse<FindingBySubject[]>> {
  //   const config = await configStore.getConfig();
  //   const response = await fetch(
  //     `${config.API_URL}/api/findings/search-by-subject`,
  //     {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         filter: filter,
  //       }),
  //     },
  //   );
  //
  //   if (!response.ok) {
  //     throw new Error(`Error: ${response.statusText}`);
  //   }
  //
  //   return (await response.json()) as DataResponse<FindingBySubject[]>;
  // }
  //
  // async function getByControlClass(
  //   className: string,
  // ): Promise<DataResponse<FindingsByClassName[]>> {
  //   const config = await configStore.getConfig();
  //   const response = await fetch(
  //     `${config.API_URL}/api/findings/by-control/${className}`,
  //     {
  //       method: 'GET',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //     },
  //   );
  //
  //   if (!response.ok) {
  //     throw new Error(`Error: ${response.statusText}`);
  //   }
  //
  //   return (await response.json()) as DataResponse<FindingsByClassName[]>;
  // }
  //
  // async function history(uuid: string): Promise<DataResponse<Finding[]>> {
  //   const config = await configStore.getConfig();
  //   const response = await fetch(
  //     `${config.API_URL}/api/findings/history/${uuid}`,
  //     {
  //       method: 'GET',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //     },
  //   );
  //
  //   if (!response.ok) {
  //     throw new Error(`Error: ${response.statusText}`);
  //   }
  //
  //   return (await response.json()) as DataResponse<Finding[]>;
  // }
  //
  // async function getComplianceForSearch(
  //   filter: Filter,
  // ): Promise<DataResponse<ComplianceInterval[]>> {
  //   const config = await configStore.getConfig();
  //   const response = await fetch(
  //     `${config.API_URL}/api/findings/compliance-by-search`,
  //     {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         filter: filter,
  //       }),
  //     },
  //   );
  //
  //   if (!response.ok) {
  //     throw new Error(`Error: ${response.statusText}`);
  //   }
  //
  //   return (await response.json()) as DataResponse<ComplianceInterval[]>;
  // }
  //
  // async function getComplianceForUUID(
  //   uuid: string,
  // ): Promise<DataResponse<ComplianceInterval[]>> {
  //   const config = await configStore.getConfig();
  //   const response = await fetch(
  //     `${config.API_URL}/api/findings/compliance-by-uuid/${uuid}`,
  //     {
  //       method: 'GET',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //     },
  //   );
  //
  //   if (!response.ok) {
  //     throw new Error(`Error: ${response.statusText}`);
  //   }
  //
  //   return (await response.json()) as DataResponse<ComplianceInterval[]>;
  // }
  //
  // async function getComplianceForControl(
  //   _class: string,
  //   id: string,
  // ): Promise<DataResponse<ComplianceIntervalStatus[]>> {
  //   const config = await configStore.getConfig();
  //   const response = await fetch(
  //     `${config.API_URL}/api/findings/instant-compliance-by-control/${_class}/${id}`,
  //     {
  //       method: 'GET',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //     },
  //   );
  //
  //   if (!response.ok) {
  //     throw new Error(`Error: ${response.statusText}`);
  //   }
  //   return (await response.json()) as DataResponse<ComplianceIntervalStatus[]>;
  // }
  //
  // async function getAllControlClasses(): Promise<DataResponse<string[]>> {
  //   const config = await configStore.getConfig();
  //   const response = await fetch(
  //     `${config.API_URL}/api/findings/list-control-classes`,
  //     {
  //       method: 'GET',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //     },
  //   );
  //
  //   if (!response.ok) {
  //     throw new Error(`Error: ${response.statusText}`);
  //   }
  //   return (await response.json()) as DataResponse<string[]>;
  // }

  return {
    get: get,
    search: search,
    // searchBySubject,
    // history: history,
    // getComplianceForSearch,
    // getComplianceForUUID,
    // getByControlClass,
    // getAllControlClasses,
    // getComplianceForControl,
    // searchForControlID,
  };
});

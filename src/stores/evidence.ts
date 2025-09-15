import camelcaseKeys from 'camelcase-keys';
import decamelizeKeys from 'decamelize-keys';
import { defineStore } from 'pinia';
import { useConfigStore } from '@/stores/config.ts';
import { type Filter } from '@/parsers/labelfilter.ts';
import type { Activity } from '@/oscal';
import type { DataResponse, Link, Property } from '@/stores/types.ts';
import type { Control } from '@/oscal';
import type { BackMatter } from '@/oscal';

export interface EvidenceStatus {
  reason: string;
  state: string;
}

export interface EvidenceLabel {
  name: string;
  value: string;
}

export interface Evidence {
  id: string;
  uuid: string;
  title: string;
  description?: string;
  labels: EvidenceLabel[];
  start: string; // ISO 8601
  end: string; // ISO 8601
  links?: Link[];
  props?: Property[];
  backMatter?: BackMatter;
  status: EvidenceStatus;
  activities: Activity[];
}

export interface FlatLabelEvidence extends Omit<Evidence, 'labels'> {
  labels: Record<string, string>;
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

interface ForControlMetadata {
  control: Control;
}

export interface ForControlResponse extends DataResponse<Evidence[]> {
  metadata: ForControlMetadata;
}

export const useEvidenceStore = defineStore('evidence', () => {
  const configStore = useConfigStore();

  async function get(id: string): Promise<DataResponse<Evidence>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/evidence/${id}`, {
      credentials: 'include',
    });
    const responseJson = await response.json();
    return camelcaseKeys(responseJson, {
      deep: true,
    }) as DataResponse<Evidence>;
  }

  async function getForControl(controlId: string): Promise<ForControlResponse> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/evidence/for-control/${controlId}`,
      {
        credentials: 'include',
      },
    );
    return (await response.json()) as ForControlResponse;
  }

  async function search(filter: Filter): Promise<DataResponse<Evidence[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/evidence/search`, {
      method: 'POST',
      credentials: 'include',
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

  async function create(
    evidence: Partial<FlatLabelEvidence>,
  ): Promise<DataResponse<Evidence>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/evidence`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        decamelizeKeys(evidence, {
          separator: '-',
          deep: true,
        }),
      ),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return (await response.json()) as DataResponse<Evidence>;
  }

  async function history(uuid: string): Promise<DataResponse<Evidence[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/evidence/history/${uuid}`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return (await response.json()) as DataResponse<Evidence[]>;
  }

  async function getComplianceForSearch(
    filter: Filter,
    intervals: string | null = null,
  ): Promise<DataResponse<ComplianceInterval[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/evidence/status-over-time?` +
        new URLSearchParams({
          intervals: intervals ?? '',
        }),
      {
        method: 'POST',
        credentials: 'include',
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
    intervals: string | null = null,
  ): Promise<DataResponse<ComplianceInterval[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/evidence/status-over-time/${uuid}?` +
        new URLSearchParams({
          intervals: intervals ?? '',
        }),
      {
        method: 'GET',
        credentials: 'include',
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

  async function getComplianceForControl(
    control: Control,
  ): Promise<DataResponse<ComplianceIntervalStatus[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/evidence/compliance-by-control/${control.id}`,
      {
        credentials: 'include',
      },
    );
    return (await response.json()) as DataResponse<ComplianceIntervalStatus[]>;
  }

  return {
    get,
    getForControl,
    search,
    create,
    history,
    getComplianceForSearch,
    getComplianceForUUID,
    getComplianceForControl,
  };
});

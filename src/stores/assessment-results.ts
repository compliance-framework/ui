import { defineStore } from 'pinia';
import { useConfigStore } from '@/stores/config';
import type {
  DataResponse,
  Metadata,
  Property,
  Link,
  Actor,
  Origin,
} from '@/stores/types';
import camelcaseKeys from 'camelcase-keys';
import decamelizeKeys from 'decamelize-keys';

export interface ImportAp {
  href: string;
  remarks?: string;
}

export interface LocalDefinitions {
  components?: any[];
  inventoryItems?: any[];
  assessmentAssets?: any;
  remarks?: string;
}

export interface SubjectReference {
  subjectUuid: string;
  type: string;
  title?: string;
  props?: Property[];
  links?: Link[];
  remarks?: string;
}

export interface SelectObjectiveForAssessment {
  includes?: string[];
  excludes?: string[];
}

export interface ReviewedControls {
  controlSelections: {
    includeAll?: any;
    includeControls?: {
      controlId: string;
      statementIds?: string[];
    }[];
    excludeControls?: {
      controlId: string;
      statementIds?: string[];
    }[];
  }[];
  props?: Property[];
  links?: Link[];
  remarks?: string;
}

export interface ObservationMethod {
  value: string;
}

export interface Observation {
  uuid: string;
  title?: string;
  description: string;
  methods: ObservationMethod[];
  types?: string[];
  origins?: Origin[];
  props?: Property[];
  links?: Link[];
  subjects?: SubjectReference[];
  relevantEvidence?: {
    href?: string;
    description?: string;
    props?: Property[];
    links?: Link[];
    remarks?: string;
  }[];
  collected: string;
  expires?: string;
  remarks?: string;
}

export interface CharacterizationStatus {
  value: string;
}

export interface CharacterizationOrigin {
  actors: Actor[];
}

export interface Characterization {
  props?: Property[];
  links?: Link[];
  origin: CharacterizationOrigin;
  facets: {
    name: string;
    system: string;
    value: string;
    props?: Property[];
    links?: Link[];
    remarks?: string;
  }[];
}

export interface MitigatingFactor {
  uuid: string;
  implementationUuid?: string;
  description: string;
  props?: Property[];
  links?: Link[];
  subjects?: SubjectReference[];
}

export interface RiskLog {
  entries: {
    uuid: string;
    title?: string;
    description?: string;
    start: string;
    end?: string;
    props?: Property[];
    links?: Link[];
    loggedBy?: Actor[];
    statusChange?: CharacterizationStatus;
    relatedResponses?: {
      responseUuid: string;
      props?: Property[];
      links?: Link[];
      relatedTasks?: {
        taskUuid: string;
        props?: Property[];
        links?: Link[];
        identifiedSubject?: SubjectReference;
        subjects?: SubjectReference[];
      }[];
      remarks?: string;
    }[];
    remarks?: string;
  }[];
}

export interface Response {
  uuid: string;
  lifecycle: string;
  title: string;
  description: string;
  props?: Property[];
  links?: Link[];
  origins?: Origin[];
  requiredAssets?: {
    uuid: string;
    subjects?: SubjectReference[];
    props?: Property[];
    links?: Link[];
    remarks?: string;
  }[];
  tasks?: {
    uuid: string;
    type: string;
    title: string;
    description: string;
    props?: Property[];
    links?: Link[];
    timing?: {
      onDate?: {
        date: string;
      };
      withinDateRange?: {
        start: string;
        end: string;
      };
      atFrequency?: {
        period: number;
        unit: string;
      };
    };
    dependencies?: {
      taskUuid: string;
      remarks?: string;
    }[];
    subjects?: SubjectReference[];
    responsibleRoles?: {
      roleId: string;
      props?: Property[];
      links?: Link[];
      partyUuids?: string[];
    }[];
    remarks?: string;
  }[];
  remarks?: string;
}

export interface Risk {
  uuid: string;
  title?: string;
  description: string;
  statement?: string;
  props?: Property[];
  links?: Link[];
  status: string;
  origins?: Origin[];
  threatIds?: {
    system?: string;
    href?: string;
    id: string;
  }[];
  characterizations?: Characterization[];
  mitigatingFactors?: MitigatingFactor[];
  deadline?: string;
  remediations?: Response[];
  riskLog?: RiskLog;
  relatedObservations?: {
    observationUuid: string;
  }[];
}

export interface TargetObjectiveStatus {
  title?: string;
  description?: string;
  props?: Property[];
  links?: Link[];
  status: {
    state: string;
    reason?: string;
    remarks?: string;
  };
  implementationStatus?: {
    uuid: string;
    implementationUuid?: string;
    title?: string;
    description?: string;
    props?: Property[];
    links?: Link[];
    implementationStatus?: string;
    responsibleRoles?: {
      roleId: string;
      props?: Property[];
      links?: Link[];
      partyUuids?: string[];
    }[];
    remarks?: string;
  };
}

export interface Target {
  type: string;
  targetId: string;
  title?: string;
  description?: string;
  props?: Property[];
  links?: Link[];
  status?: TargetObjectiveStatus;
  implementationStatus?: {
    uuid: string;
    implementationUuid?: string;
    title?: string;
    description?: string;
    props?: Property[];
    links?: Link[];
    state: string;
    responsibleRoles?: {
      roleId: string;
      props?: Property[];
      links?: Link[];
      partyUuids?: string[];
    }[];
    remarks?: string;
  };
  remarks?: string;
}

export interface Finding {
  uuid: string;
  title?: string;
  description: string;
  props?: Property[];
  links?: Link[];
  origins?: Origin[];
  target: Target;
  implementationStatementUuid?: string;
  relatedObservations?: {
    observationUuid: string;
  }[];
  relatedRisks?: {
    riskUuid: string;
  }[];
  remarks?: string;
}

export interface Attestation {
  responsibleParties: {
    roleId: string;
    partyUuids: string[];
    props?: Property[];
    links?: Link[];
    remarks?: string;
  }[];
  parts: {
    id?: string;
    name: string;
    ns?: string;
    class?: string;
    title?: string;
    props?: Property[];
    prose?: string;
    parts?: any[];
    links?: Link[];
  }[];
}

export interface AssessmentLog {
  entries: {
    uuid: string;
    title?: string;
    description?: string;
    start: string;
    end?: string;
    props?: Property[];
    links?: Link[];
    loggedBy?: Actor[];
    relatedTasks?: {
      taskUuid: string;
      props?: Property[];
      links?: Link[];
      identifiedSubject?: SubjectReference;
      subjects?: SubjectReference[];
    }[];
    remarks?: string;
  }[];
}

export interface Result {
  uuid: string;
  title: string;
  description: string;
  props?: Property[];
  links?: Link[];
  start: string;
  end?: string;
  localDefinitions?: LocalDefinitions;
  reviewedControls: ReviewedControls;
  attestations?: Attestation[];
  assessmentLog?: AssessmentLog;
  observations?: Observation[];
  risks?: Risk[];
  findings?: Finding[];
  remarks?: string;
}

export interface Resource {
  uuid: string;
  title?: string;
  description?: string;
  props?: Property[];
  documentIds?: {
    scheme?: string;
    identifier?: string;
  }[];
  citation?: {
    text: string;
    props?: Property[];
    links?: Link[];
  };
  rlinks?: {
    href: string;
    mediaType?: string;
    hashes?: {
      algorithm: string;
      value?: string;
    }[];
  }[];
  base64?: {
    filename?: string;
    mediaType?: string;
    value?: string;
  };
  remarks?: string;
}

export interface BackMatter {
  resources?: Resource[];
}

export interface AssessmentResults {
  uuid: string;
  metadata: Metadata;
  importAp: ImportAp;
  localDefinitions?: LocalDefinitions;
  results: Result[];
  backMatter?: BackMatter;
}

export const useAssessmentResultsStore = defineStore(
  'assessment-results',
  () => {
    const configStore = useConfigStore();

    async function get(id: string): Promise<DataResponse<AssessmentResults>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<AssessmentResults>;
    }

    async function list(): Promise<DataResponse<AssessmentResults[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<AssessmentResults[]>;
    }

    async function full(id: string): Promise<DataResponse<AssessmentResults>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/full`,
        {
          credentials: 'include'
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<AssessmentResults>;
    }

    async function create(ar: Partial<AssessmentResults>): Promise<DataResponse<AssessmentResults>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(ar, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<AssessmentResults>;
    }

    async function update(id: string, ar: AssessmentResults): Promise<DataResponse<AssessmentResults>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(ar, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<AssessmentResults>;
    }

    async function remove(id: string): Promise<void> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
    }

    async function getMetadata(id: string): Promise<DataResponse<Metadata>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/metadata`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Metadata>;
    }

    async function updateMetadata(id: string, metadata: Metadata): Promise<DataResponse<Metadata>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/metadata`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(metadata, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Metadata>;
    }

    async function getImportAp(id: string): Promise<DataResponse<ImportAp>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/import-ap`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<ImportAp>;
    }

    async function updateImportAp(id: string, importAp: ImportAp): Promise<DataResponse<ImportAp>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/import-ap`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(importAp, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<ImportAp>;
    }

    async function getLocalDefinitions(id: string): Promise<DataResponse<LocalDefinitions>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/local-definitions`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<LocalDefinitions>;
    }

    async function updateLocalDefinitions(id: string, localDefinitions: LocalDefinitions): Promise<DataResponse<LocalDefinitions>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/local-definitions`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(localDefinitions, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<LocalDefinitions>;
    }

    async function getResults(id: string): Promise<DataResponse<Result[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/results`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Result[]>;
    }

    async function createResult(id: string, result: Partial<Result>): Promise<DataResponse<Result>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/results`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(result, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Result>;
    }

    async function getResult(id: string, resultId: string): Promise<DataResponse<Result>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/results/${resultId}`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Result>;
    }

    async function updateResult(id: string, resultId: string, result: Result): Promise<DataResponse<Result>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/results/${resultId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(result, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Result>;
    }

    async function deleteResult(id: string, resultId: string): Promise<void> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/results/${resultId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
    }

    async function getResultObservations(id: string, resultId: string): Promise<DataResponse<Observation[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/results/${resultId}/observations`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Observation[]>;
    }

    async function createResultObservation(id: string, resultId: string, observation: Partial<Observation>): Promise<DataResponse<Observation>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/results/${resultId}/observations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(observation, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Observation>;
    }

    async function updateResultObservation(id: string, resultId: string, obsId: string, observation: Observation): Promise<DataResponse<Observation>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/results/${resultId}/observations/${obsId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(observation, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Observation>;
    }

    async function deleteResultObservation(id: string, resultId: string, obsId: string): Promise<void> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/results/${resultId}/observations/${obsId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
    }

    async function getResultRisks(id: string, resultId: string): Promise<DataResponse<Risk[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/results/${resultId}/risks`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Risk[]>;
    }

    async function createResultRisk(id: string, resultId: string, risk: Partial<Risk>): Promise<DataResponse<Risk>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/results/${resultId}/risks`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(risk, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Risk>;
    }

    async function updateResultRisk(id: string, resultId: string, riskId: string, risk: Risk): Promise<DataResponse<Risk>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/results/${resultId}/risks/${riskId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(risk, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Risk>;
    }

    async function deleteResultRisk(id: string, resultId: string, riskId: string): Promise<void> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/results/${resultId}/risks/${riskId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
    }

    async function getResultFindings(id: string, resultId: string): Promise<DataResponse<Finding[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/results/${resultId}/findings`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Finding[]>;
    }

    async function createResultFinding(id: string, resultId: string, finding: Partial<Finding>): Promise<DataResponse<Finding>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/results/${resultId}/findings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(finding, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Finding>;
    }

    async function updateResultFinding(id: string, resultId: string, findingId: string, finding: Finding): Promise<DataResponse<Finding>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/results/${resultId}/findings/${findingId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(finding, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Finding>;
    }

    async function deleteResultFinding(id: string, resultId: string, findingId: string): Promise<void> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/results/${resultId}/findings/${findingId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
    }

    async function getResultAttestations(id: string, resultId: string): Promise<DataResponse<Attestation[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/results/${resultId}/attestations`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Attestation[]>;
    }

    async function createResultAttestation(id: string, resultId: string, attestation: Attestation): Promise<DataResponse<Attestation>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/results/${resultId}/attestations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(attestation, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Attestation>;
    }

    async function updateResultAttestation(id: string, resultId: string, index: number, attestation: Attestation): Promise<DataResponse<Attestation>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/results/${resultId}/attestations/${index}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(attestation, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Attestation>;
    }

    async function deleteResultAttestation(id: string, resultId: string, index: number): Promise<void> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/results/${resultId}/attestations/${index}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
    }

    async function getBackMatter(id: string): Promise<DataResponse<BackMatter>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/back-matter`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<BackMatter>;
    }

    async function createBackMatter(id: string, backMatter: Partial<BackMatter>): Promise<DataResponse<BackMatter>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/back-matter`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(backMatter, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<BackMatter>;
    }

    async function updateBackMatter(id: string, backMatter: BackMatter): Promise<DataResponse<BackMatter>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/back-matter`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(backMatter, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<BackMatter>;
    }

    async function deleteBackMatter(id: string): Promise<void> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/back-matter`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
    }

    async function getBackMatterResources(id: string): Promise<DataResponse<Resource[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/back-matter/resources`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Resource[]>;
    }

    async function createBackMatterResource(id: string, resource: Partial<Resource>): Promise<DataResponse<Resource>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/back-matter/resources`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(resource, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Resource>;
    }

    async function updateBackMatterResource(id: string, resourceId: string, resource: Resource): Promise<DataResponse<Resource>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/back-matter/resources/${resourceId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(resource, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Resource>;
    }

    async function deleteBackMatterResource(id: string, resourceId: string): Promise<void> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/assessment-results/${id}/back-matter/resources/${resourceId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
    }

    return {
      get,
      list,
      full,
      create,
      update,
      remove,
      getMetadata,
      updateMetadata,
      getImportAp,
      updateImportAp,
      getLocalDefinitions,
      updateLocalDefinitions,
      getResults,
      createResult,
      getResult,
      updateResult,
      deleteResult,
      getResultObservations,
      createResultObservation,
      updateResultObservation,
      deleteResultObservation,
      getResultRisks,
      createResultRisk,
      updateResultRisk,
      deleteResultRisk,
      getResultFindings,
      createResultFinding,
      updateResultFinding,
      deleteResultFinding,
      getResultAttestations,
      createResultAttestation,
      updateResultAttestation,
      deleteResultAttestation,
      getBackMatter,
      createBackMatter,
      updateBackMatter,
      deleteBackMatter,
      getBackMatterResources,
      createBackMatterResource,
      updateBackMatterResource,
      deleteBackMatterResource,
    };
  },
);
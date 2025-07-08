import { defineStore } from 'pinia'
import { useConfigStore } from '@/stores/config.ts'
import type { DataResponse, Link, Metadata, Property } from '@/stores/types.ts'
import camelcaseKeys from 'camelcase-keys'
import decamelizeKeys from 'decamelize-keys'

export interface AssessmentPlan {
  uuid: string;
  metadata: Metadata;
  importSsp: ImportSsp;
  localDefinitions?: LocalDefinitions;
  terms?: Terms;
  reviewedControls?: ReviewedControls;
  assessmentSubjects?: AssessmentSubject[];
  assessmentAssets?: AssessmentAsset[];
  tasks?: Task[];
}

export interface ImportSsp {
  href: string;
  remarks?: string;
}

export interface LocalDefinitions {
  components?: LocalComponent[];
  inventoryItems?: InventoryItem[];
  users?: User[];
  assessmentAssets?: AssessmentAsset[];
}

export interface LocalComponent {
  uuid: string;
  type: string;
  title: string;
  description: string;
  purpose?: string;
  props?: Property[];
  links?: Link[];
  responsibleRoles?: ResponsibleRole[];
  protocols?: Protocol[];
  controlImplementations?: ControlImplementation[];
}

export interface InventoryItem {
  uuid: string;
  description: string;
  props?: Property[];
  links?: Link[];
  responsibleParties?: ResponsibleParty[];
  implementedComponents?: ImplementedComponent[];
}

export interface User {
  uuid: string;
  title?: string;
  shortName?: string;
  description?: string;
  props?: Property[];
  links?: Link[];
  roleIds?: string[];
  authorizedPrivileges?: AuthorizedPrivilege[];
}

export interface ResponsibleRole {
  roleId: string;
  props?: Property[];
  links?: Link[];
  partyUuids?: string[];
}

export interface Protocol {
  uuid?: string;
  name: string;
  title?: string;
  portRanges?: PortRange[];
}

export interface PortRange {
  start: number;
  end: number;
  transport: string;
}

export interface ControlImplementation {
  uuid: string;
  source: string;
  description: string;
  props?: Property[];
  links?: Link[];
  implementedRequirements?: ImplementedRequirement[];
}

export interface ImplementedRequirement {
  uuid: string;
  controlId: string;
  description: string;
  props?: Property[];
  links?: Link[];
  statements?: Statement[];
}

export interface Statement {
  statementId: string;
  uuid: string;
  description: string;
  props?: Property[];
  links?: Link[];
}

export interface ResponsibleParty {
  roleId: string;
  partyUuids: string[];
  props?: Property[];
  links?: Link[];
}

export interface ImplementedComponent {
  componentUuid: string;
  props?: Property[];
  links?: Link[];
  responsibleParties?: ResponsibleParty[];
}

export interface AuthorizedPrivilege {
  title: string;
  description?: string;
  functionsPerformed: string[];
}

export interface Terms {
  objectives?: Objective[];
}

export interface Objective {
  controlId: string;
  description?: string;
  props?: Property[];
  links?: Link[];
  parts?: Part[];
}

export interface Part {
  uuid?: string;
  name: string;
  ns?: string;
  class?: string;
  title?: string;
  props?: Property[];
  prose?: string;
  parts?: Part[];
  links?: Link[];
}

export interface ReviewedControls {
  description?: string;
  props?: Property[];
  links?: Link[];
  controlSelections?: ControlSelection[];
  controlObjectiveSelections?: ControlObjectiveSelection[];
}

export interface ControlSelection {
  description?: string;
  includeAll?: boolean;
  includeControls?: IncludeControl[];
  excludeControls?: ExcludeControl[];
}

export interface IncludeControl {
  controlId: string;
  statementIds?: string[];
}

export interface ExcludeControl {
  controlId: string;
  statementIds?: string[];
}

export interface ControlObjectiveSelection {
  description?: string;
  includeAll?: boolean;
  includeObjectives?: IncludeObjective[];
  excludeObjectives?: ExcludeObjective[];
}

export interface IncludeObjective {
  objectiveId: string;
}

export interface ExcludeObjective {
  objectiveId: string;
}

export interface AssessmentSubject {
  uuid: string;
  type: string;
  title?: string;
  description: string;
  props?: Property[];
  links?: Link[];
  includeAll?: boolean;
  includeSubjects?: IncludeSubject[];
  excludeSubjects?: ExcludeSubject[];
}

export interface IncludeSubject {
  subjectUuid: string;
  type: string;
  title?: string;
  description?: string;
  props?: Property[];
  links?: Link[];
}

export interface ExcludeSubject {
  subjectUuid: string;
  type: string;
  title?: string;
  description?: string;
  props?: Property[];
  links?: Link[];
}

export interface AssessmentAsset {
  uuid: string;
  title?: string;
  description: string;
  props?: Property[];
  links?: Link[];
  components?: AssetComponent[];
}

export interface AssetComponent {
  componentUuid: string;
  description: string;
  props?: Property[];
  links?: Link[];
}

export interface Task {
  uuid: string;
  type: string;
  title: string;
  description?: string;
  props?: Property[];
  links?: Link[];
  timing?: TaskTiming;
  dependencies?: TaskDependency[];
  tasks?: Task[];
  associatedActivities?: AssociatedActivity[];
  subjects?: TaskSubject[];
  responsibleRoles?: ResponsibleRole[];
}

export interface TaskTiming {
  onDate?: string;
  withinDateRange?: DateRange;
  atFrequency?: Frequency;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface Frequency {
  period: string;
  unit: string;
}

export interface TaskDependency {
  taskUuid: string;
  remarks?: string;
}

export interface AssociatedActivity {
  activityUuid: string;
  props?: Property[];
  links?: Link[];
  responsibleRoles?: ResponsibleRole[];
  subjects?: ActivitySubject[];
}

export interface ActivitySubject {
  type: string;
  includeAll?: boolean;
  includeSubjects?: IncludeSubject[];
  excludeSubjects?: ExcludeSubject[];
}

export interface TaskSubject {
  type: string;
  includeAll?: boolean;
  includeSubjects?: IncludeSubject[];
  excludeSubjects?: ExcludeSubject[];
}

export const useAssessmentPlanStore = defineStore('assessment-plans', () => {
  const configStore = useConfigStore()

  async function get(id: string): Promise<DataResponse<AssessmentPlan>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/assessment-plans/${id}`, {
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<AssessmentPlan>
  }

  async function list(): Promise<DataResponse<AssessmentPlan[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/assessment-plans`, {
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<AssessmentPlan[]>
  }

  async function create(assessmentPlan: AssessmentPlan): Promise<DataResponse<AssessmentPlan>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/assessment-plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(decamelizeKeys(assessmentPlan, { separator: '-' })),
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<AssessmentPlan>
  }

  async function update(id: string, assessmentPlan: AssessmentPlan): Promise<DataResponse<AssessmentPlan>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/assessment-plans/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(decamelizeKeys(assessmentPlan, { separator: '-' })),
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<AssessmentPlan>
  }

  async function remove(id: string): Promise<void> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/assessment-plans/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }
  }

  async function full(id: string): Promise<DataResponse<AssessmentPlan>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/assessment-plans/${id}/full`, {
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<AssessmentPlan>
  }

  // Sub-resource operations
  async function updateTasks(id: string, tasks: Task[]): Promise<DataResponse<AssessmentPlan>> {
    const config = await configStore.getConfig()

    // Get current assessment plan to preserve existing data
    const currentResponse = await get(id)
    const assessmentPlan = {
      ...currentResponse.data,
      tasks: tasks
    }

    const response = await fetch(`${config.API_URL}/api/oscal/assessment-plans/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(decamelizeKeys(assessmentPlan, { separator: '-' })),
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<AssessmentPlan>
  }

  async function updateAssessmentSubjects(id: string, subjects: AssessmentSubject[]): Promise<DataResponse<AssessmentPlan>> {
    const config = await configStore.getConfig()

    // Get current assessment plan to preserve existing data
    const currentResponse = await get(id)
    const assessmentPlan = {
      ...currentResponse.data,
      assessmentSubjects: subjects
    }

    const response = await fetch(`${config.API_URL}/api/oscal/assessment-plans/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(decamelizeKeys(assessmentPlan, { separator: '-' })),
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<AssessmentPlan>
  }

  async function updateAssessmentAssets(id: string, assets: AssessmentAsset[]): Promise<DataResponse<AssessmentPlan>> {
    const config = await configStore.getConfig()

    // Get current assessment plan to preserve existing data
    const currentResponse = await get(id)
    const assessmentPlan = {
      ...currentResponse.data,
      assessmentAssets: assets
    }

    const response = await fetch(`${config.API_URL}/api/oscal/assessment-plans/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(decamelizeKeys(assessmentPlan, { separator: '-' })),
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<AssessmentPlan>
  }

  return {
    get,
    list,
    create,
    update,
    remove,
    full,
    updateTasks,
    updateAssessmentSubjects,
    updateAssessmentAssets,
  }
})

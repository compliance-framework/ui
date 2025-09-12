import { defineStore } from 'pinia';
import { useConfigStore } from '@/stores/config.ts';
import type { DataResponse, Link, Metadata, Property } from '@/stores/types.ts';
import camelcaseKeys from 'camelcase-keys';
import decamelizeKeys from 'decamelize-keys';

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
  description?: string;
  props?: Property[];
  links?: Link[];
}

export interface ExcludeSubject {
  subjectUuid: string;
  type: string;
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
  remarks?: string;
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
  const configStore = useConfigStore();

  async function get(id: string): Promise<DataResponse<AssessmentPlan>> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/oscal/assessment-plans/${id}`,
      {
        credentials: 'include',
      },
    );
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<AssessmentPlan>;
  }

  async function list(): Promise<DataResponse<AssessmentPlan[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/oscal/assessment-plans`,
      {
        credentials: 'include',
      },
    );
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<AssessmentPlan[]>;
  }

  async function create(
    assessmentPlan: AssessmentPlan,
  ): Promise<DataResponse<AssessmentPlan>> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/oscal/assessment-plans`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          decamelizeKeys(assessmentPlan, { separator: '-' }),
        ),
        credentials: 'include',
      },
    );
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<AssessmentPlan>;
  }

  async function update(
    id: string,
    assessmentPlan: AssessmentPlan,
  ): Promise<DataResponse<AssessmentPlan>> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/oscal/assessment-plans/${id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          decamelizeKeys(assessmentPlan, { separator: '-' }),
        ),
        credentials: 'include',
      },
    );
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<AssessmentPlan>;
  }

  async function remove(id: string): Promise<void> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/oscal/assessment-plans/${id}`,
      {
        method: 'DELETE',
        credentials: 'include',
      },
    );
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
  }

  async function full(id: string): Promise<DataResponse<AssessmentPlan>> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/oscal/assessment-plans/${id}/full`,
      {
        credentials: 'include',
      },
    );
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<AssessmentPlan>;
  }

  // Sub-resource operations
  async function deleteTask(planId: string, taskId: string): Promise<void> {
    const config = await configStore.getConfig();
    console.log('deleteTask called with:', { planId, taskId });

    const response = await fetch(
      `${config.API_URL}/api/oscal/assessment-plans/${planId}/tasks/${taskId}`,
      {
        method: 'DELETE',
        credentials: 'include',
      },
    );

    console.log('Task delete response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Task delete error:', errorText);
      throw new Error(`Error: ${response.statusText}`);
    }

    console.log('Task deleted successfully');
  }

  async function updateTask(
    planId: string,
    task: Task,
  ): Promise<DataResponse<Task>> {
    const config = await configStore.getConfig();
    console.log('updateTask called with:', { planId, task });

    const taskPayload = decamelizeKeys(task, { separator: '-', deep: true });
    console.log('Sending task payload:', taskPayload);

    const response = await fetch(
      `${config.API_URL}/api/oscal/assessment-plans/${planId}/tasks/${task.uuid}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskPayload),
        credentials: 'include',
      },
    );

    console.log('Task update response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Task update error:', errorText);
      throw new Error(`Error: ${response.statusText}`);
    }

    const result = camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<Task>;
    console.log('Task update result:', result);
    return result;
  }

  async function updateTasks(
    id: string,
    tasks: Task[],
  ): Promise<DataResponse<AssessmentPlan>> {
    const config = await configStore.getConfig();
    console.log('updateTasks called with:', { id, tasks });

    // Fall back to updating the full assessment plan since there's no bulk update endpoint
    console.log('Using full assessment plan update for tasks');
    // Get current assessment plan to preserve existing data
    const currentResponse = await get(id);
    const assessmentPlan = {
      ...currentResponse.data,
      tasks: tasks,
    };

    console.log('Full assessment plan payload:', assessmentPlan);

    const response = await fetch(
      `${config.API_URL}/api/oscal/assessment-plans/${id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          decamelizeKeys(assessmentPlan, { separator: '-' }),
        ),
        credentials: 'include',
      },
    );
    console.log('Full plan update response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Full plan update error:', errorText);
      throw new Error(`Error: ${response.statusText}`);
    }
    const result = camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<AssessmentPlan>;
    console.log('Full plan update result:', result);
    return result;
  }

  async function updateAssessmentSubjects(
    id: string,
    subjects: AssessmentSubject[],
  ): Promise<DataResponse<AssessmentPlan>> {
    const config = await configStore.getConfig();

    // Get current assessment plan to preserve existing data
    const currentResponse = await get(id);
    const assessmentPlan = {
      ...currentResponse.data,
      assessmentSubjects: subjects,
    };

    const response = await fetch(
      `${config.API_URL}/api/oscal/assessment-plans/${id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          decamelizeKeys(assessmentPlan, { separator: '-' }),
        ),
        credentials: 'include',
      },
    );
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<AssessmentPlan>;
  }

  async function updateAssessmentAssets(
    id: string,
    assets: AssessmentAsset[],
  ): Promise<DataResponse<AssessmentPlan>> {
    const config = await configStore.getConfig();
    console.log('[DEBUG_LOG] updateAssessmentAssets called with:', {
      id,
      assetsCount: assets.length,
    });

    // Get current assessment plan to preserve existing data
    const currentResponse = await get(id);
    const assessmentPlan = {
      ...currentResponse.data,
      // Wrap assets array in the expected object structure
      assessmentAssets: {
        assets: assets,
      },
    };

    console.log('[DEBUG_LOG] Assessment plan before decamelizeKeys:', {
      uuid: assessmentPlan.uuid,
      assessmentAssetsCount:
        assessmentPlan.assessmentAssets?.assets?.length || 0,
      assessmentAssets: assessmentPlan.assessmentAssets,
    });

    const payload = decamelizeKeys(assessmentPlan, { separator: '-' });
    console.log('[DEBUG_LOG] Payload being sent to backend:', payload);
    console.log(
      '[DEBUG_LOG] Assessment assets in payload:',
      payload['assessment-assets'],
    );

    const response = await fetch(
      `${config.API_URL}/api/oscal/assessment-plans/${id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        credentials: 'include',
      },
    );

    console.log('[DEBUG_LOG] Response status:', response.status);
    console.log(
      '[DEBUG_LOG] Response headers:',
      Object.fromEntries(response.headers.entries()),
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DEBUG_LOG] Backend error response:', errorText);
      throw new Error(`Error: ${response.statusText} - ${errorText}`);
    }

    const result = camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<AssessmentPlan>;
    console.log('[DEBUG_LOG] Success response:', result);
    return result;
  }

  async function getTasks(id: string): Promise<DataResponse<Task[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/oscal/assessment-plans/${id}/tasks`,
      {
        credentials: 'include',
      },
    );
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<Task[]>;
  }

  async function getAssessmentSubjects(
    id: string,
  ): Promise<DataResponse<AssessmentSubject[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/oscal/assessment-plans/${id}/assessment-subjects`,
      {
        credentials: 'include',
      },
    );
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<AssessmentSubject[]>;
  }

  async function getAssessmentAssets(
    id: string,
  ): Promise<DataResponse<AssessmentAsset[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/oscal/assessment-plans/${id}/assessment-assets`,
      {
        credentials: 'include',
      },
    );
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<AssessmentAsset[]>;
  }

  async function createAssessmentAsset(
    planId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    asset: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<DataResponse<any>> {
    const config = await configStore.getConfig();
    console.log('[DEBUG_LOG] createAssessmentAsset called with:', {
      planId,
      asset,
    });

    const response = await fetch(
      `${config.API_URL}/api/oscal/assessment-plans/${planId}/assessment-assets`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(asset),
        credentials: 'include',
      },
    );

    console.log('[DEBUG_LOG] Asset creation response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DEBUG_LOG] Asset creation error:', errorText);
      throw new Error(`Error: ${response.statusText} - ${errorText}`);
    }

    const result = camelcaseKeys(await response.json(), {
      deep: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as DataResponse<any>;
    console.log('[DEBUG_LOG] Asset creation result:', result);
    return result;
  }

  async function getAssociatedActivities(
    planId: string,
    taskId: string,
  ): Promise<DataResponse<AssociatedActivity[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/oscal/assessment-plans/${planId}/tasks/${taskId}/associated-activities`,
      {
        credentials: 'include',
      },
    );
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<AssociatedActivity[]>;
  }

  async function associateActivity(
    planId: string,
    taskId: string,
    activityId: string,
  ): Promise<Response> {
    const config = await configStore.getConfig();

    const response = await fetch(
      `${config.API_URL}/api/oscal/assessment-plans/${planId}/tasks/${taskId}/associated-activities/${activityId}`,
      {
        method: 'POST',
        credentials: 'include',
      },
    );

    console.log(
      '[DEBUG_LOG] Activity creation response status:',
      response.status,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DEBUG_LOG] Activity creation error:', errorText);
      throw new Error(`Error: ${response.statusText} - ${errorText}`);
    }

    return response;
  }

  async function disassociateActivity(
    planId: string,
    taskId: string,
    activityId: string,
  ): Promise<Response> {
    const config = await configStore.getConfig();

    const response = await fetch(
      `${config.API_URL}/api/oscal/assessment-plans/${planId}/tasks/${taskId}/associated-activities/${activityId}`,
      {
        method: 'DELETE',
        credentials: 'include',
      },
    );

    console.log(
      '[DEBUG_LOG] Activity creation response status:',
      response.status,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DEBUG_LOG] Activity creation error:', errorText);
      throw new Error(`Error: ${response.statusText} - ${errorText}`);
    }

    return response;
  }

  return {
    get,
    list,
    create,
    update,
    remove,
    full,
    getTasks,
    getAssessmentSubjects,
    getAssessmentAssets,
    deleteTask,
    updateTask,
    updateTasks,
    updateAssessmentSubjects,
    updateAssessmentAssets,
    createAssessmentAsset,
    getAssociatedActivities,
    associateActivity,
    disassociateActivity,
  };
});

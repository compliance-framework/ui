import { defineStore } from 'pinia';
import { useConfigStore } from '@/stores/config.ts';
import type { DataResponse } from '@/stores/types.ts';
import camelcaseKeys from 'camelcase-keys';
import decamelizeKeys from 'decamelize-keys';
import type {
  AssessmentAssets,
  AssessmentPlan,
  AssessmentSubject,
  AssociatedActivity,
  Task,
} from '@/oscal';

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
    assets: AssessmentAssets,
  ): Promise<DataResponse<AssessmentPlan>> {
    const config = await configStore.getConfig();

    // Get current assessment plan to preserve existing data
    const currentResponse = await get(id);
    const assessmentPlan = {
      ...currentResponse.data,
      // Wrap assets array in the expected object structure
      assessmentAssets: assets,
    };

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
  ): Promise<DataResponse<AssessmentAssets>> {
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
    }) as DataResponse<AssessmentAssets>;
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

import type { ProfileSelectControlByID } from '@/oscal';

export function useProfileControlGroups() {
  function createGroup(groups: ProfileSelectControlByID[]) {
    groups.push({ withIds: [] });
  }

  function removeGroup(groups: ProfileSelectControlByID[], idx: number) {
    groups.splice(idx, 1);
  }

  function addControlId(
    controlGroup: ProfileSelectControlByID & { _newId?: string },
  ) {
    if (controlGroup._newId && controlGroup._newId.trim() !== '') {
      if (!controlGroup.withIds) controlGroup.withIds = [];
      controlGroup.withIds.push(controlGroup._newId.trim());
      controlGroup._newId = '';
    }
  }

  function removeControl(controlIds: string[], idx: number) {
    controlIds.splice(idx, 1);
  }

  return {
    createGroup,
    removeGroup,
    addControlId,
    removeControl,
  };
}

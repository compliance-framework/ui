import type {
  RouteLocationNormalizedLoaded,
  RouteRecordNormalized,
} from 'vue-router';

export type UIMigrationVersion = 'v1' | 'v2';
export type UIMigrationStatus = UIMigrationVersion | 'mixed';

export type UIMigrationStatusDetail = {
  fullPath: string;
  routeName: string | null;
  status: UIMigrationStatus;
  matchedUIVersions: UIMigrationVersion[];
  timestamp: string;
};

export const UI_MIGRATION_STATUS_EVENT = 'ccf:ui-migration-status';

type MigrationTarget = Pick<
  RouteLocationNormalizedLoaded,
  'fullPath' | 'name' | 'matched'
>;

type WindowWithMigrationState = Window & {
  __ccfLastUIMigrationStatus?: UIMigrationStatusDetail;
};

export function getRouteRecordUIVersion(
  record: Pick<RouteRecordNormalized, 'meta'>,
): UIMigrationVersion {
  return record.meta.uiVersion === 'v2' ? 'v2' : 'v1';
}

export function getMatchedUIVersions(
  matched: readonly Pick<RouteRecordNormalized, 'meta'>[],
): UIMigrationVersion[] {
  return matched.map((record) => getRouteRecordUIVersion(record));
}

export function getUIMigrationStatus(
  matchedUIVersions: readonly UIMigrationVersion[],
): UIMigrationStatus {
  if (matchedUIVersions.length === 0) {
    return 'v1';
  }

  const firstVersion = matchedUIVersions[0];
  const isMixed = matchedUIVersions.some((version) => version !== firstVersion);
  if (isMixed) {
    return 'mixed';
  }

  return firstVersion;
}

export function buildUIMigrationStatusDetail(
  to: MigrationTarget,
): UIMigrationStatusDetail {
  const matchedUIVersions = getMatchedUIVersions(to.matched);
  return {
    fullPath: to.fullPath,
    routeName: to.name ? String(to.name) : null,
    status: getUIMigrationStatus(matchedUIVersions),
    matchedUIVersions,
    timestamp: new Date().toISOString(),
  };
}

export function dispatchUIMigrationStatusEvent(to: MigrationTarget) {
  if (typeof window === 'undefined') {
    return;
  }

  const detail = buildUIMigrationStatusDetail(to);
  const typedWindow = window as WindowWithMigrationState;
  typedWindow.__ccfLastUIMigrationStatus = detail;

  typedWindow.dispatchEvent(
    new CustomEvent<UIMigrationStatusDetail>(UI_MIGRATION_STATUS_EVENT, {
      detail,
    }),
  );
}

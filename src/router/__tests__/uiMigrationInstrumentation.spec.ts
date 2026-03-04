import { describe, expect, it, vi } from 'vitest';
import type {
  RouteLocationNormalizedLoaded,
  RouteRecordNormalized,
} from 'vue-router';
import {
  UI_MIGRATION_STATUS_EVENT,
  buildUIMigrationStatusDetail,
  dispatchUIMigrationStatusEvent,
  getMatchedUIVersions,
  getUIMigrationStatus,
} from '../uiMigrationInstrumentation';

function createRouteRecord(
  uiVersion?: 'v2',
): Pick<RouteRecordNormalized, 'meta'> {
  return {
    meta: uiVersion ? { uiVersion } : {},
  };
}

function createTargetRoute(
  fullPath: string,
  matched: Pick<RouteRecordNormalized, 'meta'>[],
  name: string | null = null,
): Pick<RouteLocationNormalizedLoaded, 'fullPath' | 'matched' | 'name'> {
  return {
    fullPath,
    matched: matched as unknown as RouteLocationNormalizedLoaded['matched'],
    name: name as unknown as RouteLocationNormalizedLoaded['name'],
  };
}

describe('uiMigrationInstrumentation', () => {
  it('maps matched records to UI versions', () => {
    const versions = getMatchedUIVersions([
      createRouteRecord(),
      createRouteRecord('v2'),
      createRouteRecord('v2'),
    ]);

    expect(versions).toEqual(['v1', 'v2', 'v2']);
  });

  it('derives migration status from matched versions', () => {
    expect(getUIMigrationStatus([])).toBe('v1');
    expect(getUIMigrationStatus(['v1'])).toBe('v1');
    expect(getUIMigrationStatus(['v2', 'v2'])).toBe('v2');
    expect(getUIMigrationStatus(['v1', 'v2'])).toBe('mixed');
  });

  it('builds route detail payload for instrumentation', () => {
    const detail = buildUIMigrationStatusDetail(
      createTargetRoute(
        '/system-security-plans/123',
        [createRouteRecord('v2'), createRouteRecord('v2')],
        'system-security-plan-editor',
      ),
    );

    expect(detail.fullPath).toBe('/system-security-plans/123');
    expect(detail.routeName).toBe('system-security-plan-editor');
    expect(detail.status).toBe('v2');
    expect(detail.matchedUIVersions).toEqual(['v2', 'v2']);
    expect(Number.isNaN(Date.parse(detail.timestamp))).toBe(false);
  });

  it('dispatches a browser event with migration status detail', () => {
    const handler = vi.fn();
    window.addEventListener(
      UI_MIGRATION_STATUS_EVENT,
      handler as unknown as EventListener,
    );

    dispatchUIMigrationStatusEvent(
      createTargetRoute(
        '/controls',
        [createRouteRecord(), createRouteRecord('v2')],
        'controls:index',
      ),
    );

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as CustomEvent;
    const detail = event.detail as {
      fullPath: string;
      routeName: string | null;
      status: string;
      matchedUIVersions: string[];
    };

    expect(detail.fullPath).toBe('/controls');
    expect(detail.routeName).toBe('controls:index');
    expect(detail.status).toBe('mixed');
    expect(detail.matchedUIVersions).toEqual(['v1', 'v2']);
    expect(
      (window as { __ccfLastUIMigrationStatus?: unknown })
        .__ccfLastUIMigrationStatus,
    ).toBeTruthy();

    window.removeEventListener(
      UI_MIGRATION_STATUS_EVENT,
      handler as unknown as EventListener,
    );
  });
});

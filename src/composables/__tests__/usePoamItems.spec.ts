import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';
import { useDataApi } from '@/composables/axios';
import type {
  CreatePoamItemRequest,
  UpdatePoamItemRequest,
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
} from '@/types/poam-items';
import {
  usePoamItemsList,
  usePoamItemCreate,
  usePoamItemUpdate,
  usePoamItemDelete,
  useMilestonesList,
  useMilestoneCreate,
  useMilestoneUpdate,
  useMilestoneDelete,
  usePoamItemsByRisk,
  usePromoteRiskToPoam,
  poamStatusBadgeClass,
  milestoneStatusDotClass,
  milestoneStatusLabel,
} from '../usePoamItems';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockExecute = vi.fn();
const mockData: { value: unknown } = { value: undefined };

vi.mock('@/composables/axios', () => ({
  useDataApi: vi.fn(() => ({
    data: mockData,
    isLoading: ref(false),
    error: ref(null),
    execute: mockExecute,
  })),
  decamelizeKeys: vi.fn((x) => x),
}));

// Helper to produce a type-safe mock return value for useDataApi.
// We cast to ReturnType<typeof useDataApi> so vue-tsc is satisfied while
// only providing the fields our composables actually use.
function makeDataApiMock() {
  return {
    data: mockData as ReturnType<typeof useDataApi>['data'],
    isLoading: ref(false),
    error: ref(null),
    execute: mockExecute,
  } as unknown as ReturnType<typeof useDataApi>;
}

describe('usePoamItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData.value = undefined;
    vi.mocked(useDataApi).mockImplementation(() => makeDataApiMock());
  });

  // ─── usePoamItemsList ──────────────────────────────────────────────────────

  describe('usePoamItemsList URL construction', () => {
    it('builds a URL with no query string when no filters provided', () => {
      usePoamItemsList();
      const calledUrl = vi.mocked(useDataApi).mock.calls[0][0] as string;
      expect(calledUrl).toBe('/api/poam-items');
    });

    it('appends status filter when provided', () => {
      usePoamItemsList({ status: 'open' });
      const calledUrl = vi.mocked(useDataApi).mock.calls[0][0] as string;
      expect(calledUrl).toContain('status=open');
    });

    it('appends overdueOnly=true when set', () => {
      usePoamItemsList({ overdueOnly: true });
      const calledUrl = vi.mocked(useDataApi).mock.calls[0][0] as string;
      expect(calledUrl).toContain('overdueOnly=true');
    });

    it('appends deadlineBefore when provided', () => {
      usePoamItemsList({ deadlineBefore: '2026-12-31' });
      const calledUrl = vi.mocked(useDataApi).mock.calls[0][0] as string;
      expect(calledUrl).toContain('deadlineBefore=2026-12-31');
    });

    it('appends riskId when provided', () => {
      usePoamItemsList({ riskId: 'risk-abc' });
      const calledUrl = vi.mocked(useDataApi).mock.calls[0][0] as string;
      expect(calledUrl).toContain('riskId=risk-abc');
    });

    it('appends ownerRef when provided', () => {
      usePoamItemsList({ ownerRef: 'team-x' });
      const calledUrl = vi.mocked(useDataApi).mock.calls[0][0] as string;
      expect(calledUrl).toContain('ownerRef=team-x');
    });

    it('combines multiple filters correctly', () => {
      usePoamItemsList({
        status: 'open',
        riskId: 'risk-abc',
        overdueOnly: true,
      });
      const calledUrl = vi.mocked(useDataApi).mock.calls[0][0] as string;
      expect(calledUrl).toContain('status=open');
      expect(calledUrl).toContain('riskId=risk-abc');
      expect(calledUrl).toContain('overdueOnly=true');
    });
  });

  // ─── usePoamItemCreate ─────────────────────────────────────────────────────

  describe('usePoamItemCreate', () => {
    it('POSTs to /api/poam-items', async () => {
      mockExecute.mockResolvedValue(undefined);
      const { createPoamItem } = usePoamItemCreate();
      const payload: CreatePoamItemRequest = {
        title: 'Test',
        status: 'open',
        sspId: 'ssp-1',
      };
      await createPoamItem(payload);
      expect(mockExecute).toHaveBeenCalledWith(
        '/api/poam-items',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('exposes isLoading and error', () => {
      const { isLoading, error } = usePoamItemCreate();
      expect(isLoading).toBeDefined();
      expect(error).toBeDefined();
    });
  });

  // ─── usePoamItemUpdate ─────────────────────────────────────────────────────

  describe('usePoamItemUpdate', () => {
    it('PUTs to /api/poam-items/:id', async () => {
      mockExecute.mockResolvedValue(undefined);
      const { updatePoamItem } = usePoamItemUpdate('item-123');
      const payload: UpdatePoamItemRequest = { title: 'Updated' };
      await updatePoamItem(payload);
      expect(mockExecute).toHaveBeenCalledWith(
        '/api/poam-items/item-123',
        expect.objectContaining({ method: 'PUT' }),
      );
    });
  });

  // ─── usePoamItemDelete ─────────────────────────────────────────────────────

  describe('usePoamItemDelete', () => {
    it('DELETEs /api/poam-items/:id', async () => {
      mockExecute.mockResolvedValue(undefined);
      const { deletePoamItem } = usePoamItemDelete();
      await deletePoamItem('item-456');
      expect(mockExecute).toHaveBeenCalledWith(
        '/api/poam-items/item-456',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  // ─── useMilestonesList ─────────────────────────────────────────────────────

  describe('useMilestonesList URL construction', () => {
    it('calls /api/poam-items/:id/milestones', () => {
      useMilestonesList('poam-item-789');
      const calledUrl = vi.mocked(useDataApi).mock.calls[0][0] as string;
      expect(calledUrl).toBe('/api/poam-items/poam-item-789/milestones');
    });
  });

  // ─── useMilestoneCreate ────────────────────────────────────────────────────

  describe('useMilestoneCreate', () => {
    it('POSTs to /api/poam-items/:id/milestones', async () => {
      mockExecute.mockResolvedValue(undefined);
      const { createMilestone } = useMilestoneCreate('poam-item-789');
      const payload: CreateMilestoneRequest = {
        title: 'M1',
        status: 'open',
        plannedCompletionDate: '2026-12-31',
      };
      await createMilestone(payload);
      expect(mockExecute).toHaveBeenCalledWith(
        '/api/poam-items/poam-item-789/milestones',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  // ─── useMilestoneUpdate ────────────────────────────────────────────────────

  describe('useMilestoneUpdate', () => {
    it('PUTs to /api/poam-items/:poamItemId/milestones/:milestoneId', async () => {
      mockExecute.mockResolvedValue(undefined);
      const { updateMilestone } = useMilestoneUpdate('poam-item-789', 'ms-001');
      const payload: UpdateMilestoneRequest = { title: 'Updated M1' };
      await updateMilestone(payload);
      expect(mockExecute).toHaveBeenCalledWith(
        '/api/poam-items/poam-item-789/milestones/ms-001',
        expect.objectContaining({ method: 'PUT' }),
      );
    });
  });

  // ─── useMilestoneDelete ────────────────────────────────────────────────────

  describe('useMilestoneDelete', () => {
    it('DELETEs /api/poam-items/:poamItemId/milestones/:milestoneId', async () => {
      mockExecute.mockResolvedValue(undefined);
      const { deleteMilestone } = useMilestoneDelete();
      await deleteMilestone('poam-item-789', 'ms-001');
      expect(mockExecute).toHaveBeenCalledWith(
        '/api/poam-items/poam-item-789/milestones/ms-001',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  // ─── usePoamItemsByRisk ────────────────────────────────────────────────────

  describe('usePoamItemsByRisk URL construction', () => {
    it('calls /api/poam-items?riskId=:riskId', () => {
      usePoamItemsByRisk('risk-xyz');
      const calledUrl = vi.mocked(useDataApi).mock.calls[0][0] as string;
      expect(calledUrl).toBe('/api/poam-items?riskId=risk-xyz');
    });
  });

  // ─── poamStatusBadgeClass ──────────────────────────────────────────────────

  describe('poamStatusBadgeClass', () => {
    it('returns yellow classes for open', () => {
      expect(poamStatusBadgeClass('open')).toContain('yellow');
    });

    it('returns blue classes for in-progress', () => {
      expect(poamStatusBadgeClass('in-progress')).toContain('blue');
    });

    it('returns green classes for completed', () => {
      expect(poamStatusBadgeClass('completed')).toContain('green');
    });

    it('returns red classes for overdue', () => {
      expect(poamStatusBadgeClass('overdue')).toContain('red');
    });

    it('returns gray classes for cancelled', () => {
      expect(poamStatusBadgeClass('cancelled')).toContain('gray');
    });

    it('returns purple classes for risk-accepted', () => {
      expect(poamStatusBadgeClass('risk-accepted')).toContain('purple');
    });

    it('returns gray fallback for unknown status', () => {
      expect(poamStatusBadgeClass('unknown-status')).toContain('gray');
    });
  });

  // ─── milestoneStatusDotClass ───────────────────────────────────────────────

  describe('milestoneStatusDotClass', () => {
    it('returns green dot for completed', () => {
      expect(milestoneStatusDotClass('completed')).toBe('bg-green-500');
    });

    it('returns blue dot for in-progress', () => {
      expect(milestoneStatusDotClass('in-progress')).toBe('bg-blue-500');
    });

    it('returns gray dot for open', () => {
      expect(milestoneStatusDotClass('open')).toBe('bg-gray-400');
    });

    it('returns light gray dot for cancelled', () => {
      expect(milestoneStatusDotClass('cancelled')).toBe('bg-gray-300');
    });

    it('returns default gray dot for unknown status', () => {
      expect(milestoneStatusDotClass('unknown')).toBe('bg-gray-400');
    });
  });

  // ─── usePromoteRiskToPoam (BCH-1186) ─────────────────────────────────────

  describe('usePromoteRiskToPoam', () => {
    it('calls POST /api/risks/:id/promote-to-poam with the correct URL', async () => {
      const { promoteRiskToPoam } = usePromoteRiskToPoam();
      await promoteRiskToPoam('risk-abc-123', {});
      expect(mockExecute).toHaveBeenCalledWith(
        '/api/risks/risk-abc-123/promote-to-poam',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('URL-encodes the riskId to handle special characters', async () => {
      const { promoteRiskToPoam } = usePromoteRiskToPoam();
      await promoteRiskToPoam('risk/with/slashes', {});
      expect(mockExecute).toHaveBeenCalledWith(
        '/api/risks/risk%2Fwith%2Fslashes/promote-to-poam',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('passes the payload as the request body', async () => {
      const { promoteRiskToPoam } = usePromoteRiskToPoam();
      const payload = {
        title: 'Custom POAM Title',
        deadline: '2026-12-31T23:59:59.000Z',
        resourceRequired: '3 engineer days',
      };
      await promoteRiskToPoam('risk-abc', payload);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ data: payload }),
      );
    });

    it('accepts an empty payload (all fields optional)', async () => {
      const { promoteRiskToPoam } = usePromoteRiskToPoam();
      await expect(promoteRiskToPoam('risk-abc', {})).resolves.not.toThrow();
    });
  });

  // ─── milestoneStatusLabel ──────────────────────────────────────────────────

  describe('milestoneStatusLabel', () => {
    it('returns "Open" for open', () => {
      expect(milestoneStatusLabel('open')).toBe('Open');
    });

    it('returns "In Progress" for in-progress', () => {
      expect(milestoneStatusLabel('in-progress')).toBe('In Progress');
    });

    it('returns "Completed" for completed', () => {
      expect(milestoneStatusLabel('completed')).toBe('Completed');
    });

    it('returns "Cancelled" for cancelled', () => {
      expect(milestoneStatusLabel('cancelled')).toBe('Cancelled');
    });

    it('returns the raw value for unknown status', () => {
      expect(milestoneStatusLabel('some-other-status')).toBe(
        'some-other-status',
      );
    });
  });
});

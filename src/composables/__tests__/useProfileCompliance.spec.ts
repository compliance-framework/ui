import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';
import { useProfileCompliance } from '../useProfileCompliance';
import type { ProfileComplianceProgress } from '@/types/compliance';

const mockExecute = vi.fn();
const mockData: { value: ProfileComplianceProgress | undefined } = {
  value: undefined,
};

vi.mock('@/composables/axios', () => ({
  useDataApi: vi.fn(() => ({
    data: mockData,
    isLoading: ref(false),
    error: ref(null),
    execute: mockExecute,
  })),
}));

describe('useProfileCompliance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData.value = undefined;
  });

  describe('loadCompliance URL construction', () => {
    it('builds a clean URL with no query params when no options given', async () => {
      mockExecute.mockResolvedValue(undefined);

      const { loadCompliance } = useProfileCompliance('profile-abc');
      await loadCompliance();

      expect(mockExecute).toHaveBeenCalledWith(
        '/api/oscal/profiles/profile-abc/compliance-progress',
      );
    });

    it('appends includeControls=true when explicitly set', async () => {
      mockExecute.mockResolvedValue(undefined);

      const { loadCompliance } = useProfileCompliance('profile-abc');
      await loadCompliance({ includeControls: true });

      expect(mockExecute).toHaveBeenCalledWith(
        '/api/oscal/profiles/profile-abc/compliance-progress?includeControls=true',
      );
    });

    it('appends includeControls=false when explicitly set', async () => {
      mockExecute.mockResolvedValue(undefined);

      const { loadCompliance } = useProfileCompliance('profile-abc');
      await loadCompliance({ includeControls: false });

      expect(mockExecute).toHaveBeenCalledWith(
        '/api/oscal/profiles/profile-abc/compliance-progress?includeControls=false',
      );
    });

    it('does not append includeControls when omitted from options', async () => {
      mockExecute.mockResolvedValue(undefined);

      const { loadCompliance } = useProfileCompliance('profile-abc');
      await loadCompliance({});

      const calledUrl = mockExecute.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('includeControls');
    });

    it('appends sspId when provided', async () => {
      mockExecute.mockResolvedValue(undefined);

      const { loadCompliance } = useProfileCompliance('profile-abc');
      await loadCompliance({ sspId: 'ssp-xyz' });

      expect(mockExecute).toHaveBeenCalledWith(
        '/api/oscal/profiles/profile-abc/compliance-progress?sspId=ssp-xyz',
      );
    });

    it('appends both includeControls and sspId when both provided', async () => {
      mockExecute.mockResolvedValue(undefined);

      const { loadCompliance } = useProfileCompliance('profile-abc');
      await loadCompliance({ includeControls: false, sspId: 'ssp-xyz' });

      const calledUrl = mockExecute.mock.calls[0][0] as string;
      expect(calledUrl).toContain('includeControls=false');
      expect(calledUrl).toContain('sspId=ssp-xyz');
    });

    it('does not append sspId when not provided', async () => {
      mockExecute.mockResolvedValue(undefined);

      const { loadCompliance } = useProfileCompliance('profile-abc');
      await loadCompliance({ includeControls: true });

      const calledUrl = mockExecute.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('sspId');
    });

    it('resolves the profileId from a ref', async () => {
      mockExecute.mockResolvedValue(undefined);

      const profileIdRef = ref('profile-from-ref');
      const { loadCompliance } = useProfileCompliance(profileIdRef);
      await loadCompliance();

      expect(mockExecute).toHaveBeenCalledWith(
        '/api/oscal/profiles/profile-from-ref/compliance-progress',
      );
    });
  });

  describe('derived computed refs', () => {
    const sampleProgress: ProfileComplianceProgress = {
      scope: { type: 'profile', id: 'profile-abc', title: 'Test Profile' },
      summary: {
        totalControls: 3,
        satisfied: 1,
        notSatisfied: 1,
        unknown: 1,
        compliancePercent: 33,
        assessedPercent: 67,
      },
      groups: [
        {
          id: 'GRP-1',
          title: 'Group One',
          totalControls: 3,
          satisfied: 1,
          notSatisfied: 1,
          unknown: 1,
          compliancePercent: 33,
        },
      ],
      controls: [
        {
          controlId: 'CTRL-1',
          catalogId: 'catalog-1',
          title: 'Control One',
          statusCounts: [{ status: 'satisfied', count: 2 }],
          computedStatus: 'satisfied',
        },
      ],
    };

    it('summary is undefined when data has not loaded', () => {
      mockData.value = undefined;
      const { summary } = useProfileCompliance('profile-abc');
      expect(summary.value).toBeUndefined();
    });

    it('summary returns the loaded summary', () => {
      mockData.value = sampleProgress;
      const { summary } = useProfileCompliance('profile-abc');
      expect(summary.value).toEqual(sampleProgress.summary);
    });

    it('controls defaults to empty array when data has not loaded', () => {
      mockData.value = undefined;
      const { controls } = useProfileCompliance('profile-abc');
      expect(controls.value).toEqual([]);
    });

    it('controls returns the loaded controls array', () => {
      mockData.value = sampleProgress;
      const { controls } = useProfileCompliance('profile-abc');
      expect(controls.value).toEqual(sampleProgress.controls);
    });

    it('groups defaults to empty array when data has not loaded', () => {
      mockData.value = undefined;
      const { groups } = useProfileCompliance('profile-abc');
      expect(groups.value).toEqual([]);
    });

    it('groups returns the loaded groups array', () => {
      mockData.value = sampleProgress;
      const { groups } = useProfileCompliance('profile-abc');
      expect(groups.value).toEqual(sampleProgress.groups);
    });

    it('progress returns the full data object', () => {
      mockData.value = sampleProgress;
      const { progress } = useProfileCompliance('profile-abc');
      expect(progress.value).toEqual(sampleProgress);
    });
  });
});

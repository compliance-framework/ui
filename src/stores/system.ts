import { defineStore } from 'pinia';
import type { AssessmentPlan, SystemSecurityPlan } from '@/oscal';
import type { POAM } from '@/oscal';
import type { AssessmentResult } from '@/oscal';
import { useLocalStorage } from '@vueuse/core';

type PartialSystemSecurityPlan = Pick<SystemSecurityPlan, 'uuid' | 'metadata'>;

interface System {
  securityPlan?: PartialSystemSecurityPlan;
  assessmentPlan?: AssessmentPlan;
  poam?: POAM;
  assessmentResults?: AssessmentResult;
}

export const useSystemStore = defineStore('system', () => {
  const system = useLocalStorage<System>('system', {} as System);

  function setSecurityPlan(plan: SystemSecurityPlan) {
    system.value.securityPlan = {
      metadata: plan.metadata,
      uuid: plan.uuid,
    } as PartialSystemSecurityPlan;
  }

  function setAssessmentPlan(plan: AssessmentPlan) {
    system.value.assessmentPlan = plan;
  }

  function setPoam(poam: POAM) {
    system.value.poam = poam;
  }

  function setAssessmentResults(assessmentResults: AssessmentResult) {
    system.value.assessmentResults = assessmentResults;
  }

  return {
    system,
    setSecurityPlan,
    setAssessmentPlan,
    setPoam,
    setAssessmentResults,
  };
});

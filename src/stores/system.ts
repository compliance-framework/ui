import { defineStore } from 'pinia';
import type { SystemSecurityPlan } from '@/stores/system-security-plans.ts';
import type { AssessmentPlan } from '@/stores/assessment-plans.ts';
import type { PlanOfActionAndMilestones } from '@/stores/plan-of-action-and-milestones.ts';
import type { AssessmentResults } from '@/stores/assessment-results.ts';
import { useLocalStorage } from '@vueuse/core';

type PartialSystemSecurityPlan = Pick<SystemSecurityPlan, 'uuid' | 'metadata'>;

interface System {
  securityPlan?: PartialSystemSecurityPlan;
  assessmentPlan?: AssessmentPlan;
  poam?: PlanOfActionAndMilestones;
  assessmentResults?: AssessmentResults;
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

  function setPoam(poam: PlanOfActionAndMilestones) {
    system.value.poam = poam;
  }

  function setAssessmentResults(assessmentResults: AssessmentResults) {
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

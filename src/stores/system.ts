import { defineStore } from 'pinia';
import type { SystemSecurityPlan } from '@/stores/system-security-plans.ts';
import type { AssessmentPlan } from '@/stores/assessment-plans.ts';
import type { PlanOfActionAndMilestones } from '@/stores/plan-of-action-and-milestones.ts';
import { ref } from 'vue';
import { useLocalStorage } from '@vueuse/core'

type PartialSystemSecurityPlan = Pick<SystemSecurityPlan, "uuid" | "metadata">

interface System {
  securityPlan?: PartialSystemSecurityPlan;
  assessmentPlan?: AssessmentPlan;
  poam?: PlanOfActionAndMilestones;
}

export const useSystemStore = defineStore('system', () => {
  const system = useLocalStorage<System>('system', {} as System);

  function setSecurityPlan(plan: SystemSecurityPlan) {
    console.log('Setting security plan:', plan);
    // Create a new object to ensure reactivity
    system.value = {
      ...system.value,
      securityPlan: {
        metadata: plan.metadata,
        uuid: plan.uuid,
      } as PartialSystemSecurityPlan
    };
    console.log('System after setting:', system.value);
    console.log('LocalStorage system:', localStorage.getItem('system'));
  }

  function setAssessmentPlan(plan: AssessmentPlan) {
    system.value.assessmentPlan = plan;
  }

  function setPoam(poam: PlanOfActionAndMilestones) {
    system.value.poam = poam;
  }

  return {
    system,
    setSecurityPlan,
    setAssessmentPlan,
    setPoam,
  };
});

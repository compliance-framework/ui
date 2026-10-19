import { defineStore } from 'pinia';
import type { AssessmentPlan, SystemSecurityPlan } from '@/oscal';
import type { POAM } from '@/oscal';
import type { AssessmentResult } from '@/oscal';
import { useLocalStorage } from '@vueuse/core';
import { ref, type Ref } from 'vue';

export type PartialSystemSecurityPlan = Pick<
  SystemSecurityPlan,
  'uuid' | 'metadata'
>;

interface System {
  securityPlan?: PartialSystemSecurityPlan;
  assessmentPlan?: AssessmentPlan;
  poam?: POAM;
  assessmentResults?: AssessmentResult;
}

export const useSystemStore = defineStore('system', () => {
  const system = useLocalStorage<System>('system', {} as System);

  // Every SSP the user can pick as the active system, loaded by the header's system
  // switcher. Kept here (not persisted) so This System pages can tell "no system picked
  // yet" apart from "no system exists yet" when rendering their onboarding empty state.
  const availablePlans: Ref<PartialSystemSecurityPlan[]> = ref([]);
  const availablePlansLoaded = ref(false);

  function setSecurityPlan(plan: PartialSystemSecurityPlan) {
    system.value.securityPlan = {
      metadata: plan.metadata,
      uuid: plan.uuid,
    } as PartialSystemSecurityPlan;
  }

  function clearSecurityPlan() {
    system.value.securityPlan = undefined;
  }

  // Records the selectable plans and reconciles the active one against them: an active
  // system that no longer exists is dropped, and with nothing active a lone SSP is picked
  // automatically so a first-time user lands straight in context.
  function setAvailablePlans(plans: PartialSystemSecurityPlan[]) {
    availablePlans.value = plans;
    availablePlansLoaded.value = true;

    const activeId = system.value.securityPlan?.uuid;
    const active = plans.find((plan) => plan.uuid === activeId);
    if (activeId && !active) {
      clearSecurityPlan();
    } else if (active) {
      // Pick up a renamed title so the header doesn't show a stale name.
      setSecurityPlan(active);
    }
    if (!system.value.securityPlan && plans.length === 1) {
      setSecurityPlan(plans[0]);
    }
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
    availablePlans,
    availablePlansLoaded,
    setSecurityPlan,
    clearSecurityPlan,
    setAvailablePlans,
    setAssessmentPlan,
    setPoam,
    setAssessmentResults,
  };
});

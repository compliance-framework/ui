import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import EvidenceDashboardForm from '../EvidenceDashboardForm.vue';

function mountForm(scopeFollowable: boolean) {
  return mount(EvidenceDashboardForm, {
    props: {
      name: 'IAM',
      selectedBaselineEvidence: null,
      newLabelName: '',
      newLabelValue: '',
      uniqueEvidenceTitles: [],
      evidenceLoading: false,
      labelConditions: [],
      availableLabelNames: [],
      availableLabelValues: [],
      computedFilter: '_policy=iam',
      scopeFollowable,
    },
    global: {
      directives: { tooltip: {} },
      stubs: { Select: true, InputText: true },
    },
  });
}

describe('EvidenceDashboardForm', () => {
  it("offers to follow the SSP's scope, on by default, when the SSP has one", async () => {
    const wrapper = mountForm(true);
    const follow = wrapper.find('[data-testid="follow-ssp-scope"]');
    expect((follow.element as HTMLInputElement).checked).toBe(true);

    await follow.setValue(false);
    expect(wrapper.emitted('update:followSspScope')?.[0]).toEqual([false]);
  });

  it('hides the option for an SSP without a scope', () => {
    const wrapper = mountForm(false);
    expect(wrapper.find('[data-testid="follow-ssp-scope"]').exists()).toBe(
      false,
    );
  });
});

import type { ComputedRef, InjectionKey, Ref } from 'vue';

export interface SspProfileOption {
  label: string;
  value: string;
}

export interface SspDetailProfileBinding {
  profileItems: ComputedRef<SspProfileOption[]>;
  loadingProfiles: Ref<boolean>;
  profileResolved: Ref<boolean>;
  isAttachingProfile: Ref<boolean>;
  selectedProfileId: Ref<string>;
  attachedProfileId: Ref<string>;
  selectProfile: (profileId: string) => Promise<boolean>;
}

export const sspDetailProfileBindingKey: InjectionKey<SspDetailProfileBinding> =
  Symbol('ssp-detail-profile-binding');

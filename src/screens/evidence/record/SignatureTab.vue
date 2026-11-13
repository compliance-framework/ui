<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { VerificationResult } from '@/stores/evidence';
import type { DataResponse } from '@/stores/types';
import { getErrorDetail } from '@/utils/httpErrors';
import { formatLocalDateTime } from '@/ds/format';
import Button from '@/ds/components/Button/Button.vue';
import CodeBlock from '@/ds/components/CodeBlock/CodeBlock.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import Text from '@/ds/components/Text/Text.vue';
import { useEvidenceRecord } from './evidenceRecord';

/**
 * Signature: verify the record now against its stored signed payload, and read the stored
 * signature, its signer and claims. Verification is a fresh check each time; nothing is saved.
 */
const { evidence, signature } = useEvidenceRecord();
const api = useAuthenticatedInstance();

const verifying = ref(false);
const result = ref<VerificationResult>();
const verifyError = ref<string>();

async function verify(): Promise<void> {
  verifying.value = true;
  verifyError.value = undefined;
  try {
    const response = await api.post<DataResponse<VerificationResult>>(
      `/api/evidence/${evidence.value!.id}/verify`,
    );
    result.value = response.data.data;
  } catch (error) {
    verifyError.value = await getErrorDetail(
      error,
      "Verification couldn't run for this evidence. Try again.",
    );
  } finally {
    verifying.value = false;
  }
}

const checks = computed(() => {
  const value = result.value?.checks;
  if (!value) return [];
  return [
    { key: 'hash', label: 'Content hash matches', pass: value.hashMatch },
    {
      key: 'signature',
      label: 'Signature is valid',
      pass: value.signatureValid,
    },
    {
      key: 'time',
      label: 'Signed within its validity period',
      pass: value.temporalValid,
    },
    {
      key: 'content',
      label: 'Signed content matches',
      pass: value.signedContentMatches,
    },
  ];
});

const date = (value?: string) =>
  value ? formatLocalDateTime(value) : 'Not set';
const stored = computed(() => signature.value?.signature);
const details = computed(() => {
  const s = stored.value;
  if (!s) return [];
  return [
    { key: 'version', label: 'Version', value: s.version },
    { key: 'algorithm', label: 'Algorithm', value: s.signatureAlgorithm },
    { key: 'signed', label: 'Signed', value: date(s.signedAt) },
    {
      key: 'hash',
      label: 'Content hash',
      value: `${s.contentHash.algorithm} ${s.contentHash.value}`,
    },
  ];
});
const signer = computed(() => {
  const s = stored.value?.signer;
  if (!s) return [];
  return [
    { key: 'type', label: 'Type', value: s.type || 'Not set' },
    { key: 'name', label: 'Name', value: s.name || 'Not set' },
    { key: 'email', label: 'Email', value: s.email || 'Not set' },
    { key: 'id', label: 'ID', value: s.id || 'Not set' },
    {
      key: 'credential',
      label: 'Credential',
      value: s.credentialId || 'Not set',
    },
  ];
});
const claims = computed(() => {
  const c = stored.value?.claims;
  if (!c) return [];
  return [
    { key: 'subject', label: 'Subject', value: c.subject || 'Not set' },
    { key: 'issuer', label: 'Issuer', value: c.issuer || 'Not set' },
    { key: 'kind', label: 'Token kind', value: c.tokenKind || 'Not set' },
    { key: 'issued', label: 'Issued', value: date(c.issuedAt) },
    { key: 'expires', label: 'Expires', value: date(c.expiresAt) },
    { key: 'notBefore', label: 'Not before', value: date(c.notBefore) },
    { key: 'given', label: 'Given name', value: c.givenName || 'Not set' },
    { key: 'family', label: 'Family name', value: c.familyName || 'Not set' },
    { key: 'agent', label: 'Agent', value: c.agentId || 'Not set' },
    {
      key: 'credential',
      label: 'Credential',
      value: c.credentialId || 'Not set',
    },
    { key: 'auth', label: 'Sign-in method', value: c.authMethod || 'Not set' },
  ];
});
</script>

<template>
  <Stack gap="6">
    <Panel
      title="Verification"
      description="Check the current evidence against its stored signed payload."
    >
      <template #actions>
        <Button :loading="verifying" icon="check" @click="verify">{{
          result ? 'Verify again' : 'Verify'
        }}</Button>
      </template>
      <InlineMessage
        v-if="verifyError"
        tone="error"
        title="Verification didn't run"
        ><p>{{ verifyError }}</p></InlineMessage
      >
      <Stack v-else-if="result" gap="4">
        <InlineMessage
          :tone="result.isValid ? 'success' : 'error'"
          :title="
            result.isValid
              ? 'The signature is valid'
              : 'The signature is not valid'
          "
          ><p>Verification status: {{ result.status }}</p></InlineMessage
        >
        <DescriptionList
          :items="checks.map((c) => ({ key: c.key, label: c.label }))"
        >
          <template
            v-for="check in checks"
            :key="check.key"
            #[`value-${check.key}`]
          >
            <StatusBadge
              :status="check.pass ? 'satisfied' : 'not-satisfied'"
              :label="check.pass ? 'Pass' : 'Fail'"
            />
          </template>
        </DescriptionList>
        <Text v-if="result.contentHash" variant="code"
          >Verified content hash: {{ result.contentHash.algorithm }}
          {{ result.contentHash.value }}</Text
        >
        <InlineMessage
          v-if="result.errors?.length"
          tone="error"
          title="Verification errors"
        >
          <ul>
            <li v-for="message in result.errors" :key="message">
              {{ message }}
            </li>
          </ul>
        </InlineMessage>
      </Stack>
      <Text v-else variant="secondary"
        >Verify to compare the current evidence with its stored signature.</Text
      >
    </Panel>

    <Panel title="Stored signature">
      <Text v-if="signature === undefined" variant="secondary"
        >Loading the signature…</Text
      >
      <Text v-else-if="signature === null" variant="secondary"
        >The signature couldn't be read.</Text
      >
      <Text v-else-if="!stored" variant="secondary"
        >This evidence is unsigned.</Text
      >
      <Stack v-else gap="4">
        <DescriptionList :items="details" />
        <Panel title="Signer" :level="3" dense>
          <DescriptionList :items="signer" />
        </Panel>
        <Panel title="Claims" :level="3" dense>
          <DescriptionList :items="claims" />
        </Panel>
        <Disclosure label="Signed token (JWS)">
          <CodeBlock :code="stored.jws" label="Signed token (JWS)" />
        </Disclosure>
      </Stack>
    </Panel>
  </Stack>
</template>

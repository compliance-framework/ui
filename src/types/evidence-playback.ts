// Response of GET /api/evidence/{id}/playback: what an evidence's policy evaluation was
// made of, and the result of replaying it, compared with what the evidence recorded.

export interface EvidencePlaybackArtifactInfo {
  digest: string;
  mediaType: string;
  sizeBytes: number;
}

export interface EvidencePlaybackFile {
  path: string;
  source: string;
  // The file that defines the package the evidence came from.
  containsPackage: boolean;
}

// Where a rule is in its policy file: the 1-based first and last line.
export interface EvidencePlaybackRuleLocation {
  file: string;
  startLine: number;
  endLine: number;
}

export interface EvidencePlaybackViolation {
  id?: string;
  title?: string;
  description?: string;
  remarks?: string;
  // The `violation` rules that produced it. Empty when they could not be located; absent
  // from APIs that predate rule locations.
  rules?: EvidencePlaybackRuleLocation[];
}

export interface EvidencePlaybackRecorded {
  status: string;
  violationIds: string[];
}

export interface EvidencePlaybackReplay {
  status: string;
  title?: string | null;
  violations: EvidencePlaybackViolation[];
  rawJson: string;
  error?: string;
}

export interface EvidencePlaybackComparison {
  statusMatches: boolean;
  missingViolationIds: string[];
  newViolationIds: string[];
  unidentifiedViolations: number;
}

export interface EvidencePlaybackError {
  code: string;
  message: string;
  file?: string;
  row?: number;
  col?: number;
}

export interface EvidencePlayback {
  available: boolean;
  reason?: string;
  package?: string;
  evaluatedAt?: string;
  artifacts?: {
    bundle: EvidencePlaybackArtifactInfo;
    input: EvidencePlaybackArtifactInfo;
    policyData: EvidencePlaybackArtifactInfo | null;
  };
  policyFiles: EvidencePlaybackFile[];
  // JSON documents, pretty-printed by the API and shown as they are.
  policyDataJson: string | null;
  bundleDataJson: string | null;
  inputJson: string;
  // inputJson holds only the start of the input; the full input is the input artifact.
  inputTruncated: boolean;
  recorded: EvidencePlaybackRecorded;
  replay: EvidencePlaybackReplay | null;
  comparison: EvidencePlaybackComparison | null;
  prints: string[];
  errors: EvidencePlaybackError[];
}

// The evidence prop that shows an evidence's policy evaluation can be played back.
export const POLICY_BUNDLE_DIGEST_PROP = '_policy_bundle_digest';

// The evidence prop the agent records with the configured source of the policy bundle: an
// OCI reference such as ghcr.io/org/plugin-x-policies:v1.2.3, or a local path.
export const POLICY_SOURCE_PROP = '_policy_source';

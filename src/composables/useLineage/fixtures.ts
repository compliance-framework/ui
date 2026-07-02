// Demo fixture graph for the lineage PoC. Used when the API PoC branch isn't
// running (flag `VITE_LINEAGE_FIXTURES`, `?fixtures=1`, localStorage, or automatic
// fallback on a failed request — see index.ts). The data exercises every semantic
// the views must render:
//   • standard → group → control → policy/procedure levels
//   • a SHARED policy node (`policy:acme/access-control`) that appears under both a
//     standard control and its policy-catalog root — same key, so the graph must
//     draw ONE node with multiple inbound edges
//   • a `documents` branch (procedure-*) for dashed/de-emphasised edges
//   • an unanchored policy root (warning indicator)
//   • an unmapped operational control
//   • every heat bucket (0, 1–9, 10–24, 25–49, ≥50) and muted risk chips

import type { LineageNode, LineageScope } from './types';

function node(
  partial: Partial<LineageNode> &
    Pick<LineageNode, 'key' | 'nodeType' | 'title'>,
): LineageNode {
  return {
    catalogId: undefined,
    controlId: undefined,
    compliance: {
      totalControls: 0,
      satisfied: 0,
      notSatisfied: 0,
      unknown: 0,
      compliancePercent: 0,
      assessedPercent: 0,
    },
    risk: {
      openScoreSum: 0,
      mutedScoreSum: 0,
      counts: {
        open: 0,
        investigating: 0,
        mitigatingPlanned: 0,
        riskAccepted: 0,
        mitigatingImplemented: 0,
      },
    },
    linkage: {
      policies: 0,
      procedures: 0,
      operationalControls: 0,
      unmapped: false,
      unanchored: false,
    },
    hasChildren: false,
    childrenCount: 0,
    ...partial,
  };
}

// --- individual nodes -------------------------------------------------------

const soc2 = node({
  key: 'standard-catalog:soc2',
  nodeType: 'standard-catalog',
  catalogId: 'soc2',
  title: 'SOC 2 Trust Services Criteria',
  compliance: {
    totalControls: 61,
    satisfied: 40,
    notSatisfied: 9,
    unknown: 12,
    compliancePercent: 65.6,
    assessedPercent: 80.3,
  },
  risk: {
    openScoreSum: 37,
    mutedScoreSum: 12,
    counts: {
      open: 4,
      investigating: 1,
      mitigatingPlanned: 0,
      riskAccepted: 2,
      mitigatingImplemented: 1,
    },
  },
  linkage: {
    policies: 3,
    procedures: 2,
    operationalControls: 8,
    unmapped: false,
    unanchored: false,
  },
  hasChildren: true,
  childrenCount: 1,
});

const ccGroup = node({
  key: 'group:soc2/cc',
  nodeType: 'group',
  catalogId: 'soc2',
  controlId: 'cc',
  title: 'CC6.0 — Logical & Physical Access Controls',
  compliance: {
    totalControls: 12,
    satisfied: 7,
    notSatisfied: 3,
    unknown: 2,
    compliancePercent: 58.3,
    assessedPercent: 83.3,
  },
  risk: {
    openScoreSum: 30,
    mutedScoreSum: 4,
    counts: {
      open: 3,
      investigating: 1,
      mitigatingPlanned: 0,
      riskAccepted: 1,
      mitigatingImplemented: 0,
    },
  },
  linkage: {
    policies: 2,
    procedures: 1,
    operationalControls: 5,
    unmapped: false,
    unanchored: false,
  },
  hasChildren: true,
  childrenCount: 1,
});

const cc61 = node({
  key: 'control:soc2/cc6.1',
  nodeType: 'control',
  catalogId: 'soc2',
  controlId: 'cc6.1',
  title: 'CC6.1 — Logical access security',
  compliance: {
    totalControls: 1,
    satisfied: 0,
    notSatisfied: 1,
    unknown: 0,
    compliancePercent: 0,
    assessedPercent: 100,
  },
  risk: {
    openScoreSum: 22,
    mutedScoreSum: 0,
    counts: {
      open: 2,
      investigating: 1,
      mitigatingPlanned: 0,
      riskAccepted: 0,
      mitigatingImplemented: 0,
    },
  },
  linkage: {
    policies: 1,
    procedures: 1,
    operationalControls: 1,
    unmapped: false,
    unanchored: false,
  },
  hasChildren: true,
  childrenCount: 2,
});

// Shared policy node — appears under cc6.1 AND under the Acme policy catalog root.
const accessPolicy = node({
  key: 'policy:acme/access-control',
  nodeType: 'policy-control',
  catalogId: 'acme-policies',
  controlId: 'access-control',
  title: 'Access Control Policy',
  compliance: {
    totalControls: 6,
    satisfied: 4,
    notSatisfied: 1,
    unknown: 1,
    compliancePercent: 66.7,
    assessedPercent: 83.3,
  },
  risk: {
    openScoreSum: 8,
    mutedScoreSum: 5,
    counts: {
      open: 1,
      investigating: 0,
      mitigatingPlanned: 0,
      riskAccepted: 1,
      mitigatingImplemented: 1,
    },
  },
  linkage: {
    policies: 0,
    procedures: 1,
    operationalControls: 2,
    unmapped: false,
    unanchored: false,
  },
  hasChildren: true,
  childrenCount: 1,
});

const accessReview = node({
  key: 'procedure:acme/access-review',
  nodeType: 'procedure-control',
  catalogId: 'acme-procedures',
  controlId: 'access-review',
  title: 'Quarterly Access Review Procedure',
  compliance: {
    totalControls: 3,
    satisfied: 2,
    notSatisfied: 0,
    unknown: 1,
    compliancePercent: 66.7,
    assessedPercent: 66.7,
  },
  risk: {
    openScoreSum: 3,
    mutedScoreSum: 0,
    counts: {
      open: 1,
      investigating: 0,
      mitigatingPlanned: 0,
      riskAccepted: 0,
      mitigatingImplemented: 0,
    },
  },
  linkage: {
    policies: 1,
    procedures: 0,
    operationalControls: 1,
    unmapped: false,
    unanchored: false,
  },
  hasChildren: false,
  childrenCount: 0,
});

const mfaControl = node({
  key: 'control:op/mfa-enforced',
  nodeType: 'control',
  catalogId: 'operational',
  controlId: 'mfa-enforced',
  title: 'MFA Enforced on All Admin Accounts',
  compliance: {
    totalControls: 1,
    satisfied: 0,
    notSatisfied: 1,
    unknown: 0,
    compliancePercent: 0,
    assessedPercent: 100,
  },
  risk: {
    openScoreSum: 55,
    mutedScoreSum: 0,
    counts: {
      open: 5,
      investigating: 0,
      mitigatingPlanned: 1,
      riskAccepted: 0,
      mitigatingImplemented: 0,
    },
  },
  linkage: {
    policies: 1,
    procedures: 0,
    operationalControls: 0,
    unmapped: true,
    unanchored: false,
  },
  hasChildren: false,
  childrenCount: 0,
});

const acmePolicies = node({
  key: 'policy-catalog:acme',
  nodeType: 'policy-catalog',
  catalogId: 'acme-policies',
  title: 'Acme Corporate Policies',
  compliance: {
    totalControls: 18,
    satisfied: 11,
    notSatisfied: 3,
    unknown: 4,
    compliancePercent: 61.1,
    assessedPercent: 77.8,
  },
  risk: {
    openScoreSum: 8,
    mutedScoreSum: 5,
    counts: {
      open: 1,
      investigating: 0,
      mitigatingPlanned: 0,
      riskAccepted: 1,
      mitigatingImplemented: 1,
    },
  },
  linkage: {
    policies: 2,
    procedures: 0,
    operationalControls: 4,
    unmapped: false,
    unanchored: false,
  },
  hasChildren: true,
  childrenCount: 2,
});

const changeMgmt = node({
  key: 'policy:acme/change-management',
  nodeType: 'policy-control',
  catalogId: 'acme-policies',
  controlId: 'change-management',
  title: 'Change Management Policy',
  compliance: {
    totalControls: 5,
    satisfied: 5,
    notSatisfied: 0,
    unknown: 0,
    compliancePercent: 100,
    assessedPercent: 100,
  },
  risk: {
    openScoreSum: 0,
    mutedScoreSum: 0,
    counts: {
      open: 0,
      investigating: 0,
      mitigatingPlanned: 0,
      riskAccepted: 0,
      mitigatingImplemented: 0,
    },
  },
  linkage: {
    policies: 0,
    procedures: 0,
    operationalControls: 1,
    unmapped: false,
    unanchored: false,
  },
  hasChildren: false,
  childrenCount: 0,
});

// Unanchored policy root — not linked to any standard → warning indicator.
const orphanPolicy = node({
  key: 'policy-catalog:vendor',
  nodeType: 'policy-catalog',
  catalogId: 'vendor-policies',
  title: 'Vendor Management Policy (unlinked)',
  compliance: {
    totalControls: 4,
    satisfied: 1,
    notSatisfied: 2,
    unknown: 1,
    compliancePercent: 25,
    assessedPercent: 75,
  },
  risk: {
    openScoreSum: 15,
    mutedScoreSum: 0,
    counts: {
      open: 2,
      investigating: 0,
      mitigatingPlanned: 0,
      riskAccepted: 0,
      mitigatingImplemented: 0,
    },
  },
  linkage: {
    policies: 0,
    procedures: 0,
    operationalControls: 0,
    unmapped: false,
    unanchored: true,
  },
  hasChildren: false,
  childrenCount: 0,
});

const acmeProcedures = node({
  key: 'procedure-catalog:acme',
  nodeType: 'procedure-catalog',
  catalogId: 'acme-procedures',
  title: 'Acme Operating Procedures',
  compliance: {
    totalControls: 9,
    satisfied: 6,
    notSatisfied: 1,
    unknown: 2,
    compliancePercent: 66.7,
    assessedPercent: 77.8,
  },
  risk: {
    openScoreSum: 3,
    mutedScoreSum: 2,
    counts: {
      open: 1,
      investigating: 0,
      mitigatingPlanned: 0,
      riskAccepted: 1,
      mitigatingImplemented: 0,
    },
  },
  linkage: {
    policies: 1,
    procedures: 0,
    operationalControls: 3,
    unmapped: false,
    unanchored: false,
  },
  hasChildren: true,
  childrenCount: 1,
});

// --- graph wiring -----------------------------------------------------------

const ALL_ROOTS: LineageNode[] = [
  soc2,
  acmePolicies,
  orphanPolicy,
  acmeProcedures,
];

const CHILDREN: Record<string, LineageNode[]> = {
  'standard-catalog:soc2': [ccGroup],
  'group:soc2/cc': [cc61],
  'control:soc2/cc6.1': [accessPolicy, accessReview],
  'policy:acme/access-control': [mfaControl],
  'policy-catalog:acme': [accessPolicy, changeMgmt],
  'policy-catalog:vendor': [],
  'procedure-catalog:acme': [accessReview],
};

/** Which root type bucket a node belongs to, for the `types` scope filter. */
function rootType(
  n: LineageNode,
): 'standard' | 'policy' | 'procedure' | 'other' {
  if (n.nodeType === 'standard-catalog') return 'standard';
  if (n.nodeType === 'policy-catalog') return 'policy';
  if (n.nodeType === 'procedure-catalog') return 'procedure';
  return 'other';
}

/**
 * Fixture roots, filtered by the `types` scope. SSP/component scope only nudges
 * the numbers slightly so switching SSP visibly changes them in the demo.
 */
export function fixtureRoots(scope: LineageScope = {}): LineageNode[] {
  const types =
    scope.types && scope.types.length
      ? scope.types
      : ['standard', 'policy', 'procedure'];
  const roots = ALL_ROOTS.filter((n) => types.includes(rootType(n)));
  return roots.map((n) => scopeAdjust(n, scope));
}

/** Fixture children for a node key (empty array if unknown/leaf). */
export function fixtureChildren(
  key: string,
  scope: LineageScope = {},
): LineageNode[] {
  return (CHILDREN[key] ?? []).map((n) => scopeAdjust(n, scope));
}

// Deterministically perturb metrics per SSP so the demo shows scope changes moving
// the numbers (acceptance criterion 4) without needing a live backend.
function scopeAdjust(n: LineageNode, scope: LineageScope): LineageNode {
  const sspId = scope.sspId ?? '';
  if (!sspId) return n;
  let seed = 0;
  for (let i = 0; i < sspId.length; i++)
    seed = (seed + sspId.charCodeAt(i)) % 17;
  if (seed === 0) return n;
  const bump = (v: number, max = Infinity) =>
    Math.max(0, Math.min(max, v + ((seed % 5) - 2)));
  return {
    ...n,
    compliance: {
      ...n.compliance,
      compliancePercent: Math.max(
        0,
        Math.min(
          100,
          Math.round((n.compliance.compliancePercent + seed) % 100),
        ),
      ),
    },
    risk: {
      ...n.risk,
      openScoreSum: bump(n.risk.openScoreSum + seed),
    },
  };
}

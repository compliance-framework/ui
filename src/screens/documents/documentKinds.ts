import { RESOURCES } from '@/constants/permissions';
import type { IconName } from '@/ds/components/Icon/icons';

/**
 * The OSCAL document lists that share one screen (DocumentListScreen): component definitions,
 * profiles, assessment plans, assessment results and POA&Ms. Each entry says where its documents
 * come from and where each opens; `active` names the system-store slot for the classic "Set"
 * action that makes a document the one other pages work with.
 */
export interface DocumentListConfig {
  title: string;
  description: string;
  /** Nouns for counts and states, e.g. "profile" and "profiles". */
  singular: string;
  subject: string;
  endpoint: string;
  /** The full OSCAL document, for Download source. Omit when there is no full export. */
  fullEndpoint?: (id: string) => string;
  /** File name suffix for downloads, e.g. "ap" gives "Title-ap.json". */
  fileSuffix: string;
  detailRoute: string;
  createRoute: string;
  createLabel: string;
  resource: string;
  active?: 'assessmentPlan' | 'assessmentResults' | 'poam';
  emptyBody: string;
  icon: IconName;
  /** Extra page actions, e.g. Profiles' "Build profile from props". */
  links?: { label: string; route: string }[];
}

export const DOCUMENT_LISTS: Record<string, DocumentListConfig> = {
  'component-definitions': {
    icon: 'definitions',
    title: 'Component Definitions',
    description:
      'Reusable descriptions of components and the controls they help satisfy.',
    singular: 'component definition',
    subject: 'component definitions',
    endpoint: '/api/oscal/component-definitions',
    fullEndpoint: (id) => `/api/oscal/component-definitions/${id}/full`,
    fileSuffix: 'component-definition',
    detailRoute: 'component-definition-overview',
    createRoute: 'component-definition-create',
    createLabel: 'New component definition',
    resource: RESOURCES.COMPONENT_DEFINITION,
    emptyBody:
      'A component definition describes a product or service and how it implements controls, so systems can reuse it.',
  },
  'profile-list': {
    icon: 'profiles',
    title: 'Profiles',
    description: 'Selections of catalog controls that systems implement.',
    singular: 'profile',
    subject: 'profiles',
    endpoint: '/api/oscal/profiles',
    fileSuffix: 'profile',
    detailRoute: 'profile:view-controls',
    createRoute: 'profile:create',
    createLabel: 'New profile',
    resource: RESOURCES.PROFILE,
    emptyBody:
      'A profile selects and tailors controls from one or more catalogs; systems attach profiles to decide what they implement.',
    links: [
      { label: 'Build profile from props', route: 'profile-build-props' },
    ],
  },
  'assessment-plans': {
    icon: 'assessments',
    title: 'Assessment Plans',
    description: 'Plans for assessing systems against their controls.',
    singular: 'assessment plan',
    subject: 'assessment plans',
    endpoint: '/api/oscal/assessment-plans',
    fullEndpoint: (id) => `/api/oscal/assessment-plans/${id}/full`,
    fileSuffix: 'ap',
    detailRoute: 'assessment-plan-overview',
    createRoute: 'assessment-plan-create',
    createLabel: 'New assessment plan',
    resource: RESOURCES.ASSESSMENT_PLAN,
    active: 'assessmentPlan',
    emptyBody:
      'An assessment plan sets out how a system will be assessed: scope, tasks and methods.',
  },
  'assessment-results': {
    icon: 'assessments',
    title: 'Assessment Results',
    description: 'The outcomes of assessments.',
    singular: 'assessment results',
    subject: 'assessment results',
    endpoint: '/api/oscal/assessment-results',
    fullEndpoint: (id) => `/api/oscal/assessment-results/${id}/full`,
    fileSuffix: 'ar',
    detailRoute: 'assessment-results-overview',
    createRoute: 'assessment-results-create',
    createLabel: 'New assessment results',
    resource: RESOURCES.ASSESSMENT_RESULTS,
    active: 'assessmentResults',
    emptyBody:
      'Assessment results record what an assessment found, for one or more assessment plans.',
  },
  'plan-of-action-and-milestones': {
    icon: 'assessments',
    title: 'Plans of Action and Milestones',
    description:
      'POA&M documents tracking findings and the work to address them.',
    singular: 'POA&M',
    subject: 'POA&Ms',
    endpoint: '/api/oscal/plan-of-action-and-milestones',
    fullEndpoint: (id) => `/api/oscal/plan-of-action-and-milestones/${id}/full`,
    fileSuffix: 'poam',
    detailRoute: 'plan-of-action-and-milestones-overview',
    createRoute: 'plan-of-action-and-milestones-create',
    createLabel: 'New POA&M',
    resource: RESOURCES.POAM_OSCAL,
    active: 'poam',
    emptyBody:
      'A plan of action and milestones (POA&M) tracks a system’s known weaknesses and the planned work to resolve them.',
  },
};

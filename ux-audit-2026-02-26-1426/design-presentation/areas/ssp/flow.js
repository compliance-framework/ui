export const FLOW_ORDER = [
  'MRRzf',
  'WnWY8',
  '4C6aJ',
  'rWalh',

  'fC9h5',
  'iuqz3',
  'zB9eT',
  'tyWSH',
  'WNbFS',
  'Q7gWr',

  'MksAD',
  'vmTna',
  'RLAx1',
  'guPZ7',
  '0CQ4i',
  '3f0ut',
  'W1WOY',
  'PY7Eb',
  'aS9Xz',
  'BdGzo',
  'YcMfm',
  'rkITp',
  'B2lar',
  'qhM7P',
  'vOztv',
  'qBPCx',
  'g6xuv',

  'oSoOH',
  'hY9bO',
  'ZYyJ2',
  'DXM45',
  'cNhnM',

  'eo4Hs',
  'lhWmx',
  'Xqr5P',
  'nltDK',
  'yB7qt',

  'DUJ4o',
  'wZAR6',
  'fbqHx',

  'GVyJ6',
  'xXlQe',
  'sz82E',
  '6Fxgw',
  '8rj9D',
  'qzt33',
  'ZCaQk',

  'kcUBb',
  'JpgBg',
  'F4yZl',
  'iFWxz',
  'GmRZ5',
  '1VChN',
  'Km273',
];

export const FLOW_NOTES = {
  MRRzf: {
    section: 'SSP Library',
    summary: 'Primary list of all SSPs and row-level actions.',
    oldUi: [
      'Old UI uses a simple table (Title, Version, Last Modified, Actions) in SystemSecurityPlanListView.vue.',
      'Each row provides View, JSON download, and Set Active actions.',
    ],
    newDesign: [
      'New design frames this as a System Security Plan Library with clearer page hierarchy.',
      'Row actions stay visible as VIEW, JSON, and SET with active-plan status surfaced inline.',
    ],
    why: [
      'Improve scanability and reduce clicks for common list tasks.',
      'Make active-plan context obvious at a glance.',
    ],
  },
  WnWY8: {
    section: 'SSP Library States',
    summary: 'Loading state for the SSP library list.',
    oldUi: [
      'Old UI shows a single Loading row inside the table body.',
      'Users get little context about what is being fetched.',
    ],
    newDesign: [
      'New design uses a dedicated loading state card while preserving page structure.',
      'Message clarifies the system is fetching plans and active status.',
    ],
    why: [
      'Reduce ambiguity between loading and empty states.',
      'Keep layout stable during fetches.',
    ],
  },
  '4C6aJ': {
    section: 'SSP Library States',
    summary: 'Error state when SSP list retrieval fails.',
    oldUi: [
      'Old UI renders an inline table error row and may expose raw error text.',
      'Error treatment is tied to table markup rather than a reusable pattern.',
    ],
    newDesign: [
      'New design uses a standardized error state card with concise copy.',
      'Recovery guidance is explicit: check API availability and retry.',
    ],
    why: [
      'Make failures clearer and more actionable.',
      'Align error UX with other SSP pages.',
    ],
  },
  rWalh: {
    section: 'SSP Library States',
    summary: 'Empty state when no SSPs are available.',
    oldUi: [
      'Old UI shows a plain No System Security Plans found row.',
      'No directional guidance is provided in-context.',
    ],
    newDesign: [
      'New design uses a dedicated empty state card with neutral guidance.',
      'Library page hierarchy remains visible even with zero results.',
    ],
    why: [
      'Avoid dead-end feeling when no data is present.',
      'Improve first-time comprehension for reviewers.',
    ],
  },

  fC9h5: {
    section: 'SSP Detail / Overview',
    summary: 'Default overview for an active SSP.',
    oldUi: [
      'Old overview is metadata-heavy with a separate Actions card and mixed CTA styles.',
      'Profile selection exists but compliance context is not surfaced as the primary overview signal.',
    ],
    newDesign: [
      'New overview uses a unified SSP shell with persistent meta row, profile context, and structured cards.',
      'Compliance preview and key implementation counts are surfaced early on the overview page.',
    ],
    why: [
      'Prioritize decision-driving context at the top of the journey.',
      'Create a consistent information hierarchy across all SSP tabs.',
    ],
  },
  iuqz3: {
    section: 'SSP Detail / Overview States',
    summary: 'Profile switcher expanded in the SSP header context.',
    oldUi: [
      'Old profile selection is embedded in overview form fields.',
      'Changing profile feels like editing metadata rather than changing page context.',
    ],
    newDesign: [
      'New design exposes profile switching in the persistent header meta row.',
      'Expanded state makes profile options visible without leaving current workflow context.',
    ],
    why: [
      'Treat profile as global SSP context, not a nested form field.',
      'Reduce friction when comparing compliance context.',
    ],
  },
  zB9eT: {
    section: 'SSP Detail / Overview States',
    summary: 'No-profile state for Overview and compliance preview.',
    oldUi: [
      'Old UI often reveals missing profile only after entering Compliance.',
      'Overview does not strongly call out missing prerequisite state.',
    ],
    newDesign: [
      'New design highlights NO PROFILE directly in overview context.',
      'State card and selector CTA make remediation path obvious.',
    ],
    why: [
      'Prevent confusion about why compliance appears unavailable.',
      'Expose prerequisites where users expect outcomes.',
    ],
  },
  tyWSH: {
    section: 'SSP Detail / Overview States',
    summary: 'Loading treatment for overview-level data and preview panels.',
    oldUi: [
      'Old overview can appear partially populated while dependent calls finish.',
      'Loading cues are lightweight and not always localized to affected sections.',
    ],
    newDesign: [
      'New design preserves full page chrome and uses focused loading cards where data is pending.',
      'Users keep orientation while waiting for key overview signals.',
    ],
    why: [
      'Reduce perceived jank and layout shift.',
      'Distinguish pending data from missing data.',
    ],
  },
  WNbFS: {
    section: 'SSP Detail / Overview States',
    summary: 'No-data state for overview-level compliance preview context.',
    oldUi: [
      'Old UI typically surfaces no-compliance-data only in the Compliance tab.',
      'Overview gives limited explanation when downstream data is absent.',
    ],
    newDesign: [
      'New design surfaces a no-data card directly in overview preview context.',
      'Profile control remains visible so users can quickly test alternate context.',
    ],
    why: [
      'Shorten feedback loop by surfacing status earlier.',
      'Clarify that the issue is data availability, not navigation error.',
    ],
  },
  Q7gWr: {
    section: 'SSP Detail / Characteristics',
    summary: 'Characteristics and diagram management view.',
    oldUi: [
      'Old characteristics page emphasizes read-only metrics and summary cards.',
      'Diagram workflows are split across routes and less action-forward in this view.',
    ],
    newDesign: [
      'New design keeps metrics but adds explicit diagram actions including ADD DIAGRAM and EDIT.',
      'Diagram management sits in the same characteristics surface with clearer action labels.',
    ],
    why: [
      'Unify visibility and editability for architecture artifacts.',
      'Improve discoverability of diagram maintenance actions.',
    ],
  },

  MksAD: {
    section: 'SSP Detail / Implementation',
    summary: 'Implementation overview tab shell with sub-tabs.',
    oldUi: [
      'Old system implementation editor has its own tab system and dense dashboard sections.',
      'Overview edits happen in-place and are mixed with other implementation widgets.',
    ],
    newDesign: [
      'New design standardizes implementation into numbered sub-tabs inside SSP detail shell.',
      'Overview content is separated into a focused panel plus persistent side context.',
    ],
    why: [
      'Improve structure and comparability across implementation areas.',
      'Reduce cognitive load in high-density pages.',
    ],
  },
  vmTna: {
    section: 'SSP Detail / Implementation / Overview',
    summary: 'Overview in explicit editing state.',
    oldUi: [
      'Old overview edit mode toggles controls within the same long section.',
      'Edit/save/cancel visibility is less pronounced during dense content.',
    ],
    newDesign: [
      'New design shows clear editing mode with dedicated CANCEL and SAVE actions in panel header.',
      'Field groups remain structured while keeping full implementation context visible.',
    ],
    why: [
      'Make editing intent unmistakable.',
      'Keep user orientation while changing implementation metadata.',
    ],
  },
  RLAx1: {
    section: 'SSP Detail / Implementation / Users',
    summary: 'Users list with create and row-level management actions.',
    oldUi: [
      'Old users management relies on modal create/edit forms and collapsible groups.',
      'Action affordances vary across implementation sections.',
    ],
    newDesign: [
      'New design uses a consistent users panel with CREATE USER and uniform action chips.',
      'User details are structured into reusable card patterns for faster scanning.',
    ],
    why: [
      'Normalize CRUD ergonomics across implementation sub-tabs.',
      'Improve readability of role and privilege data.',
    ],
  },
  guPZ7: {
    section: 'SSP Detail / Implementation / Users States',
    summary: 'Loading state for users sub-tab.',
    oldUi: [
      'Old UI can appear blank while user data is loading.',
      'No dedicated users loading card in the sub-tab panel.',
    ],
    newDesign: [
      'New design keeps panel structure and shows a dedicated Loading users card.',
      'Helper text explains what data is being retrieved.',
    ],
    why: [
      'Differentiate loading from empty.',
      'Preserve confidence during asynchronous loads.',
    ],
  },
  '0CQ4i': {
    section: 'SSP Detail / Implementation / Users States',
    summary: 'Error state for users sub-tab.',
    oldUi: [
      'Old errors are often toast-based or implicit in missing list content.',
      'Recovery cues are not consistently in the panel itself.',
    ],
    newDesign: [
      'New design uses an in-panel error card with direct recovery guidance.',
      'Create action and tab context remain visible during error state.',
    ],
    why: [
      'Make failures explicit where they happen.',
      'Avoid misreading errors as empty datasets.',
    ],
  },
  '3f0ut': {
    section: 'SSP Detail / Implementation / Users States',
    summary: 'Empty state for users sub-tab.',
    oldUi: [
      'Old users empty handling is a simple inline message.',
      'Visual treatment differs from other implementation areas.',
    ],
    newDesign: [
      'New design uses a standard empty state card with explicit next step.',
      'CREATE USER remains anchored in the panel header.',
    ],
    why: [
      'Create predictable empty-state behavior across sub-tabs.',
      'Guide first user creation clearly.',
    ],
  },
  W1WOY: {
    section: 'SSP Detail / Implementation / Components',
    summary: 'Components list with status-rich rows and actions.',
    oldUi: [
      'Old components flow uses modal create/edit forms and collapsible cards.',
      'Dashboards and evidence linking are mostly in /system rather than SSP detail.',
    ],
    newDesign: [
      'New design keeps components in SSP detail with consistent card/action pattern.',
      'Status/type/protocol details are surfaced for quick triage.',
    ],
    why: [
      'Reduce route switching between SSP detail and system workspace.',
      'Improve scannability for component inventories.',
    ],
  },
  PY7Eb: {
    section: 'SSP Detail / Implementation / Components States',
    summary: 'Loading state for components sub-tab.',
    oldUi: [
      'Old components loading is not strongly distinguished from empty state.',
      'Users can see sparse content while data is still pending.',
    ],
    newDesign: [
      'New design uses a dedicated Loading components state card in the panel.',
      'Panel layout remains stable while data resolves.',
    ],
    why: [
      'Clarify progression from loading to populated state.',
      'Maintain consistent state language across sub-tabs.',
    ],
  },
  aS9Xz: {
    section: 'SSP Detail / Implementation / Components States',
    summary: 'Error state for components sub-tab.',
    oldUi: [
      'Old error handling relies on generic messages and toasts.',
      'Failure can be confused with no components.',
    ],
    newDesign: [
      'New design shows an explicit components error card with recovery guidance.',
      'Users keep panel actions and context visible.',
    ],
    why: [
      'Improve diagnosability from within the working surface.',
      'Prevent empty-vs-error ambiguity.',
    ],
  },
  BdGzo: {
    section: 'SSP Detail / Implementation / Components States',
    summary: 'Empty state for components sub-tab.',
    oldUi: [
      'Old components empty state is lightweight and inconsistent with other tabs.',
      'Guidance for next action is minimal.',
    ],
    newDesign: [
      'New design uses a dedicated empty card with explicit creation guidance.',
      'CREATE COMPONENT remains in a fixed panel header location.',
    ],
    why: [
      'Drive clear next action in no-data scenarios.',
      'Keep visual consistency across implementation states.',
    ],
  },
  YcMfm: {
    section: 'SSP Detail / Implementation / Authorizations',
    summary: 'Leveraged authorizations list and management.',
    oldUi: [
      'Old authorization CRUD relies on modal dialogs and collapsible card sections.',
      'Behavior overlaps with /system authorizations workflows and can drift.',
    ],
    newDesign: [
      'New design places leveraged authorization management directly in SSP implementation sub-tab.',
      'Cards keep party/date/remarks/properties in a consistent readable structure.',
    ],
    why: [
      'Consolidate SSP-specific authorization work in one route family.',
      'Reduce duplicated UX patterns and edge-case drift.',
    ],
  },
  rkITp: {
    section: 'SSP Detail / Implementation / Authorizations States',
    summary: 'Loading state for leveraged authorizations sub-tab.',
    oldUi: [
      'Old loading behavior is implicit and can look like a blank panel.',
      'No explicit explanation of what authorization data is being fetched.',
    ],
    newDesign: [
      'New design adds a clear loading card for leveraged authorizations.',
      'Panel shell and actions remain visible during load.',
    ],
    why: [
      'Improve confidence and state clarity.',
      'Standardize loading UX with users/components tabs.',
    ],
  },
  B2lar: {
    section: 'SSP Detail / Implementation / Authorizations States',
    summary: 'Error state for leveraged authorizations sub-tab.',
    oldUi: [
      'Old errors are not consistently shown in-panel for this sub-tab.',
      'Failure can appear as missing records.',
    ],
    newDesign: [
      'New design shows a dedicated error state card with recovery guidance.',
      'Context remains intact so users can continue navigation.',
    ],
    why: [
      'Differentiate failure from legitimate empty datasets.',
      'Provide immediate self-serve troubleshooting guidance.',
    ],
  },
  qhM7P: {
    section: 'SSP Detail / Implementation / Authorizations States',
    summary: 'Empty state for leveraged authorizations sub-tab.',
    oldUi: [
      'Old empty state is a minimal inline message.',
      'Purpose of leveraged authorizations is not always obvious to new reviewers.',
    ],
    newDesign: [
      'New design uses a clear empty card and explanatory helper text.',
      'CREATE AUTHORIZATION remains visible as the direct next step.',
    ],
    why: [
      'Improve onboarding for external inheritance workflows.',
      'Keep state patterns consistent across implementation panels.',
    ],
  },
  vOztv: {
    section: 'SSP Detail / Components Dashboards',
    summary:
      'Dashboards drawer listing linked dashboards for a selected component.',
    oldUi: [
      'Old dashboards/evidence linking lives under /system/components with route-param dependent drawer behavior.',
      'Linked dashboards and evidence actions are separate from SSP detail components surface.',
    ],
    newDesign: [
      'New design brings dashboard linking directly into SSP implementation components via side drawer.',
      'Linked dashboard rows expose VIEW EVIDENCE and UNLINK actions in-place.',
    ],
    why: [
      'Reduce context switching between /system and /system-security-plans routes.',
      'Keep component evidence workflows attached to the component list.',
    ],
  },
  qBPCx: {
    section: 'SSP Detail / Components Dashboards',
    summary: 'Drawer mode for linking an existing dashboard.',
    oldUi: [
      'Old link-existing mode is nested inside a mixed drawer with multiple menu states.',
      'Action intent can be obscured by mode switching complexity.',
    ],
    newDesign: [
      'New design uses a dedicated LINK EXISTING DASHBOARD mode with focused controls.',
      'Primary action and cancellation are clearly separated.',
    ],
    why: [
      'Lower error risk in dashboard association tasks.',
      'Make linking flow faster for reviewers/operators.',
    ],
  },
  g6xuv: {
    section: 'SSP Detail / Components Dashboards',
    summary: 'Drawer mode for creating a new evidence dashboard.',
    oldUi: [
      'Old create flow is available but embedded in a multipurpose drawer with dense controls.',
      'Filter generation logic is powerful but visually advanced for casual reviewers.',
    ],
    newDesign: [
      'New design gives create mode a dedicated form structure with clear field grouping.',
      'Generated filter and label-condition concepts are surfaced as explicit steps.',
    ],
    why: [
      'Make a complex creation workflow understandable at first read.',
      'Support cleaner stakeholder walkthroughs during demos.',
    ],
  },

  oSoOH: {
    section: 'SSP Detail / Controls',
    summary: 'Controls baseline view with requirement explorer and inspector.',
    oldUi: [
      'Old controls UI is a long nested page with many modal edit flows.',
      'Requirement, statement, and by-component details are heavily stacked in one scroll path.',
    ],
    newDesign: [
      'New design splits controls into explorer and inspector regions for focused navigation.',
      'Control implementation summary and requirement-level actions are more structured and discoverable.',
    ],
    why: [
      'Scale better for SSPs with many controls and nested records.',
      'Reduce modal fatigue and long-scroll editing friction.',
    ],
  },
  hY9bO: {
    section: 'SSP Detail / Controls States',
    summary: 'Loading state for controls page data.',
    oldUi: [
      'Old controls loading is mostly inline text in one section.',
      'Other areas may appear absent until load completes.',
    ],
    newDesign: [
      'New design keeps controls shell visible and places loading state in the main card.',
      'Message clarifies control implementation is still being fetched.',
    ],
    why: [
      'Preserve orientation while data resolves.',
      'Differentiate pending state from empty state.',
    ],
  },
  ZYyJ2: {
    section: 'SSP Detail / Controls States',
    summary: 'Error state for controls page data.',
    oldUi: [
      'Old controls errors are plain inline messages and can hide downstream sections.',
      'Recovery steps are not strongly emphasized in-page.',
    ],
    newDesign: [
      'New design uses a dedicated controls error card with concise guidance.',
      'The page frame remains stable during failure states.',
    ],
    why: [
      'Improve recoverability and readability during API failures.',
      'Maintain consistent state language across tabs.',
    ],
  },
  DXM45: {
    section: 'SSP Detail / Controls States',
    summary: 'No-data state for control implementation surface.',
    oldUi: [
      'Old no-data state is a short inline sentence with limited path forward.',
      'The controls workspace can feel collapsed when core objects are missing.',
    ],
    newDesign: [
      'New design presents no-data as a dedicated state card in normal page flow.',
      'Controls shell stays intact to support orientation and future action placement.',
    ],
    why: [
      'Treat no-data as a first-class UX scenario.',
      'Reduce dead-end feeling for onboarding SSPs.',
    ],
  },
  cNhnM: {
    section: 'SSP Detail / Controls States',
    summary: 'Empty requirements state within controls explorer.',
    oldUi: [
      'Old requirements empty message sits inline beneath Add Requirement.',
      'Creation starts via modal dialog from this state.',
    ],
    newDesign: [
      'New design keeps ADD REQUIREMENT in a fixed list header with a dedicated empty treatment.',
      'State remains inside the explorer structure rather than replacing the full page.',
    ],
    why: [
      'Preserve task continuity when requirements count is zero.',
      'Make first-action affordance prominent and stable.',
    ],
  },

  eo4Hs: {
    section: 'SSP Detail / Compliance',
    summary: 'Compliance baseline view for attached SSP profile context.',
    oldUi: [
      'Old compliance view uses ComplianceProgressPanel with summary, groups, and controls table.',
      'No-profile and no-data cases are shown as simple dashed info blocks.',
    ],
    newDesign: [
      'New design keeps summary metrics and group detail but in a tighter card hierarchy.',
      'Controls and groups expose clearer action affordances and evidence readability.',
    ],
    why: [
      'Improve compliance triage speed for reviewers.',
      'Align visual hierarchy with other SSP detail tabs.',
    ],
  },
  lhWmx: {
    section: 'SSP Detail / Compliance States',
    summary: 'Loading state for compliance data.',
    oldUi: [
      'Old UI shows a generic loading header while profile/compliance requests run.',
      'State context can feel sparse during multi-step fetch.',
    ],
    newDesign: [
      'New design uses an in-flow loading card under Compliance tab.',
      'Messaging clarifies profile compliance data is being fetched.',
    ],
    why: [
      'Reduce uncertainty during asynchronous profile resolution.',
      'Keep compliance location/context visible.',
    ],
  },
  Xqr5P: {
    section: 'SSP Detail / Compliance States',
    summary: 'No-profile state for compliance tab.',
    oldUi: [
      'Old no-profile message is functional but visually distinct from other states.',
      'Guidance points users back to Overview to attach profile.',
    ],
    newDesign: [
      'New design uses a standardized state card with info styling and concise guidance.',
      'Copy clearly ties remediation to profile attachment.',
    ],
    why: [
      'Make prerequisite gaps obvious and consistent.',
      'Avoid misinterpreting missing profile as system error.',
    ],
  },
  nltDK: {
    section: 'SSP Detail / Compliance States',
    summary: 'No-data state when compliance results are unavailable.',
    oldUi: [
      'Old no-data handling is a simple fallback text block.',
      'It can be unclear whether data is pending or truly absent.',
    ],
    newDesign: [
      'New design uses an explicit no-data card in normal content order.',
      'Helper text clarifies that results depend on available profile data.',
    ],
    why: [
      'Reduce ambiguity in assessment availability.',
      'Improve consistency with other state cards.',
    ],
  },
  yB7qt: {
    section: 'SSP Detail / Compliance States',
    summary: 'Error state for compliance data retrieval.',
    oldUi: [
      'Old compliance errors are often toast-driven and easy to miss later.',
      'In-page error persistence is limited.',
    ],
    newDesign: [
      'New design uses a persistent in-page error card with clear recovery text.',
      'State styling matches other SSP error surfaces.',
    ],
    why: [
      'Make failures visible without relying on transient toasts.',
      'Provide immediate in-context troubleshooting guidance.',
    ],
  },

  DUJ4o: {
    section: 'SSP Detail / JSON',
    summary: 'Full SSP JSON surface with copy and download actions.',
    oldUi: [
      'Old JSON tab already supports Download JSON and Copy JSON actions.',
      'Presentation is functional but less integrated with overall SSP shell hierarchy.',
    ],
    newDesign: [
      'New design keeps JSON actions in this tab only, with clearer card framing and metadata context.',
      'Code view styling and action placement are aligned with redesign conventions.',
    ],
    why: [
      'Preserve parity while improving readability and consistency.',
      'Keep export/copy behavior scoped to the JSON tab.',
    ],
  },
  wZAR6: {
    section: 'SSP Detail / JSON States',
    summary: 'Loading state for full SSP JSON retrieval.',
    oldUi: [
      'Old loading message appears inside JSON card as plain text.',
      'State treatment differs from other tab-level loading patterns.',
    ],
    newDesign: [
      'New design uses standardized loading state card under JSON tab context.',
      'Message clarifies full SSP JSON payload is being fetched.',
    ],
    why: [
      'Normalize loading feedback across SSP detail tabs.',
      'Improve perceived stability during large payload fetches.',
    ],
  },
  fbqHx: {
    section: 'SSP Detail / JSON States',
    summary: 'Error state for full SSP JSON retrieval.',
    oldUi: [
      'Old JSON errors combine inline text and toast notifications.',
      'Actionability is not always clear from the inline message.',
    ],
    newDesign: [
      'New design uses a persistent JSON error card with explicit retry guidance.',
      'Error visuals and copy align with compliance and implementation error patterns.',
    ],
    why: [
      'Improve consistency and recoverability.',
      'Make JSON failures easy to understand in demos/reviews.',
    ],
  },

  GVyJ6: {
    section: 'Focused Editor / Implementation',
    summary: 'Focused page mode for editing a system user.',
    oldUi: [
      'Old user edit opens in a modal dialog from implementation users tab.',
      'Complex role/privilege edits happen in constrained modal space.',
    ],
    newDesign: [
      'New design promotes user edit to a full focused page with breadcrumb context.',
      'Header actions are explicit and consistent: BACK and SAVE USER.',
    ],
    why: [
      'Reduce modal complexity for nested user data.',
      'Make entry and exit points clearer during review.',
    ],
  },
  xXlQe: {
    section: 'Focused Editor / Implementation',
    summary: 'Focused page mode for creating a system user.',
    oldUi: [
      'Old create user flow opens in modal with form fields and UUID handling.',
      'Context can be lost behind the modal overlay.',
    ],
    newDesign: [
      'New design uses full-page create flow with clear section grouping.',
      'Actions are stable in page header: BACK and CREATE USER.',
    ],
    why: [
      'Improve form legibility for first-time creation tasks.',
      'Provide stronger context continuity across create/edit flows.',
    ],
  },
  sz82E: {
    section: 'Focused Editor / Implementation',
    summary: 'Focused page mode for editing a component.',
    oldUi: [
      'Old component edit runs in modal dialog from components tab.',
      'Protocol and status details can require heavy scrolling inside modal boundaries.',
    ],
    newDesign: [
      'New design uses a full-page editor with structured cards for component fields.',
      'Breadcrumb context identifies SSP and implementation location while editing.',
    ],
    why: [
      'Support denser component forms with better readability.',
      'Standardize implementation edit workflows.',
    ],
  },
  '6Fxgw': {
    section: 'Focused Editor / Implementation',
    summary: 'Focused page mode for creating a component.',
    oldUi: [
      'Old create component flow is modal-based and compact.',
      'New users can lose route context while entering complex fields.',
    ],
    newDesign: [
      'New design uses focused page creation with grouped inputs and clear primary action.',
      'Flow mirrors edit mode to reduce relearning.',
    ],
    why: [
      'Improve consistency between create and edit experiences.',
      'Reduce error risk in multi-field component creation.',
    ],
  },
  '8rj9D': {
    section: 'Focused Editor / Implementation',
    summary: 'Focused page mode for editing a leveraged authorization.',
    oldUi: [
      'Old authorization editing opens in modal dialog from authorizations tab.',
      'Nested props/links fields can be cramped in modal layout.',
    ],
    newDesign: [
      'New design uses a dedicated full-page editor with card-based sections.',
      'Header actions and breadcrumbs remain consistent with other focused editors.',
    ],
    why: [
      'Improve clarity for external inheritance data editing.',
      'Align authorization editing with broader focused-editor strategy.',
    ],
  },
  qzt33: {
    section: 'Focused Editor / Implementation',
    summary: 'Focused page mode for creating a leveraged authorization.',
    oldUi: [
      'Old create authorization flow is modal-based in implementation tab.',
      'Creation context can feel detached from surrounding implementation narrative.',
    ],
    newDesign: [
      'New design introduces a focused creation page with clear field groupings and actions.',
      'BACK and CREATE AUTHORIZATION mirror other focused creation flows.',
    ],
    why: [
      'Provide consistent and teachable creation patterns.',
      'Improve reviewer comprehension during walkthroughs.',
    ],
  },
  ZCaQk: {
    section: 'Focused Editor / Implementation',
    summary: 'Focused page mode for editing implementation overview.',
    oldUi: [
      'Old implementation overview edits happen inline inside the implementation editor tab.',
      'Action emphasis is lighter in dense mixed-content contexts.',
    ],
    newDesign: [
      'New design uses a dedicated page for overview edits with strong context breadcrumbs.',
      'Header-level BACK and SAVE actions clearly define edit mode.',
    ],
    why: [
      'Increase edit clarity for high-level implementation metadata.',
      'Keep editing pattern consistent across all focused pages.',
    ],
  },

  kcUBb: {
    section: 'Focused Editor / Controls',
    summary: 'Focused page mode for editing an implemented requirement.',
    oldUi: [
      'Old requirement editing uses modal dialog from controls list.',
      'Properties and links are edited in a long modal flow.',
    ],
    newDesign: [
      'New design uses a full focused page with explicit BACK and SAVE REQUIREMENT actions.',
      'Requirement fields are grouped into Basics, Properties, and Links cards.',
    ],
    why: [
      'Make complex requirement edits easier to review and complete.',
      'Replace modal-heavy flow with consistent page-level editing.',
    ],
  },
  JpgBg: {
    section: 'Focused Editor / Controls',
    summary: 'Focused page mode for creating an implemented requirement.',
    oldUi: [
      'Old requirement creation is modal-based and includes manual UUID generation controls.',
      'Context around parent controls is limited during modal entry.',
    ],
    newDesign: [
      'New design uses focused page creation with clear control context and grouped fields.',
      'Primary action is CREATE REQUIREMENT with consistent navigation affordance.',
    ],
    why: [
      'Simplify first-time requirement creation flow.',
      'Align creation ergonomics with edit ergonomics.',
    ],
  },
  F4yZl: {
    section: 'Focused Editor / Controls',
    summary: 'Focused page mode for editing a statement.',
    oldUi: [
      'Old statement edits happen in modal dialog while related by-component edits use other patterns.',
      'Editing experience differs by entity depth.',
    ],
    newDesign: [
      'New design gives statements a dedicated focused editor with explicit context.',
      'Field groups and actions follow the same pattern as requirements.',
    ],
    why: [
      'Unify controls entity editing interactions.',
      'Reduce confusion between statement and by-component edit paths.',
    ],
  },
  iFWxz: {
    section: 'Focused Editor / Controls',
    summary: 'Focused page mode for creating a statement.',
    oldUi: [
      'Old statement creation is modal-based and tightly coupled to list context.',
      'Creation controls are less explicit for review audiences.',
    ],
    newDesign: [
      'New design uses full-page statement creation with consistent field group layout.',
      'Header actions clearly separate exit and create intents.',
    ],
    why: [
      'Improve clarity and consistency across create flows.',
      'Support better stakeholder walkthroughs of statement lifecycle.',
    ],
  },
  GmRZ5: {
    section: 'Focused Editor / Controls',
    summary: 'Focused page mode for editing control implementation details.',
    oldUi: [
      'Old control implementation editing is modal-based with dense set-parameter fields.',
      'Large parameter sets can feel cramped in modal dimensions.',
    ],
    newDesign: [
      'New design promotes control implementation edit to a full focused page.',
      'Description and parameter groups are separated into readable cards.',
    ],
    why: [
      'Improve usability for high-density parameter editing.',
      'Maintain consistent page-level editing model.',
    ],
  },
  '1VChN': {
    section: 'Focused Editor / Controls',
    summary: 'Focused page mode for editing by-component data.',
    oldUi: [
      'Old by-component editing uses mixed patterns (modal at requirement level, inline editor at statement level).',
      'Complex nested collections are difficult to navigate in constrained surfaces.',
    ],
    newDesign: [
      'New design uses a dedicated by-component editor page with full breadcrumb context.',
      'Complex sections are grouped into explicit cards with consistent header actions.',
    ],
    why: [
      'Unify the most complex controls editing workflow.',
      'Reduce risk and improve legibility for nested implementation details.',
    ],
  },
  Km273: {
    section: 'Focused Editor / Controls',
    summary: 'Focused page mode for creating by-component data.',
    oldUi: [
      'Old controls flow lacks a clear dedicated create-by-component page flow.',
      'Creation affordances are fragmented and in some cases disabled.',
    ],
    newDesign: [
      'New design introduces explicit create-by-component page with clear context and actions.',
      'Creation layout mirrors edit layout for consistency.',
    ],
    why: [
      'Fill a notable workflow gap in controls creation parity.',
      'Provide a complete and teachable by-component lifecycle.',
    ],
  },
};

# Controls (/controls)

## Findings

### Issue ID: A4-UX-EVID-01

- Title: Controls is fully blocked until an SSP is selected
- Area/Module: Controls
- Route/URL: /controls
- Preconditions: Logged in; no System Security Plan selected
- Steps to reproduce:
  1. Log in.
  2. Visit `/controls`.
- Expected vs Actual:
  - Expected: Clear explanation of the prerequisite and a direct path to fix it.
  - Actual: Page shows an alert gate; the only next step is a link labeled “SSP Page” (requires prior knowledge of SSP).
- Impact: First-time users hit a hard stop; time-to-first-success depends on knowing what “SSP” means and where it lives.
- Severity: P1
- Heuristic tags (1-3): Feedback/Status, Navigation/IA, Content/Copy
- Evidence: desktop**controls**controls**fresh-no-ssp**01.png
- Recommendation: Expand the message to define SSP in plain language and offer a primary CTA like “Select a System Security Plan” (with a consistent destination and a way to see/change the current selection).
- Notes:

### Issue ID: A4-UX-EVID-02

- Title: Second gate: selected SSP without a linked profile blocks Controls with unclear recovery path
- Area/Module: Controls
- Route/URL: /controls
- Preconditions: Logged in; SSP is set to one that has no linked profile
- Steps to reproduce:
  1. Go to `/system-security-plans` and click “Set” on an SSP.
  2. Visit `/controls`.
- Expected vs Actual:
  - Expected: Guidance that points directly to the fix (link/select a profile for the selected SSP) with the most direct CTA.
  - Actual: Alert says “Your selected SSP does not have a linked profile” and sends the user to “System Page,” which doesn’t clearly indicate where/how to link a profile.
- Impact: Users can think Controls is broken even after satisfying the “SSP selected” prerequisite; creates a confusing two-step prerequisite chain.
- Severity: P1
- Heuristic tags (1-3): Error Recovery, Navigation/IA, Feedback/Status
- Evidence: desktop**controls**system-security-plans**configured-ssp-switch**03.png, desktop**controls**controls**configured-no-profile**22.png
- Recommendation: Provide a direct CTA to the specific corrective action (e.g., “Link a profile” / “Choose a different SSP”) and include the currently-selected SSP name in the alert so users can understand what’s blocking them.
- Notes:

### Issue ID: A4-UX-EVID-03

- Title: Controls landing state reads as “empty” until a group is expanded
- Area/Module: Controls
- Route/URL: /controls
- Preconditions: Logged in; SSP selected with a linked profile
- Steps to reproduce:
  1. Visit `/controls`.
  2. Do not expand any control group.
- Expected vs Actual:
  - Expected: A clear first action and/or a meaningful default view.
  - Actual: The page shows a large search bar and a short list of groups with significant unused space, with no instruction like “Select a group to view controls.”
- Impact: Users may not realize the list is expandable, or may assume content failed to load.
- Severity: P2
- Heuristic tags (1-3): Visual Hierarchy, Feedback/Status, Efficiency
- Evidence: desktop**controls**controls**configured**01.png
- Recommendation: Add a lightweight empty/placeholder panel (“Choose a group to view controls”), and consider auto-expanding the first group or persisting the last-open group.
- Notes:

### Issue ID: A4-UX-EVID-04

- Title: Tree expand/collapse affordance is easy to miss; state change is subtle
- Area/Module: Controls
- Route/URL: /controls
- Preconditions: Logged in; Controls accessible
- Steps to reproduce:
  1. Visit `/controls`.
  2. Try to expand/collapse “Configuration Management.”
- Expected vs Actual:
  - Expected: Clear, consistently-clickable expand/collapse targets with obvious state change.
  - Actual: The affordance relies on small chevrons and subtle state change; the expanded view introduces dense nested rows that can feel like a different layout.
- Impact: Slows scanning and increases misclicks; makes the hierarchy harder to learn.
- Severity: P2
- Heuristic tags (1-3): Navigation/IA, Visual Hierarchy, A11y
- Evidence: desktop**controls**controls-tree**configured-collapsed**19.png, desktop**controls**controls-tree**configured-expanded**18.png, desktop**controls**controls-tree**configured-expanded**20.png, desktop**controls**controls-tree**configured-keyboard**09.png
- Recommendation: Make the whole group row clickable for expand/collapse, increase the hit target, and provide clearer visual indentation and grouping when expanded.
- Notes:

### Issue ID: A4-UX-EVID-05

- Title: Search/filtering is unlabeled and the empty-state copy is misleading
- Area/Module: Controls
- Route/URL: /controls
- Preconditions: Logged in; Controls accessible
- Steps to reproduce:
  1. Visit `/controls`.
  2. Type a value that matches (e.g., “Planning”).
  3. Type a value that matches nothing.
- Expected vs Actual:
  - Expected: Search field labeled (what it searches) and an empty state that confirms “No results for <query>.”
  - Actual: Large search input has no visible label; empty state reads “No available options,” which sounds like a disabled control rather than “no matches.”
- Impact: Users can misinterpret search scope and failure; increases trial-and-error.
- Severity: P2
- Heuristic tags (1-3): Content/Copy, Feedback/Status, Consistency/Standards
- Evidence: desktop**controls**controls**configured-search**07.png, desktop**controls**controls**configured-empty-search**08.png
- Recommendation: Add a label/placeholder like “Search control groups and controls,” and change empty-state copy to “No results for ‘<query>’” with a one-click clear action.
- Notes:

### Issue ID: A4-UX-EVID-06

- Title: “Eye” action icon implies a drawer/details view but doesn’t provide an understandable outcome
- Area/Module: Controls
- Route/URL: /controls
- Preconditions: Logged in; Controls accessible; a group expanded
- Steps to reproduce:
  1. Expand a group (e.g., “Configuration Management”).
  2. Click the “eye” icon on a control row.
- Expected vs Actual:
  - Expected: A details drawer/modal (or navigation) that explains the control and allows implementation work.
  - Actual: The action does not surface a clear details view; it can also change the navigation layout unexpectedly (sidebar collapses), which reads as unrelated to the icon.
- Impact: Users lose confidence in action icons; core “view/edit control” workflow is unclear.
- Severity: P1
- Heuristic tags (1-3): Feedback/Status, Consistency/Standards, Control/Freedom
- Evidence: desktop**controls**controls-tree**configured-expanded**18.png, desktop**controls**controls**configured-control-action**21.png, desktop**controls**controls**configured-eye-no-details**17.png
- Recommendation: Replace the icon-only affordance with a labeled action (“View details”), ensure it opens a predictable details surface (drawer/modal/page), and avoid side effects like collapsing navigation.
- Notes:

### Issue ID: A4-UX-EVID-07

- Title: Keyboard navigation can lead to accidental logout during exploration
- Area/Module: Controls (global navigation + focus order)
- Route/URL: /controls
- Preconditions: Logged in
- Steps to reproduce:
  1. On `/controls`, use Tab/Shift+Tab to move focus through the page.
  2. Press Enter while focused on navigation actions.
- Expected vs Actual:
  - Expected: Clear focus order and (optionally) a confirmation before ending the session.
  - Actual: During keyboard-driven exploration, it’s easy to end up logged out without a clear “you are about to log out” moment.
- Impact: Disrupts work, especially for keyboard users; increases fear of exploring the UI.
- Severity: P2
- Heuristic tags (1-3): A11y, Error Prevention, Control/Freedom
- Evidence: desktop**controls**controls-drawer**configured**13.png
- Recommendation: Improve focus order and add a lightweight confirmation (or undo) for logout, especially when triggered from global nav.
- Notes:

## Pattern notes

- Prerequisite gating: Controls has a two-step gate (SSP selection, then SSP→Profile link). Both use alert banners with inline links, but the destination and terminology are inconsistent (“SSP Page” vs “System Page”).
- Controls hierarchy pattern: Collapsible groups reveal nested control rows with an ID token, title, count badge, and an icon-only action. Expanded density is high and depends on subtle indentation and spacing.
- Filtering UI: One large, unlabeled search field appears to filter the visible hierarchy; empty state copy is generic.
- Drawer/details expectation: The UI visually suggests a details surface (eye icon), but the user-visible outcome is unclear/unreliable in this run.

## Appendix: scenarios attempted but not reproduced

- A consistent, discoverable details drawer/modal for a control (clicked control titles and the eye icon; no clear details surface appeared).

## 1) Where to start (the highest-leverage starting point)

### Make “Active SSP” a first-class, global concept

Right now:

- Multiple modules are blocked until SSP is selected.
- After selecting, users still can’t reliably tell what’s active (except sometimes in System).
- “Set” actions don’t read as stateful (they never change label; feedback is subtle).

**Your redesign anchor:** Treat SSP like a “current workspace” that’s always visible and changeable.

What that unlocks:

- Consistent prerequisite UX across System / Controls / Workflow Instances.
- A coherent mental model (“Everything I do is scoped to Active SSP”).
- A consistent recovery path when something is blocked.

If you do only one foundational thing first, do this.

---

## 2) A practical redesign plan (in the order I’d do it)

### Phase A — Foundations (patterns you’ll reuse everywhere)

Build these as reusable components/templates before touching every screen:

1. **Global Scope Indicator (Active SSP)**

- Lives in the global shell (top bar or sidebar header).
- Shows: `Active System Security Plan: <Name>`
- Includes: **Change** (dropdown or modal) + optional “View SSP” link.
- If no SSP selected: shows **“No plan selected”** + **Select** button.

2. **Standard “Prerequisite Gate” Component**
   Use the same structure everywhere an SSP (or other prerequisite) blocks access:

- Title: “Select a System Security Plan”
- Explanation: 1–2 plain-language sentences (“To view Controls and run Workflow Instances, choose the plan you’re working on.”)
- Primary CTA: **Select plan**
- Secondary CTA: **What is this?** (short inline help)
- Behavior: after selecting, **return user to the page they came from**

3. **Stateful “Set Active” List Pattern**
   Replace “Set” + tiny “Active” pill with a design that reads as state:

Recommended pattern:

- Left column: radio-style selector or “Active” badge in-row
- Actions:
  - Active row: button becomes **Active** (disabled) or **Selected**
  - Other rows: **Make active**

- Confirmation:
  - Inline state change **plus** toast: “Active SSP set to <Name>” with optional Undo/Change

This same pattern should apply to SSP / Assessment Plans / Assessment Results / POA&M if they truly behave like scopes.

---

### Phase B — Fix the P1 broken journeys (biggest user pain, fastest payoff)

These are the report’s P1s translated into “what to redesign first”:

#### 1) SSP gating consistency + recovery CTA (System / Controls / Workflow Instances)

Make sure **every blocked page** has a clear primary action.

Today, Workflow Instances has no link at all; System/Controls rely on “SSP Page” text link. That’s a dead-end feeling.
**Outcome:** no dead ends, same pattern everywhere.

#### 2) Controls “second gate” (SSP selected but no linked profile)

This is a classic “I did the thing and it still doesn’t work” failure.

Redesign the message as:

- “Controls aren’t available for **<Active SSP Name>** yet”
- Reason: “This plan has no linked profile.”
- Primary CTA: **Link a profile**
- Secondary: **Switch plan**
- Optional: show what “profile” means in 1 sentence

Most important: don’t send people to a generic “System Page” detour.

#### 3) “Silent” validation and required fields (Evidence create, Dashboard create, Workflow dialogs)

Standardize form behavior:

- All required fields marked `*`
- On submit:
  - show inline errors under fields
  - scroll/focus to first error
  - show a short error summary at top if the form is long

- Never rely on “date picker opens” as the only error feedback

This will eliminate multiple “user thinks it’s broken” moments.

#### 4) Destructive actions hierarchy (Dashboards, Catalogs, Workflows lists)

Delete is currently over-exposed.

Standard pattern:

- Primary action: View / Open / Edit
- Secondary actions: in overflow menu (⋯)
- Delete:
  - always requires confirmation with clear object name
  - consider “type-to-confirm” for high-risk deletes if needed

---

### Phase C — Standardize the “page templates” (this prevents regression)

Once foundations are set, redesign will accelerate if you define **3 templates** and enforce them:

#### Template 1: List page

- Title + short description
- Right side: primary CTA “Create …”
- Filters row (consistent)
- Table/list area
- Empty state with CTA when no results
- Row actions: consistent (View / Edit / JSON in overflow)

#### Template 2: Detail/editor page

- Header with:
  - title
  - key metadata (compact)
  - primary actions on the right (Edit/Save/Execute/etc.)

- Tabs: consistent component + naming (pick one: “JSON” not sometimes “JSON View”)
- Sticky action bar if edits are long

#### Template 3: Modal/dialog form

- Clear labels (no placeholder-as-label)
- Required markers + consistent button order
- Consistent validation styling/copy
- Consistent sizing and scrolling rules

This directly addresses the report’s “inconsistent layouts/patterns across modules.”

---

## 3) What you should redesign first (if you need a concrete sequence)

If you need a simple “start here” order:

1. **Global Active SSP indicator + switcher**
2. **Standard prerequisite gate component** (apply to System/Controls/Workflow Instances)
3. **SSP selection list redesign (“Set active” becomes stateful)**
4. **Controls secondary gate redesign** (no linked profile)
5. **Form validation system** (Evidence create + Dashboard create + Workflow dialogs first)
6. **Destructive action pattern** (Dashboards + Catalogs + Workflows lists)
7. **Workflow status normalization** (human labels, no internal enums like `in_progress`, no blank status columns)
8. **System create dialogs cleanup** (remove raw IDs, add pickers, fix duplicated sections)
9. **Evidence list density + search learnability** (chip collapse + “syntax help” or builder)
10. **Inventory filter trust** (make “Sources” functional or clearly informational)

That sequence maximizes cross-app impact early, and reduces the risk you redesign one screen in a way that conflicts with another.

---

## 4) A few concrete UI pattern recommendations (you can drop into Figma quickly)

### A) “Active SSP” scope pill (global shell)

- Label: “Active plan”
- Value: plan name (truncate with tooltip)
- Action: dropdown caret / “Change”
- If none: warning icon + “Select a plan”

This should appear **on every page** (including Evidence/Dashboards), because those pages are also interpreted through scope once SSP is selected.

---

### B) Gating screen copy (replace acronyms-first wording)

Instead of:

- “System Security Plan not selected. Please return to the SSP Page…”

Use:

- **Title:** Select a System Security Plan
- **Body:** Choose the plan you’re working on to access System, Controls, and Workflow Instances.
- **Primary button:** Select plan
- **Secondary:** Learn more about plans

Bonus: show “You’ll come back here after selecting.”

---

### C) “Set active” table row pattern

For each row:

- Left: radio indicator (selected/unselected)
- Middle: name + metadata
- Right: actions (View, JSON, etc.)
- Selected row:
  - row highlight
  - badge “Active”
  - “Make active” becomes disabled “Active”

This eliminates the “I clicked Set, did it work?” issue.

---

### D) Versioning clarity for Evidence

If “Update Evidence” creates a new revision:

- Rename CTA to **“Create new version”**
- History should show:
  - Version number (v1, v2)
  - Timestamp + author
  - Change reason (you already capture “Reason” — surface it!)
  - Highlight “Latest”

Right now history looks like duplicates, which reads like a bug.

---

## 5) What to do this week (actionable next steps)

If you’re staring at a blank canvas, here’s a tight set of deliverables that will get you moving:

1. **Write 5 UX principles** for this redesign (based on the report themes)
   Example set:
   - Always show scope (Active SSP)
   - No dead ends (every block has a recovery CTA)
   - State is obvious (no silent success)
   - Safe by default (destructive actions de-emphasized)
   - Consistency beats cleverness (shared templates/components)

2. **Create a small component library** in your design tool:
   - Scope indicator
   - Gate panel
   - List header (title + CTA + filters)
   - Standard table row actions
   - Form field + validation states
   - Empty/loading states

3. **Redesign 3 “keystone” screens first** using those components:
   - SSP list (make active)
   - A gated page (e.g., Controls) in “no SSP” state
   - Evidence create (validation done right)

Once these look and behave consistently, the rest of the redesign becomes assembly work instead of reinvention.

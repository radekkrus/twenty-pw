# Appointment-Setter Booking Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new in-app page at `/appointment-booking` where a setter picks/creates a lead,
picks a closer, and books a real slot on that closer's Cal.com calendar - reachable from a
native global entry point on every page, not buried in one module.

**Architecture:** A plain page component (shaped like the existing `BookCall.tsx`, not the
generic record-table/page-layout machinery), registered in the same authenticated route
group as `PageLayoutPage`. Reads/writes `company` and `mtgCloser` through Twenty's own
generic object-record hooks - no new backend code. The booking write path is Cal.com
itself (via `@calcom/embed-react`, already a dependency) → the existing
`pw-crm-booking-bridge.py` → `pwMeeting`, unchanged. Global entry: a seeded
`commandMenuItem` row (`GLOBAL` availability, `NAVIGATION` payload) plus one static item in
the persistent navigation drawer.

**Tech Stack:** React (twenty-front), `@calcom/embed-react`, Twenty's object-record GraphQL
hooks (`useObjectRecordSearchRecords`, `useFindManyRecords`, `useCreateOneRecord`), Jest +
`@testing-library/react` for tests, NestJS workspace-upgrade command for the command-menu
seed.

## Global Constraints

- Field name `calcomEventSlug` on `mtgCloser` - must match exactly what the companion plan
  (`partner-wzrostu-crm-setter-booking`, Task 1) creates. Confirm that plan's Task 1 has
  shipped (field exists on prod) before this plan's Task 3 depends on it for real data -
  Task 3's own test can still run against a mock either way.
- No new backend route/controller. Every read/write in this plan goes through generic,
  already-existing object-record hooks or the Cal.com embed - if a task seems to need a
  new NestJS endpoint, stop and re-check against the design spec before writing one; that
  would be a scope signal the spec didn't anticipate.
- Work in the dedicated worktree at
  `Projects/twenty-pw/twenty-pw-appointment-booking` (branch `feat/appointment-booking`,
  already created, already has one commit - `DeployStatusBar` - from a prior side-task in
  this session). Note the nesting: it's a worktree *inside* the primary `twenty-pw`
  checkout's directory, not a sibling - a mistake made once already this session when
  creating it; don't "fix" the path by moving it, `git worktree` already knows where it
  is. Do not work in the shared primary `twenty-pw` checkout itself.
- **Confirmed pre-existing, repo-wide, and not this plan's problem to fix in-line**: a bare
  `tsc --noEmit -p packages/twenty-front/tsconfig.json` fails with ~14,600 lines of
  `Cannot find module 'twenty-shared/...'`/`'twenty-ui/...'` errors on a fresh checkout,
  identical on the primary checkout and this worktree alike - `twenty-shared`/`twenty-ui`
  need to be built first, normally via Nx, but `nx show projects` currently returns `[]`
  (broken project graph, cause unknown). Task 0 below fixes this once, so every later
  task's build/test steps actually mean something instead of drowning in unrelated noise.
- Before pushing/deploying: this fork's CI (`.github/workflows/build-image.yml`) builds and
  pushes a new image on every push to `main` - do not push to `main` directly mid-plan.
  Merge to `main` only once this whole plan is done and verified per Task 7.
- Copy: Polish user-facing strings (this is a Polish-market CRM), same as everywhere else
  in this fork's Partner Wzrostu-specific pages. Code/comments in English.

---

### Task 0: Fix the fork's build bootstrap

**Files:** none expected (environment/tooling fix - if it turns out a real source file
needs to change, that's new information this task should surface, not something to
route around).

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npx nx run twenty-front:typecheck` (or equivalent) in the
  `twenty-pw-appointment-booking` worktree, which every later task's build/test steps
  depend on to mean anything.

- [ ] **Step 1: Diagnose why Nx sees no projects**

Run: `npx nx show projects` (from `packages/twenty-front` and from repo root - try both,
Nx's project discovery is workspace-root-relative and the wrong cwd is a common cause of
an empty list). If both are empty, check `nx.json` and `packages/twenty-front/project.json`
(or `package.json`'s `nx` key, depending on how this version of Nx declares projects) exist
and are well-formed, and try `npx nx reset` (clears the Nx daemon/cache - safe, no data
loss) followed by a retry.

- [ ] **Step 2: Build the shared packages**

Once Nx sees the projects, run whatever target actually builds `twenty-shared` and
`twenty-ui` (likely `npx nx run twenty-shared:build` and `npx nx run twenty-ui:build`, or
a combined `npx nx run-many -t build --projects=twenty-shared,twenty-ui` - check
`packages/twenty-shared/package.json` and `packages/twenty-ui/package.json` for the
project's actual target names first rather than guessing).

- [ ] **Step 3: Verify**

Run: `npx nx run twenty-front:typecheck` (or `npx tsc --noEmit -p packages/twenty-front/tsconfig.json`
if no typecheck target exists). Expected: the `Cannot find module 'twenty-shared/...'`
class of error is gone. Any *remaining* errors at this point are real and should be read,
not dismissed - this task's job is removing the noise, not guaranteeing zero errors from
whatever's already on this branch.

- [ ] **Step 4: Document what fixed it**

If this needed anything beyond "build the two packages" (a config fix, a missing env var,
an Nx version mismatch) - write one paragraph in this plan file's own "Self-review notes"
section (append, don't rewrite) explaining what was actually wrong, so the next person
bootstrapping a fresh `twenty-pw` worktree doesn't repeat this investigation from scratch.

- [ ] **Step 5: Commit, if Step 1-2 touched any tracked file**

```bash
git add -A
git status  # confirm only intended files are staged before committing
git commit -m "chore(build): fix Nx project graph / bootstrap shared package builds"
```

If nothing tracked changed (purely a local build-artifact/cache fix), skip this step -
say so explicitly rather than committing an empty commit.

---

### Task 1: Route + empty page shell

**Files:**
- Modify: `packages/twenty-shared/src/types/AppPath.ts`
- Modify: `packages/twenty-front/src/modules/app/hooks/useCreateWorkspaceAppRouter.tsx`
- Create: `packages/twenty-front/src/pages/appointment-booking/AppointmentBooking.tsx`
- Test: `packages/twenty-front/src/pages/appointment-booking/__tests__/AppointmentBooking.test.tsx`

**Interfaces:**
- Consumes: nothing from other tasks (first task).
- Produces: `AppPath.AppointmentBooking` (string `'/appointment-booking'`), and the
  `AppointmentBooking` component (default export shape: named export
  `export const AppointmentBooking = () => ...`), which Tasks 2-5 add content to. Later
  tasks import and extend this same component - they do not create a new one.

- [ ] **Step 1: Add the route constant**

In `packages/twenty-shared/src/types/AppPath.ts`, add one line inside the `// Onboarded`
group (after `PageLayoutPage`):

```ts
  RecordIndexPage = '/objects/:objectNamePlural',
  RecordShowPage = '/object/:objectNameSingular/:objectRecordId',
  PageLayoutPage = '/page/:pageLayoutId',
  AppointmentBooking = '/appointment-booking',
```

- [ ] **Step 2: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';

import { AppointmentBooking } from '~/pages/appointment-booking/AppointmentBooking';

describe('AppointmentBooking', () => {
  it('renders the page heading', () => {
    render(<AppointmentBooking />);

    expect(
      screen.getByRole('heading', { name: 'Nowe spotkanie' }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest packages/twenty-front/src/pages/appointment-booking --config packages/twenty-front/jest.config.mjs`
Expected: FAIL - `Cannot find module '~/pages/appointment-booking/AppointmentBooking'`.

- [ ] **Step 4: Write the minimal page component**

```tsx
import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledPage = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
  padding: ${themeCssVariables.spacing[6]};
  width: 100%;
`;

export const AppointmentBooking = () => (
  <StyledPage>
    <h1>Nowe spotkanie</h1>
  </StyledPage>
);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest packages/twenty-front/src/pages/appointment-booking --config packages/twenty-front/jest.config.mjs`
Expected: PASS.

- [ ] **Step 6: Wire the route**

In `packages/twenty-front/src/modules/app/hooks/useCreateWorkspaceAppRouter.tsx`:

Add the lazy import near the `StandalonePageLayoutPage` lazy import (around line 108):

```tsx
const AppointmentBooking = lazy(() =>
  import('~/pages/appointment-booking/AppointmentBooking').then((module) => ({
    default: module.AppointmentBooking,
  })),
);
```

Add the route as a sibling of `PageLayoutPage`'s route (around line 179-186, same
authenticated group - NOT the `AuthFlowLayout` group `BookCall` uses, that's
onboarding-only and has no sidebar):

```tsx
<Route
  path={AppPath.AppointmentBooking}
  element={
    <LazyRoute>
      <AppointmentBooking />
    </LazyRoute>
  }
/>
```

- [ ] **Step 7: Manual smoke check**

This step has no automated test - routing wiring is confirmed in Task 7's end-to-end pass.
For now, confirm `yarn nx run twenty-front:build` (or the workspace's equivalent build
command - check `package.json` at repo root if `nx` isn't directly invokable) completes
without a new TypeScript error introduced by this task.

- [ ] **Step 8: Commit**

```bash
git add packages/twenty-shared/src/types/AppPath.ts \
  packages/twenty-front/src/modules/app/hooks/useCreateWorkspaceAppRouter.tsx \
  packages/twenty-front/src/pages/appointment-booking/
git commit -m "feat(appointment-booking): route + empty page shell"
```

---

### Task 2: Lead step - search existing company, create a new one

**Files:**
- Create: `packages/twenty-front/src/pages/appointment-booking/components/LeadStep.tsx`
- Modify: `packages/twenty-front/src/pages/appointment-booking/AppointmentBooking.tsx`
- Test: `packages/twenty-front/src/pages/appointment-booking/components/__tests__/LeadStep.test.tsx`

**Interfaces:**
- Consumes: nothing new from other tasks.
- Produces: `LeadStep` component with props
  `{ onPicked: (company: {id: string; name: string}) => void }`. Calls `onPicked` either
  with a search result or with the freshly created record. Task 3 (`AppointmentBooking`)
  holds the picked company in state and passes it forward to Task 4.

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { LeadStep } from '@/appointment-booking/components/LeadStep';

const mockSearchRecords = jest.fn();
const mockCreateOneRecord = jest.fn();

jest.mock('@/object-record/hooks/useObjectRecordSearchRecords', () => ({
  useObjectRecordSearchRecords: () => ({
    searchRecords: mockSearchRecords(),
    loading: false,
  }),
}));

jest.mock('@/object-record/hooks/useCreateOneRecord', () => ({
  useCreateOneRecord: () => ({ createOneRecord: mockCreateOneRecord }),
}));

describe('LeadStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onPicked with a search result when clicked', () => {
    mockSearchRecords.mockReturnValue([
      { record: { id: 'company-1', name: 'Klinika Uroda' } },
    ]);
    const onPicked = jest.fn();

    render(<LeadStep onPicked={onPicked} />);
    fireEvent.change(screen.getByPlaceholderText('Klinika - zacznij pisać nazwę'), {
      target: { value: 'Uroda' },
    });
    fireEvent.click(screen.getByText('Klinika Uroda'));

    expect(onPicked).toHaveBeenCalledWith({ id: 'company-1', name: 'Klinika Uroda' });
  });

  it('creates a new company and calls onPicked with it', async () => {
    mockSearchRecords.mockReturnValue([]);
    mockCreateOneRecord.mockResolvedValue({ id: 'company-new', name: 'Nowa Klinika' });
    const onPicked = jest.fn();

    render(<LeadStep onPicked={onPicked} />);
    fireEvent.click(screen.getByText('Nowa klinika'));
    fireEvent.change(screen.getByLabelText('Nazwa'), {
      target: { value: 'Nowa Klinika' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'kontakt@nowaklinika.pl' },
    });
    fireEvent.change(screen.getByLabelText('Telefon'), {
      target: { value: '+48123456789' },
    });
    fireEvent.click(screen.getByText('Zapisz klinikę'));

    await waitFor(() =>
      expect(onPicked).toHaveBeenCalledWith({ id: 'company-new', name: 'Nowa Klinika' }),
    );
    expect(mockCreateOneRecord).toHaveBeenCalledWith({
      name: 'Nowa Klinika',
      leadEmails: { primaryEmail: 'kontakt@nowaklinika.pl' },
      leadPhones: { primaryPhoneNumber: '+48123456789' },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest LeadStep --config packages/twenty-front/jest.config.mjs`
Expected: FAIL - module not found.

- [ ] **Step 3: Write the minimal implementation**

```tsx
import { useState } from 'react';

import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { useObjectRecordSearchRecords } from '@/object-record/hooks/useObjectRecordSearchRecords';

type PickedCompany = { id: string; name: string };

type LeadStepProps = {
  onPicked: (company: PickedCompany) => void;
};

export const LeadStep = ({ onPicked }: LeadStepProps) => {
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const { searchRecords } = useObjectRecordSearchRecords({
    objectNameSingulars: ['company'],
    searchInput: query,
    skip: query.trim().length < 2,
  });

  const { createOneRecord } = useCreateOneRecord({ objectNameSingular: 'company' });

  const handleCreate = async () => {
    const created = await createOneRecord({
      name: newName,
      leadEmails: { primaryEmail: newEmail },
      leadPhones: { primaryPhoneNumber: newPhone },
    });

    onPicked({ id: created.id, name: newName });
  };

  if (creating) {
    return (
      <div>
        <label>
          Nazwa
          <input value={newName} onChange={(event) => setNewName(event.target.value)} />
        </label>
        <label>
          Email
          <input value={newEmail} onChange={(event) => setNewEmail(event.target.value)} />
        </label>
        <label>
          Telefon
          <input value={newPhone} onChange={(event) => setNewPhone(event.target.value)} />
        </label>
        <button type="button" onClick={handleCreate}>
          Zapisz klinikę
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        placeholder="Klinika - zacznij pisać nazwę"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {searchRecords?.map((result: { record: PickedCompany }) => (
        <button
          key={result.record.id}
          type="button"
          onClick={() => onPicked(result.record)}
        >
          {result.record.name}
        </button>
      ))}
      <button type="button" onClick={() => setCreating(true)}>
        Nowa klinika
      </button>
    </div>
  );
};
```

**Note for the implementer:** this is the minimal shape to pass the test, not the final
visual design - Task 6 (usability pass, see below) revisits styling, loading/empty states,
and debounce on the search input before this ships. Don't polish ahead of that task; keep
this focused on the data flow being correct.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest LeadStep --config packages/twenty-front/jest.config.mjs`
Expected: PASS, both cases.

- [ ] **Step 5: Wire into the page**

In `AppointmentBooking.tsx`, hold `pickedCompany` in `useState`, render `<LeadStep
onPicked={setPickedCompany} />` when it's `null`, and a "Zmień klinikę" reset control plus
the next step's placeholder when it's set. (Task 3 fills in what actually renders next.)

- [ ] **Step 6: Commit**

```bash
git add packages/twenty-front/src/pages/appointment-booking/
git commit -m "feat(appointment-booking): lead step - search or create a company"
```

---

### Task 3: Closer step - list the roster

**Files:**
- Create: `packages/twenty-front/src/pages/appointment-booking/components/CloserStep.tsx`
- Modify: `packages/twenty-front/src/pages/appointment-booking/AppointmentBooking.tsx`
- Test: `packages/twenty-front/src/pages/appointment-booking/components/__tests__/CloserStep.test.tsx`

**Interfaces:**
- Consumes: nothing from Task 2 directly (parallel data need - this step doesn't care
  which company was picked).
- Produces: `CloserStep` component, props
  `{ onPicked: (closer: {id: string; name: string; calcomEventSlug: string}) => void }`.
  Task 4 consumes the picked closer's `calcomEventSlug`.

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';

import { CloserStep } from '@/appointment-booking/components/CloserStep';

const mockRecords = jest.fn();

jest.mock('@/object-record/hooks/useFindManyRecords', () => ({
  useFindManyRecords: () => ({ records: mockRecords(), loading: false }),
}));

describe('CloserStep', () => {
  it('lists active closers and calls onPicked with the chosen one', () => {
    mockRecords.mockReturnValue([
      { id: 'closer-1', name: 'Kasia Wrzesień', calcomEventSlug: 'kasia-wrzesien/30min' },
      { id: 'closer-2', name: 'Marek Dudek', calcomEventSlug: 'marek-dudek/30min' },
    ]);
    const onPicked = jest.fn();

    render(<CloserStep onPicked={onPicked} />);
    fireEvent.click(screen.getByText('Kasia Wrzesień'));

    expect(onPicked).toHaveBeenCalledWith({
      id: 'closer-1',
      name: 'Kasia Wrzesień',
      calcomEventSlug: 'kasia-wrzesien/30min',
    });
  });

  it('does not list a closer with no calcomEventSlug yet', () => {
    mockRecords.mockReturnValue([
      { id: 'closer-3', name: 'Nieskonfigurowany', calcomEventSlug: null },
    ]);

    render(<CloserStep onPicked={jest.fn()} />);

    expect(screen.queryByText('Nieskonfigurowany')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest CloserStep --config packages/twenty-front/jest.config.mjs`
Expected: FAIL - module not found.

- [ ] **Step 3: Write the minimal implementation**

```tsx
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';

type PickedCloser = { id: string; name: string; calcomEventSlug: string };

type CloserStepProps = {
  onPicked: (closer: PickedCloser) => void;
};

export const CloserStep = ({ onPicked }: CloserStepProps) => {
  const { records } = useFindManyRecords<PickedCloser & { active: boolean }>({
    objectNameSingular: 'mtgCloser',
    filter: { active: { eq: true } },
  });

  const bookable = (records ?? []).filter(
    (closer): closer is PickedCloser & { active: boolean } =>
      Boolean(closer.calcomEventSlug),
  );

  return (
    <div>
      {bookable.map((closer) => (
        <button key={closer.id} type="button" onClick={() => onPicked(closer)}>
          {closer.name}
        </button>
      ))}
    </div>
  );
};
```

**Note for the implementer:** a closer with no `calcomEventSlug` yet is filtered out rather
than shown disabled - per the design spec, onboarding a closer (Task 2 of the companion
plan) is a real prerequisite, not a config toggle, so surfacing an unbookable name here
would just be a dead end for the setter. If product feedback later wants "show them
greyed out with a reason," that's a follow-up, not part of this plan.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest CloserStep --config packages/twenty-front/jest.config.mjs`
Expected: PASS, both cases.

- [ ] **Step 5: Wire into the page**

In `AppointmentBooking.tsx`, once `pickedCompany` is set, render `<CloserStep
onPicked={setPickedCloser} />`. Once both `pickedCompany` and `pickedCloser` are set, Task
4's `<SlotStep>` takes over.

- [ ] **Step 6: Commit**

```bash
git add packages/twenty-front/src/pages/appointment-booking/
git commit -m "feat(appointment-booking): closer step - bookable roster"
```

---

### Task 4: Slot step - Cal.com embed, prefilled

**Files:**
- Create: `packages/twenty-front/src/pages/appointment-booking/components/SlotStep.tsx`
- Modify: `packages/twenty-front/src/pages/appointment-booking/AppointmentBooking.tsx`
- Test: `packages/twenty-front/src/pages/appointment-booking/components/__tests__/SlotStep.test.tsx`

**Interfaces:**
- Consumes: `pickedCompany: {id, name}` (Task 2), `pickedCloser: {id, name,
  calcomEventSlug}` (Task 3), plus a `leadEmail`/`leadPhone` pair captured in Task 2's
  create-new-company path (for prefill when available - search-picked existing companies
  may not have those captured at this step; that's fine, `@calcom/embed-react`'s `config`
  fields are optional).
- Produces: `SlotStep` component, props
  `{ closer: {name: string; calcomEventSlug: string}; leadName: string; leadEmail?: string
  }`, rendering the `<Cal>` embed. No `onBooked` callback in this task - Task 5 adds
  booking-completion detection as its own concern (Cal's embed exposes a
  `bookingSuccessful` event via `getCalApi().on(...)`, wired up there, not here, to keep
  this task's test surface small).

- [ ] **Step 1: Write the failing test**

```tsx
import { render } from '@testing-library/react';

import { SlotStep } from '@/appointment-booking/components/SlotStep';

const mockCalProps: { calLink?: string; config?: Record<string, unknown> } = {};

jest.mock('@calcom/embed-react', () => ({
  __esModule: true,
  default: (props: { calLink: string; config: Record<string, unknown> }) => {
    mockCalProps.calLink = props.calLink;
    mockCalProps.config = props.config;
    return <div data-testid="cal-embed" />;
  },
}));

describe('SlotStep', () => {
  it('embeds the closer calLink prefilled with the lead name and email', () => {
    render(
      <SlotStep
        closer={{ name: 'Kasia Wrzesień', calcomEventSlug: 'kasia-wrzesien/30min' }}
        leadName="Klinika Uroda"
        leadEmail="kontakt@klinikauroda.pl"
      />,
    );

    expect(mockCalProps.calLink).toBe('kasia-wrzesien/30min');
    expect(mockCalProps.config).toMatchObject({
      name: 'Klinika Uroda',
      email: 'kontakt@klinikauroda.pl',
      layout: 'month_view',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest SlotStep --config packages/twenty-front/jest.config.mjs`
Expected: FAIL - module not found.

- [ ] **Step 3: Write the minimal implementation**

```tsx
import Cal from '@calcom/embed-react';

type SlotStepProps = {
  closer: { name: string; calcomEventSlug: string };
  leadName: string;
  leadEmail?: string;
};

export const SlotStep = ({ closer, leadName, leadEmail }: SlotStepProps) => (
  <Cal
    calLink={closer.calcomEventSlug}
    config={{
      layout: 'month_view',
      name: leadName,
      email: leadEmail ?? '',
    }}
  />
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest SlotStep --config packages/twenty-front/jest.config.mjs`
Expected: PASS.

- [ ] **Step 5: Wire into the page**

In `AppointmentBooking.tsx`, once both `pickedCompany` and `pickedCloser` are set, render
`<SlotStep closer={pickedCloser} leadName={pickedCompany.name} leadEmail={...} />`.

- [ ] **Step 6: Commit**

```bash
git add packages/twenty-front/src/pages/appointment-booking/
git commit -m "feat(appointment-booking): slot step - Cal.com embed, prefilled"
```

---

### Task 5: Booking confirmation - poll for the `pwMeeting` row

**Files:**
- Create: `packages/twenty-front/src/pages/appointment-booking/hooks/useAwaitBookingConfirmation.ts`
- Modify: `packages/twenty-front/src/pages/appointment-booking/components/SlotStep.tsx`
- Test: `packages/twenty-front/src/pages/appointment-booking/hooks/__tests__/useAwaitBookingConfirmation.test.ts`

**Interfaces:**
- Consumes: `companyId: string` (from Task 2's picked company).
- Produces: hook `useAwaitBookingConfirmation({companyId, armed}: {companyId: string;
  armed: boolean}) => {status: 'idle' | 'waiting' | 'found' | 'timedOut'}`. `armed` flips
  true once Cal's embed fires its `bookingSuccessful` event (wired in this task via
  `getCalApi`); the hook then polls `pwMeeting` for a fresh row on that company and stops
  after finding one or after a bounded number of attempts.

- [ ] **Step 1: Write the failing test**

```ts
import { act, renderHook } from '@testing-library/react';

const mockRefetch = jest.fn();

jest.mock('@/object-record/hooks/useFindManyRecords', () => ({
  useFindManyRecords: () => ({ records: mockRefetch(), refetch: jest.fn(), loading: false }),
}));

import { useAwaitBookingConfirmation } from '@/appointment-booking/hooks/useAwaitBookingConfirmation';

describe('useAwaitBookingConfirmation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockRefetch.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stays idle when not armed', () => {
    mockRefetch.mockReturnValue([]);
    const { result } = renderHook(() =>
      useAwaitBookingConfirmation({ companyId: 'company-1', armed: false }),
    );

    expect(result.current.status).toBe('idle');
  });

  it('moves to found once a pwMeeting row appears for the company', () => {
    mockRefetch.mockReturnValue([]);
    const { result, rerender } = renderHook(
      ({ armed }) =>
        useAwaitBookingConfirmation({ companyId: 'company-1', armed }),
      { initialProps: { armed: true } },
    );

    expect(result.current.status).toBe('waiting');

    mockRefetch.mockReturnValue([{ id: 'meeting-1' }]);
    rerender({ armed: true });

    expect(result.current.status).toBe('found');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest useAwaitBookingConfirmation --config packages/twenty-front/jest.config.mjs`
Expected: FAIL - module not found.

- [ ] **Step 3: Write the minimal implementation**

```ts
import { useEffect, useState } from 'react';

import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';

type BookingConfirmationStatus = 'idle' | 'waiting' | 'found' | 'timedOut';

/** Bridge cron runs every 60s - a few retries at a few seconds apart covers it without
 * making the setter stare at a spinner for a full minute on the common case. */
const MAX_POLLS = 8;
const POLL_INTERVAL_MS = 5000;

export const useAwaitBookingConfirmation = ({
  companyId,
  armed,
}: {
  companyId: string;
  armed: boolean;
}): { status: BookingConfirmationStatus } => {
  const [attempt, setAttempt] = useState(0);

  const { records } = useFindManyRecords<{ id: string }>({
    objectNameSingular: 'pwMeeting',
    filter: { companyId: { eq: companyId } },
    skip: !armed,
  });

  useEffect(() => {
    if (!armed || (records ?? []).length > 0 || attempt >= MAX_POLLS) return;

    const timer = setTimeout(() => setAttempt((current) => current + 1), POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [armed, records, attempt]);

  if (!armed) return { status: 'idle' };
  if ((records ?? []).length > 0) return { status: 'found' };
  if (attempt >= MAX_POLLS) return { status: 'timedOut' };

  return { status: 'waiting' };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest useAwaitBookingConfirmation --config packages/twenty-front/jest.config.mjs`
Expected: PASS, both cases.

- [ ] **Step 5: Wire into `SlotStep`**

```tsx
import { useEffect, useState } from 'react';
import Cal, { getCalApi } from '@calcom/embed-react';

import { useAwaitBookingConfirmation } from '@/appointment-booking/hooks/useAwaitBookingConfirmation';

type SlotStepProps = {
  closer: { name: string; calcomEventSlug: string };
  leadName: string;
  leadEmail?: string;
  companyId: string;
};

export const SlotStep = ({ closer, leadName, leadEmail, companyId }: SlotStepProps) => {
  const [armed, setArmed] = useState(false);
  const { status } = useAwaitBookingConfirmation({ companyId, armed });

  useEffect(() => {
    (async () => {
      const cal = await getCalApi();
      cal('on', {
        action: 'bookingSuccessful',
        callback: () => setArmed(true),
      });
    })();
  }, []);

  if (status === 'waiting') return <div>Zapisujemy w tle...</div>;
  if (status === 'found') return <div>Spotkanie zapisane.</div>;
  if (status === 'timedOut')
    return (
      <div>
        Rezerwacja przeszła w Cal.com, ale jeszcze nie widzimy jej w CRM - sprawdź za
        chwilę w module Meetings.
      </div>
    );

  return (
    <Cal
      calLink={closer.calcomEventSlug}
      config={{ layout: 'month_view', name: leadName, email: leadEmail ?? '' }}
    />
  );
};
```

Update `AppointmentBooking.tsx` to pass `companyId={pickedCompany.id}` through.

**Note for the implementer:** `getCalApi`'s exact async/callback signature should be
confirmed against the installed `@calcom/embed-react` version's types
(`node_modules/@calcom/embed-react/dist/index.d.ts`) before this step - the shape above is
correct for the version pinned when this plan was written, but pin-and-verify rather than
assume it hasn't moved.

- [ ] **Step 6: Commit**

```bash
git add packages/twenty-front/src/pages/appointment-booking/
git commit -m "feat(appointment-booking): poll pwMeeting after a Cal.com booking completes"
```

---

### Task 6: Global entry point - command-menu item + drawer quick-action

**Files:**
- Create: `packages/twenty-server/src/database/commands/upgrade-version-command/2-26/2-26-workspace-command-<next-timestamp>-add-appointment-booking-command-menu-item.command.ts`
  (pick the next unused millisecond timestamp in that folder, following the existing
  filename convention - do not reuse `1775500001000`, that's the compose-email one)
- Modify: `packages/twenty-server/src/database/commands/upgrade-version-command/2-26/2-26-upgrade-version-command.module.ts`
  (add the new command to `providers`)
- Modify: `packages/twenty-front/src/modules/navigation/components/MainNavigationDrawerScrollableItems.tsx`
- Test: manual (workspace-command tests are integration-level against a real DB in this
  codebase's existing convention - check for a `1-21` sibling test file as precedent
  before deciding whether to add one here; if none of the existing
  `*-command-menu-item.command.ts` files have a dedicated unit test, don't invent a new
  testing pattern for this one, match the codebase)

**Interfaces:**
- Consumes: `AppPath.AppointmentBooking` (Task 1).
- Produces: nothing further tasks depend on - this is the last task before end-to-end
  verification.

- [ ] **Step 1: Confirm the exact `commandMenuItem` row shape before writing the command**

Read `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/constants/standard-command-menu-item.constant.ts`
in full - the existing compose-email command (researched for this plan) pulls its row
from this constant rather than building one inline, and this plan's implementer needs the
exact same shape (required fields, how `payload` is typed for a `NAVIGATION` item) before
writing a new entry. This file was not read in full during design research - reading it is
the first real step of this task, not optional prep.

- [ ] **Step 2: Add the new command-menu item to the standard-items constant**

Following whatever shape Step 1 revealed, add an entry (name it, e.g.,
`appointmentBooking` in that constant's object) with `engineComponentKey: 'NAVIGATION'`,
`availabilityType: 'GLOBAL'`, container `'command-menu-list'`, label `Nowe spotkanie`,
payload `{ path: AppPath.AppointmentBooking }`.

- [ ] **Step 3: Write the workspace-upgrade command**

Copy `1-21-workspace-command-1775500001000-add-compose-email-command-menu-item.command.ts`
structure exactly (constructor injection, `runOnWorkspace`, the
`alreadyExists`/dry-run/apply branches), swapping only:
- the class name (`AddAppointmentBookingCommandMenuItemCommand`)
- the `@Command({ name: ... })` string
  (`upgrade:2-26:add-appointment-booking-command-menu-item`)
- `COMPOSE_EMAIL_UNIVERSAL_IDENTIFIER` → the new item's universal identifier from Step 2
- the log message strings

Do not invent a different structure - this file's whole point is being boringly identical
to the proven pattern.

- [ ] **Step 4: Register it**

Add the new command class to the `providers` array in
`2-26-upgrade-version-command.module.ts`.

- [ ] **Step 5: Add the drawer quick-action**

In `MainNavigationDrawerScrollableItems.tsx`, add a new small component (or inline, if the
codebase's own style in that file favors inline JSX for single-purpose additions - match
what's already there) rendering a link/button to `AppPath.AppointmentBooking`, labeled
"+ Nowe spotkanie", placed as a sibling of `<NavigationDrawerOpenedSection />` (not inside
the `Suspense`-wrapped dispatchers below it, per the research: that section is not
lazy-loaded, keeping this quick-action visible immediately on paint).

- [ ] **Step 6: Manual verification**

Run the new upgrade command against a workspace (staging, not prod - see Task 7), confirm
the "Nowe spotkanie" item appears in Cmd+K and navigates correctly, and confirm the drawer
button is visible and navigates correctly on every page (not just `/`).

- [ ] **Step 7: Commit**

```bash
git add packages/twenty-server/src/database/commands/upgrade-version-command/2-26/ \
  packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/constants/standard-command-menu-item.constant.ts \
  packages/twenty-front/src/modules/navigation/components/MainNavigationDrawerScrollableItems.tsx
git commit -m "feat(appointment-booking): global entry point - command menu + drawer action"
```

---

### Task 7: End-to-end verification against staging, then merge and deploy

**Files:** none (verification only)

**Interfaces:** N/A - this task consumes everything built so far and produces a
merged, deployed feature.

- [ ] **Step 1: Confirm the companion plan has shipped**

`partner-wzrostu-crm-setter-booking`'s plan (Task 1: `calcomEventSlug` field on prod,
Task 2: at least one real closer onboarded) must be done - this task needs a real
`calcomEventSlug` value to book against.

- [ ] **Step 2: Full local run**

From the repo root: run the full `twenty-front` test suite (not just this feature's new
tests) to catch any regression: `npx jest --config packages/twenty-front/jest.config.mjs`.
Expected: no new failures versus a run on `main` before this branch's changes (a
pre-existing failure unrelated to this work is out of scope - confirm by running the same
command on `main` first if anything fails, per this operator's standing rule about
flagging pre-existing vs introduced issues).

- [ ] **Step 3: Staging rehearsal**

Per `partner-wzrostu-crm/infra/twenty-staging/` (spin up against a restored prod dump,
`docker compose up`, no worker, `DISABLE_CRON_JOBS_REGISTRATION=true`) - build this
branch's image locally or via a throwaway Actions run, point staging at it, and manually
walk the full flow: open the drawer quick-action from a page that isn't Meetings (proves
the "every page" requirement), pick/create a lead, pick the test closer from the companion
plan, book a real slot, confirm the "Zapisywanie w tle..." → "Spotkanie zapisane" 
transition happens, and confirm a `pwMeeting` row exists for it in staging's DB.

- [ ] **Step 4: Merge to `main`**

Only after Step 3 passes clean. This triggers the fork's build-image workflow
automatically (push to `main`) - do not also manually trigger a duplicate build.

- [ ] **Step 5: Deploy to production**

Follow the tag-flip procedure in `partner-wzrostu-crm/docs/superpowers/specs/2026-08-08-twenty-fork-design.md`
(pull the new image, `docker compose up -d server`, confirm `/healthz` 200 and
`docker inspect` health before considering it live) - under this repo's deploy-lock
discipline if another session might be touching the same box concurrently.

- [ ] **Step 6: Update `DEPLOY_STAMP` in `DeployStatusBar.tsx`**

Set it to the real deploy time (Warsaw), per the convention this session already
established for the Meetings module's own stamp. Commit and include in the same deploy -
don't ship this feature without it, that stamp is the whole point of the earlier
side-task.

---

## Self-review notes

- **Spec coverage**: Task 1 = routing; Task 2 = lead (spec §"Lead"); Task 3 = closer (spec
  §"Closer"); Task 4-5 = slot + write-path-via-bridge (spec §"Slot", §"Write path"); Task 6
  = entry point (spec §"Entry"); Task 7 = the spec's Testing section end-to-end pass. The
  spec's "Explicitly out of scope (v1)" cross-closer overview has correctly no task here -
  confirmed intentional, not a gap.
- **Placeholder scan**: Task 6, Step 1 and Step 5 are intentionally scoped as
  "read the real file, then follow its exact shape" rather than pre-written code, because
  `standard-command-menu-item.constant.ts` and the exact drawer-item styling weren't read
  in full during design research (flagged honestly in both the spec and here) - this is a
  deliberate, bounded exception to "no placeholders," not a skipped step. Every other task
  has real, complete code.
- **Type consistency**: `calcomEventSlug` spelled identically here and in the companion
  plan. `PickedCompany`/`PickedCloser` shapes are consistent from Task 2/3 through Task 4/5
  (`{id, name}` and `{id, name, calcomEventSlug}` respectively, never renamed). `companyId`
  prop threaded consistently from `AppointmentBooking` → `SlotStep` →
  `useAwaitBookingConfirmation` in Task 5.
- **Known research gap, flagged rather than papered over**: this plan's code was written
  against research whose file paths were spot-checked (AppPath.ts, the router file) and
  found accurate, but whose `standard-command-menu-item.constant.ts` content was described
  secondhand, not read directly - hence Task 6 Step 1 requires reading it fresh rather than
  trusting a paraphrase, after this same research agent was caught citing one wrong file
  path elsewhere (`apps/meetings/scripts/` instead of the real `scripts/` at repo root)
  during this plan's preparation.

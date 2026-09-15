# .jsx class component → .tsx functional component playbook

Practical steps for converting an existing React class component to a typed functional component,
distilled from doing this for real on `frontend/components/planning/Calendar.jsx` (roadmap item 6 —
see `docs/Modernization-Roadmap.md`). Not a mandate to convert everything — do it when you're already
rewriting a component's internals for another reason (as with Calendar.jsx's tui-calendar →
FullCalendar swap), not as a standalone refactor of working code.

## 1. Lifecycle → hooks mapping

| Class | Hook |
|---|---|
| `constructor` (setting up refs) | `useRef(initialValue)` |
| `componentDidMount` (one-time setup) | `useRef` for anything computed once and never re-derived (see below), or a `useEffect(fn, [])` for real side effects |
| `componentDidUpdate` (reacting to prop/state changes) | Usually nothing — `useMemo`/`useCallback` with the right dependency array already re-derive on change; only reach for `useEffect` if you need an actual side effect outside React's render cycle |
| `this.setState` mirrors of derived data | `useMemo` instead — don't recreate a `state.foo` that's just a computation over props, recompute it with `useMemo(() => ..., [deps])` |
| Callbacks bound in the constructor / defined as class methods | `useCallback` with an explicit dependency array |

**Trap**: a class component's `componentDidMount`-only setup (something that reads a prop once and
never reacts to it changing again) becomes `useRef(computeOnce())`, not `useMemo` — `useMemo` still
re-evaluates when its deps change, `useRef`'s initializer only runs once. Calendar.tsx's
`initialDateRef` is this pattern: the original class only ever called tui-calendar's `setDate()` in
`componentDidMount`, never in `componentDidUpdate`, so the functional rewrite has to deliberately
*not* react to `day`/`conflict` changing after mount to stay behaviorally identical — a `useMemo`
would have silently changed that behavior.

**Also check for genuinely dead state.** A class component migration is a good time to check whether
`this.state.x` is actually read anywhere in `render()` — Calendar.jsx's `state.currentDate` was set in
five different handlers but never read (the component always rendered off `this.props.day` instead).
Dropping it during the rewrite is a correctness-neutral simplification, not a behavior change — but
confirm that with a grep before dropping it, don't assume.

## 2. `withTranslation` → `useTranslation`

The HOC pattern (`export default withTranslation("ns")(MyComponent)`) exists for class components,
which can't call hooks. Once a component is functional, use the hook directly:

```diff
- import { withTranslation, WithTranslation } from "react-i18next";
+ import { useTranslation } from "react-i18next";

- function MyComponent(props: Props & WithTranslation) {
-     const { t } = props;
+ function MyComponent(props: Props) {
+     const { t } = useTranslation("namespace");
```

No change needed on the parent's side — a `withTranslation`-wrapped component never required the
parent to pass a `t` prop explicitly (the HOC injected it), so parents keep rendering
`<MyComponent {...props} />` exactly as before either way. Tests are unaffected too: this repo's
`frontend/i18n/index.js` singleton wiring covers `useTranslation()` the same way it covered
`withTranslation`, with no `<I18nextProvider>` needed (see any existing `.test.jsx` for a
`useTranslation`-based component, e.g. `YearlyCalendar.tsx`'s tests).

If a sub-component still needs `t` prop-drilled (not every leaf component should call the hook
itself — Calendar.tsx's `CalendarControls`/`getTimeTemplate` take `t` as a parameter, since they're
called from contexts that already have it), type it as a plain function rather than pulling in
react-i18next's real `TFunction` generic, unless you specifically need `returnObjects`/pluralization
overload support at that call site:

```ts
type TFunction = (key: string, options?: Record<string, unknown>) => string;
```

## 3. Typing: eliminate `any`, reuse `entities.ts`

`frontend/components/utils/entities.ts` has hand-mapped TypeScript interfaces for the app's real API
entities (`User`, `Activity`, `Season`, `TimeInterval`, etc. — verified against the actual
serializers, with `UNVERIFIED`/`CHECK` comments on the ones that aren't). Import and reuse these for
any prop/field that's genuinely that entity, rather than re-declaring an ad-hoc shape:

```ts
import type { Activity, Season, User } from "../utils/entities";
```

For a **UI-composed shape** that isn't a direct entity (Calendar.tsx's `Schedule` — built by
`TimeIntervalHelpers.formatIntervalsForSchedule`, combining several entities plus calendar-specific
fields like colors), define a local interface that *uses* the entities as building blocks
(`teacher?: Partial<User>`, `activity?: Activity`) rather than either inventing a parallel type or
giving up and typing the whole thing `Record<string, any>`.

**Avoid `as unknown as T`.** Going through `unknown` defeats the one thing an assertion is supposed
to preserve — that the source and target types are at least structurally plausible — so it hides
exactly the kind of mismatch worth catching. If `as SomeType` itself errors ("neither type
sufficiently overlaps"), that's a real signal, most often that the value came from an untyped `.jsx`
function and TypeScript inferred something structurally unrelated for its return (lodash calls
against untyped JS args are a repeat offender — they can infer bizarre structural types like treating
a return as `string[]`). Fix the actual gap instead of punching through it:

- Give the untyped function a real signature — migrate the file to `.ts`/`.tsx` (see the checklist
  below), or at minimum add a narrow local type for just that function's return.
- Or write the transformation yourself in typed code at the call site instead of calling into the
  untyped helper.

**Where you genuinely can't do better right now** — the untyped file is out of scope for the current
change (a shared helper with other untyped callers, a larger migration than the task at hand) — an
`as unknown as T` cast is the least-bad fallback, but it's not a stopping point: comment *why* the
direct cast doesn't work, and log a `docs/KnownIssues.md` entry naming the real fix (typically
"migrate `<file>.jsx` to TypeScript" or "add a signature for `<function>`") so it gets tracked instead
of silently living in the codebase forever:

```ts
// omitInactiveStudents lives in TimeIntervalHelpers.jsx (untyped JS) and calls lodash's
// differenceBy, whose overload resolution gives a bogus string[]-shaped return here -- a direct
// `as User[]` errors (TS2352, no overlap), so this needs the unknown hop. Logged as a KnownIssues
// entry rather than left silent -- see docs/KnownIssues.md.
const students = TimeIntervalHelpers.omitInactiveStudents(...) as unknown as User[];
```

A plain `as SomeType` (no `unknown` hop) that the compiler accepts outright is different and fine —
it means the two types already overlap enough that TS trusts the narrowing. `reconstructSchedule` in
`Calendar.tsx` does this for its `Schedule` cast (the compiler accepts it because the constructed
object is built from `Schedule`-shaped data by construction) — comment why it's safe, same as any
other assertion, but no `unknown` hop and no KnownIssues entry needed.

The same untyped-boundary problem applies to third-party library types that are deliberately loose
(FullCalendar's `EventApi.extendedProps` is typed as an untyped `Dictionary` in its own `.d.ts`, since
FullCalendar has no way to know what you put there) — cast at that specific boundary with a comment
explaining *why* it's safe (usually: "this file is also what populates it, so it's this shape by
construction"), rather than loosening your own type to match the library's laziness.

**Library-boundary type mismatches are worth listening to.** Tightening `Schedule.start`/`.end` to a
real `Moment` type (instead of `any`) surfaced a real TypeScript error: FullCalendar's `EventInput`
wants a `Date`/`string` for `start`/`end`, not a `Moment` instance. That wasn't a false positive to
work around — it was strict typing catching that the code needed `moment(x).toDate()` at the
FullCalendar boundary that it wasn't doing before. Don't reach for `any`/`as` to silence a type error
from an external library's stricter type without first checking whether the library is right.

## 4. Reduce lodash — most `_.get`/`_.filter` calls become redundant once things are typed

`_.get(obj, "a.b.c")` exists to safely traverse a shape TypeScript doesn't know about. Once that
shape has a real interface, native optional chaining is strictly better — it's type-checked (a typo
in the path is a compile error, not a silent `undefined`), doesn't need a lodash import, and is more
readable:

```diff
- _.get(schedule.raw, "activity_instance.activity.location")
+ schedule.raw?.activity_instance?.activity?.location
```

```diff
- _.filter(conflicts, c => !c.is_resolved)
+ (conflicts ?? []).filter(c => !c.is_resolved)
```

If a file's lodash usage is entirely this pattern, drop the `import _ from "lodash";` line
completely rather than leaving a mostly-unused import. If a file genuinely still needs a lodash
utility with no clean native equivalent (`_.debounce`, `_.isEqual` for deep equality, etc.), import
only that submodule so bundlers can tree-shake the rest of lodash out:

```ts
import debounce from "lodash/debounce";
```

not `import _ from "lodash"` followed by `_.debounce(...)` — the bare `import _ from "lodash"` form
pulls in the whole library regardless of what you actually call.

## 5. Verification checklist

- `npx tsc --noEmit` — clean, no new `any` slipping back in under `strict: true`.
- Run the component's existing test file. If it was written for the class version, its assertions
  (rendered output, prop shapes) should still hold — a green suite after a hook/typing rewrite is
  real signal, not a formality. This is exactly how Calendar.tsx's own rewrite caught a real
  regression: a fallback field name got flipped mid-refactor (reading `schedule.raw?.activity_instance`
  instead of the real source, `schedule.activity_instance`), and the existing regression test failed
  immediately — fixed before it ever reached a commit.
- `npx prettier --check <file>` on files you actually rewrote wholesale (a `.tsx` conversion is new
  content, format it). If you're making a small edit inside an old `.jsx` file that predates this
  repo's prettier adoption, don't run `--write` on the whole file — diff `prettier <file>` against the
  current file first and confirm the only differing lines are ones you actually touched, or you'll
  bundle a large, unrelated reformatting diff into an otherwise-small change.
- `yarn build` — a `.jsx` → `.tsx` rename changes nothing about the bundler output by itself, but
  confirms the new file's imports/exports still resolve cleanly through Rspack.

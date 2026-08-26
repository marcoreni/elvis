# Known issues

Tracked bugs/gaps that are known but deliberately not fixed yet, with enough detail to pick back up
later. When one gets fixed, remove its entry (the fix's commit message/PR is the record, not this
file).

## Minitest suite (`test/`) is substantially broken

Found 2026-08-26 while getting the RSpec suite fully green (see the "fix: correct
ActivityRefPricing#overlaps?" commit history around that date). Unrelated to that work — pre-existing,
not caused by anything changed then. Deliberately left alone; picking these apart is a separate,
larger task.

Running `bin/rails test`:

- **All three `test/features/*_test.rb` files fail to even load.** They use Capybara's spec DSL at
  the top level (`feature "..." do ... scenario "..." do ... end end`), but the installed
  `minitest-rails` gem only aliases `scenario`/`background`/`given` onto
  `ActionDispatch::SystemTestCase` (see
  `.../gems/minitest-rails-6.1.1/lib/minitest/rails/capybara.rb`), not onto a plain `describe` block
  (which is what `feature` aliases to). Every `scenario` call raises `NoMethodError` at load time.
  Fixing this needs either rewriting these as system tests properly inheriting
  `ActionDispatch::SystemTestCase` (with a working headless-browser driver configured), or dropping
  the Capybara spec-DSL styling for plain Minitest assertions.
- **`test/models/users_test.rb`: 10/10 tests error.** `User.create(first_name:, birthday:, email:)`
  without `last_name` raises `NoMethodError: undefined method 'strip!' for nil` from
  `User#strip_names` (`app/models/user.rb`) — `last_name.strip!`/`first_name.strip!` aren't nil-guarded,
  unlike the `email&.strip!` line right next to them. This looks like a real app bug, not just an
  incomplete test fixture: any code path that creates a `User` without a `last_name` (e.g. a
  placeholder "attached" family member, similar to the pattern in
  `app/services/activity_applications/tes_import_handler.rb`) would crash outright instead of hitting
  a normal presence-validation error, if `strip_names` runs before `last_name` is set.
- **`test/models/due_payment_test.rb`: 6/6 tests error.** Calls `DuePayment._test_mark_unpaid(...)`,
  a method that doesn't exist on `DuePayment` at all — likely a stale reference to a renamed/removed
  method.
- **`test/models/time_interval_test.rb`: partial errors** (some assertions fail with raw object dumps
  printed via `pp`, not yet triaged further).
- **`test/controllers/home_controller_test.rb`: passes.**

No CI currently runs either test suite (see `.github/workflows/`, which only has an auto-release
workflow) — that's part of why this drifted this far without being noticed.

## Frontend dependencies are generally outdated

Noticed 2026-08-26 while setting up the frontend test runner. Not part of that work — deliberately
deferred to a later general dependency-bump pass across `package.json`, rather than bumped
piecemeal now. Examples spotted so far: `prettier` pinned at `^1.14.2` (current major is 3.x),
`node-sass` (long deprecated in favor of `dart-sass`, dropped from `sass-loader`'s docs), `react`/
`react-dom` at `^16.14.0` (three majors behind), `babel-preset-react` at `^6.24.1` (superseded by
`@babel/preset-react`, which is also already a dependency — likely vestigial). Worth a proper audit
rather than trusting this list is exhaustive.

## Vitest is pinned to 3.x / Vite 7, not the latest 4.x / Vite 8

`vitest`/`vite` were deliberately pinned below their latest majors when the frontend test runner was
set up (2026-08-26): Vite 8 changed its default transform pipeline to "oxc" (a Rust-based
transformer replacing esbuild), and its Vite-config surface for oxc explicitly omits the `lang`/
loader override we rely on (see `vitest.config.js`'s `jsxInJsFiles` plugin) to make Vite parse JSX
inside plain `.js` files — this app's actual webpack/Babel build treats every `.js` file as
potentially containing JSX, unlike Vite's default `.jsx`/`.tsx`-only rule. Forcing `oxc: false` to
fall back to esbuild under Vite 8 didn't restore the old loader-override behavior either (whether
that's an oxc-migration gap or an unrelated Vite 8 change wasn't root-caused — Vite 8 is very new).

Two independent ways to unblock the upgrade later, either one on its own would do it:
- Rename the frontend `.js` files that actually contain JSX to `.jsx` (the real fix — removes the
  need for the custom transform plugin entirely, works the same on any Vite version). Repo-wide,
  not attempted here since it's a much larger blast radius than a test-tooling change should carry.
- Or find/wait for an oxc-based equivalent of the `.js`-as-jsx override once Vite 8 matures.

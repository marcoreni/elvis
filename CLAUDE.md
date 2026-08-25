# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Elvis (formerly "Ziggy") is a Rails 6.1 web application for managing a music school: member/student
management, activity registration, scheduling, evaluations, and payments. Backend is Ruby on Rails with
PostgreSQL, Elasticsearch (via `chewy`), Redis, and Sidekiq for background jobs. Frontend is React
rendered into ERB views via `react-rails`/`shakapacker` (webpack), not a separate SPA.

## Running the app

Full stack (Postgres, Elasticsearch, Redis, Sidekiq) via Docker:
```bash
docker-compose build
docker-compose up
```
App is served at `http://localhost:7212`. `GITHUB_TOKEN` env var is required (used to fetch private plugin
gems) — remove the `GITHUB_TOKEN is required` requirement in `docker-compose.yml` if not needed.

For local (non-Docker) development, see the "Install manually" section of `README.md` — ruby 3.3.2, node 20,
postgresql 14, and optionally a local redis and elasticsearch. Then:
```bash
bundle install
yarn
rails db:prepare     # first run, or `rails db:migrate` against an existing db
foreman start         # runs web + webpack dev server per Procfile
```

Create an admin user via `rails console`:
```ruby
u = User.new email: "johndoe@gmail.com", is_admin: true, first_name: "John", last_name: "Doe",
             current_sign_in_at: DateTime.now, last_sign_in_at: DateTime.now, sign_in_count: 1
u.password = "test1234"
u.password_confirmation = "test1234"
u.save!
```

## Common commands

- Ruby lint: `bundle exec rubocop`
- RSpec (primary test suite): `bundle exec rspec`, single file: `bundle exec rspec spec/models/foo_spec.rb`
- Minitest (legacy/secondary suite, still in use under `test/`): `bin/rails test`, single file:
  `bin/rails test test/models/foo_test.rb`
- Frontend build: `yarn build` (production webpack bundle); `yarn start` runs `react-scripts` dev server
  (in practice frontend assets are usually served through `shakapacker`/webpacker during `foreman start`,
  not `yarn start`)
- JS formatting: `.prettierrc` sets 4-space tabs; no lint script is wired up in `package.json`

Note: this repo has **two parallel test frameworks** — RSpec (`spec/`, newer/preferred) and Minitest
(`test/`, older). Check which convention a given area already uses before adding tests.

## Commit conventions

Use [Conventional Commits](https://www.conventionalcommits.org/) for every commit message:
`<type>[optional scope]: <description>`, e.g. `feat(i18n): add locale switcher`,
`fix: resolve merge conflicts in formules_controller`. Common types: `feat`, `fix`, `docs`,
`refactor`, `test`, `chore`, `build`, `ci`, `perf`. Use `!` after the type/scope (or a
`BREAKING CHANGE:` footer) for breaking changes.

## Architecture

### Plugin system

Elvis ships a Redmine-derived plugin architecture (see `docs/Plugin-*.md`, `docs/ElvisLib.md`):

- Plugins are Ruby gems, listed in a `plugins.json` file at the repo root (or fetched from
  `PLUGINS_LIST_DOWNLOAD_URL`) and resolved by `lib/elvis/plugin_gem_utils.rb`, which dynamically adds them
  to the `Gemfile` (see the loop at the bottom of `Gemfile`).
- `lib/elvis/plugin_loader.rb` (`Elvis::PluginLoader`) loads *activated* plugins (tracked in the `plugins`
  DB table) at runtime: it prepends plugin routes, i18n locales, view paths, mirrors plugin `assets/` into
  `public/plugin_assets`, registers plugin menus/settings, and runs each plugin's `init.rb`.
  `rake elvis:plugins:discover|migrate|install_npm_dependencies|copy_react|assets` (see `docs/Plugin-UtilisationAndConf.md`)
  are the operational commands for installing/updating a plugin.
- Plugin React components get copied into `frontend/components/plugins/<plugin_name>`.
- `lib/elvis/hook.rb` (`Elvis::Hook`) provides a Redmine-style hook/listener mechanism (`call_hook` in
  views/controllers) as a second extension point, separate from the plugin loader.

### Event system

`app/listeners` + `lib/elvis/event*.rb`, backed by `rails_event_store`, provide an internal pub/sub layer
(`EventHandler.<domain>.<event>.subscribe { |sender:, args:| ... }` /
`EventHandler.<domain>.<event>.trigger(sender:, args:, params:)`). ActiveRecord models automatically fire
`create`/`update`/`destroy` events; controller actions can pass `controller_params` through `args`. See
`docs/EventListeners.md` for the full contract before wiring new subscribers.

### Object deletion

Don't call `.destroy` directly on records with dependencies. Use `app/jobs/destroy_job.rb`
(`DestroyJob.perform_now(classname:, id:)` or `.perform_later`), driven by a model's overridden
`destroy_params` (`auto_deletable_references`, `ignore_references`, message strings) and optional
`pre_destroy` hook. The `RemoveComponent` React component (`frontend/components/RemoveComponent.js`) and
the `generic_destroy` route (`app/controllers/remove_controller.rb`) are the standard UI/API entry points.
Read `docs/RemoveController.md` before adding destroy behavior to a new model.

### Backend structure

Standard Rails layout under `app/`: `controllers`, `models`, `serializers` (active_model_serializers /
fast_jsonapi), `services` (business logic, organized by domain e.g. `services/activities`,
`services/payments`, `services/plannings`), `jobs` (Sidekiq/ActiveJob), `mailers`, `channels`
(ActionCable), `chewy` (Elasticsearch index definitions), `listeners` (event subscribers). Routes are a
single large `config/routes.rb` — plugin routes are deliberately prepended before the app's own routes so
plugins can override core behavior. Authorization uses `cancancan`; auth uses `devise` plus custom
OAuth/OIDC endpoints (`lib/token_endpoint.rb`, `lib/authorization_endpoint.rb`, `config/routes.rb`
`namespace :oidc`).

`ApplicationController` (`app/controllers/application_controller.rb`) is the shared base: it enforces
`authenticate_user!`, season verification, and centralizes JSON/HTML error rendering for
`BaseRendererError` and `CanCan::AccessDenied`. Look here before changing global request/error handling.

### Frontend structure

React components live under `frontend/components/` (feature-named subfolders, e.g. `activities/`,
`courses/`, `evaluation/`, `formules/`, `advancedSearch/`), shared JS helpers under `frontend/tools/`
(`api.js`, `date.js`, `format.js`, `validators.js`, etc.), and entry packs under `frontend/packs/`. Views
mount React components into server-rendered ERB pages via `react_component "ComponentName", { props... }`
(see any file under `app/views` using `react_component`) — this is not a client-routed SPA, each Rails view
renders its own React island.

### Multi-tenancy / config

App-level runtime settings are managed through `Parameter`/`Settings` (see `config/settings.yml` and
`ActiveRecord::Base.connection` "Parameter.get_value" usage in `lib/tasks/elvis.rake`) rather than plain
Rails config for things that need to be admin-editable at runtime.

## Localization

Default and only enforced locale is French (`config/application.rb`: `config.i18n.default_locale = :fr`,
`I18n.enforce_available_locales = false`). Much of the in-repo documentation (`docs/*.md`) is written in
French — read it as-is rather than expecting English docs.

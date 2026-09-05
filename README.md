
<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" height="200px" srcset="./public/logo.png">
    <img alt="logo" height="200px" src="./public/logo.png">
  </picture>
</div>

# About
The Elvis project is open-source software maintained by the [Elvis](https://www.callingelvis.com/) team.

The codebase of 'Elvis' was originally developed as 'Ziggy' for [Le CEM](https://www.le-cem.com/) by the [Sixmon](https://www.sixmon.net/) team.

The Elvis team would like to express their gratitude to Le CEM for making Ziggy open source and for their ongoing support of the Elvis project.

# Description

Elvis is a web application that allows you to manage your music school and their associated tasks.

## Member Management
* Management of educational members, teachers, and students
* Data extraction (CSV format)
* Advanced search capabilities

## Registration Module

* Selection of activity choices, schedule preferences, and teachers for members
* Dematerialized registration request form (online pre-registration)
* Family grouping: entering multiple payers and guardians for a student

## Scheduling Tool

* Complete scheduling for teachers and rooms
* Planning of recurring tasks (classes and holidays)
* Integration with administrative management (staff attendance/absence)

## Educational Module

* Student evaluation: evaluation methods, monitoring and updating of evaluation records
* Online teaching follow-up: document sharing, communication space (scheduled for release in 2024)

## Payment Management

* Payment schedules and tracking of receipts
* Configuration of payment methods
* Adding multiple payers for a student

# Installation

## Install with Docker
You can use docker to just run the project.

### docker-compose
You must define the environment variable `GITHUB_TOKEN` with a valid github token to be able to download the private gems if any.  
If you don't have one, you can remove the respective lines in the [docker-compose.yml](./docker-compose.yml) file: `:?GITHUB_TOKEN is required` in args of base elvis image.

Download the source code and run the commands below:

- `docker-compose build`
- `docker-compose up`

For the initial setup, create the first super user using the command below:
- `docker exec -it elvis bash`
- `rails console`
- ```ruby
  u = User.new email: "johndoe@gmail.com", is_admin: true, is_creator: true, first_name: "John", last_name: "Doe", current_sign_in_at: DateTime.now, last_sign_in_at: DateTime.now, sign_in_count: 1
  u.password = "test1234"
  u.password_confirmation = "test1234"
  u.save!
  ```
  
You can now access the application on http://localhost:7212

### docker run
You can also use docker directly to run the project.

In this case, you must run a postgresql server and set all environment variables like in the [docker-compose.yml](./docker-compose.yml) file.
The same applies to elastic-search.

1. `docker build --build-arg github_token -t elvis .`

2. For database setup, you have two options:
   - use docker run with init entrypoint
     - `docker run -p 7212:7212 -e ... --entrypoint "./entrypoints/init.sh" elvis`
   - run the commands below (in elvis container or directly in your terminal - requires local install of rails):
     - ```bash
       bundle exec rake elvis:plugins:discover
       bundle exec rake elvis:plugins:migrate
       ```
- `docker run -p 7212:7212 -e ... elvis`

### use online provided image
You can also use the image provided on this github repository, but this image does not contain any plugins.

To use this image, replace elvis:build image tag by `ghcr.io/elvis-software/elvis:latest` in the [docker-compose.yml](./docker-compose.yml) file and remove build section or in the docker run command.

## Install with script
You can use the script [ubuntu22.sh](dev-install/ubuntu22.sh) to install all dependencies and compile the project (you must run script at the root of the project).
- `chmod u+x ./dev-install/ubuntu22.sh`
- `./dev-install/ubuntu22.sh [psql_password] [rails admin email] [rails admin first name] [rails admin last name] [rails admin password]`

All parameters in [] are optional, if you don't specify them, default values will be used.

## Install manually

### Using asdf (recommended)
If you use [asdf](https://asdf-vm.com/), the repository ships a [.tool-versions](./.tool-versions)
file pinning the recommended ruby and node versions, so you don't need rvm/nvm at all:

```shell
asdf plugin add ruby
asdf plugin add nodejs
asdf install
```

This installs the exact versions listed in `.tool-versions` and asdf will pick them up
automatically whenever you're in this directory. On macOS, `mimemagic`'s native extension also
needs the `shared-mime-info` package, which isn't installed by default:

```shell
brew install shared-mime-info
```

Then skip ahead to [Set up optional dependencies](#set-up-optional-dependencies) below — you
still need Postgres/Redis/Elasticsearch, just not ruby/node themselves.

### Using rvm / nvm
- install rvm
  - Install dependencies and rvm 
    ```shell
    sudo apt-get install software-properties-common
    sudo apt-add-repository -y ppa:rael-gc/rvm
    sudo apt-get update
    sudo apt-get install rvm libssl1.0-dev
    ```
  - optionnaly add your user to the rvm group to avoid using sudo
    ```shell
    sudo usermod -a -G rvm $USER
    ```
- install ruby version 3.3.12 
  - ```shell
    rvm install 3.3.12
    ```
- install bundler (bundle version is specified in the `Gemfile.lock` file) :
  ```shell
  gem install bundler
  ```
- install postgresql version 14 or postgresql-client version 14
  - ```shell
    sudo apt-get install postgresql-14
    ```
  - ```shell
    sudo apt-get install libpq-dev postgresql-client-14
    ```
- install node version 20
  - direct install
    ```shell
    curl -sL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```
  - install with nvm
    ```shell
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
    export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")" && \. "$NVM_DIR/nvm.sh"
    source $NVM_DIR/nvm.sh
    nvm install 20
    ```
- install yarn in global
  ```shell
  npm install --global yarn
  ```
- you can now install [optional dependencies](#optionnal-dependencies)
- go to [compile section](#compile)

#### link for more information of dev env
 - [rvm](https://github.com/rvm/ubuntu_rvm)
 - [nvm](https://github.com/nvm-sh/nvm/tree/v0.39.3)
 - [postgresql v14 specific](https://techviewleo.com/how-to-install-postgresql-database-on-ubuntu/)

#### Set up optional dependencies
If you're running ruby/node natively (e.g. via asdf above) rather than through the full
`docker-compose.yml` stack, you still need Postgres, Redis, and Elasticsearch. The simplest way is
[docker-compose-dev.yml](./docker-compose-dev.yml), which starts all three with credentials/ports
already matching [config/database.yml](./config/database.yml)'s `development` block and
[config/chewy.yml](./config/chewy.yml)'s `development` host, so no extra configuration is needed:

```shell
docker-compose -f docker-compose-dev.yml up -d database redis elasticsearch
```

This uses named volumes, so data persists across restarts (`docker-compose -f
docker-compose-dev.yml down` to stop, add `-v` to also wipe the volumes). These are separate,
distinctly-named containers/volumes from the main `docker-compose.yml` stack, so both can run at
the same time without clashing.

Alternatively, run each service by hand:
- Local postgresql server
  - `docker run -p 127.0.0.1:5432:5432 -e POSTGRES_USER=elvis -e POSTGRES_PASSWORD=elvis -e POSTGRES_DB=elvis postgres:14.0`
- Local redis server
  -  `docker pull redis:6.2.6`
  -  `docker run -p 127.0.0.1:6379:6379 redis:6.2.6`
- Local elastic-search server
  - `docker pull elasticsearch:7.16.3`
  - `docker run -p 127.0.0.1:9200:9200 -p 127.0.0.1:9300:9300 -e "discovery.type=single-node" elasticsearch:7.16.3`

### Compile
at the root of the repository :
- `bundle install`
- `yarn`

### Database setup
- first run
  - `rails db:prepare`
- if you use an existing database
  - `rails db:migrate`
- if plugins are added, complete [plugin doc](./docs/Plugin-UtilisationAndConf.md) before run
- run a rails console to create an admin user: `rails console`
```ruby
u = User.new email: "johndoe@gmail.com", is_admin: true, first_name: "John", last_name: "Doe", current_sign_in_at: DateTime.now, last_sign_in_at: DateTime.now, sign_in_count: 1
u.password = "test1234"
u.password_confirmation = "test1234"
u.save!
```

### Run
- `foreman start`

# Additional information
## Recommended versions
- postgresql v14
- node v20
- ruby v3.3.2
- rails v6.1.7.8
- elastic-search v7.16.3
## Soft restart
- send `SIGUSR2` signal to process
- change restart.txt in tmp folder (add any value)
## Removed dead code
Code confirmed unreachable (no import/consumer anywhere in the app) was deleted outright rather
than kept around "just in case" — this fork has no plugins, so the "a plugin might still use it"
caveat that used to justify leaving dead code in place doesn't apply. To recover any entry below,
find the commit that removed it, then check out the parent state:
```shell
# Whole file/directory deletions:
git log --oneline --diff-filter=D -- <path>

# Partial removals (a block deleted from a file that still exists) -- pick a distinctive
# symbol name from the entry below and pickaxe-search for the commit that removed it:
git log --oneline -S'<symbol>' -- <path>

# Once you have the commit SHA from either search:
git show <that-sha>^:<path>            # print the file/lines as they were just before
git checkout <that-sha>^ -- <path>     # or restore the whole file in place
```
- `frontend/components/generalPayments/GeneralPayments.jsx`: unused `swal` (`sweetalert2`) and
  `csrfToken` imports.
- `frontend/components/generalPayments/CheckList.jsx`: dead `message` state (never rendered, no
  `MessageModal`) and the `MESSAGE_MODAL_ID` constant it went with.
- `frontend/components/formules/NewFormule.jsx` (whole file, 603 lines): standalone "create
  formule" screen superseded by `EditFormule.jsx`.
- `frontend/components/planning/Calendar.jsx`: the `ConflictDisplayItem` component (referenced only
  from inside a commented-out JSX block in `CalendarControls`) plus that commented block itself,
  and the `handleSetToConflictDate` method/prop-thread that had no other caller once that block
  was gone.
- `frontend/components/planning/activity_management/` (whole subtree: `index.jsx`,
  `attendance_table.jsx`, `activity_edition.jsx`, `edit_group_name_input.jsx`,
  `recurrences_editor.jsx`, `teacher_covering_editor.jsx`, `teachers_editor.jsx`): an abandoned
  extract-into-files refactor — everything in it was unreachable except the `withSave` helper,
  which moved to `frontend/components/planning/withSave.jsx` (its one live consumer,
  `ActivityDetailsModal.jsx`, now imports it from there).
- `frontend/components/planning/ActivityDetailsModal.jsx`: the `TeachersEditor` component, the
  `renderTeacherSelection()` method, and the `teachers_constrained` state field they were the only
  readers of (computed in two places, read nowhere after `renderTeacherSelection` was gone) — the
  live teacher-editing UI is inline in the same file. Locale keys removed with it:
  `planning:activityModal.teachersEditor.{teacher,main,remove,needMainTeacher,cannotRemoveMain}`
  and `planning:activityModal.{otherTeacherLabel,chooseTeacher}` (also only read by the dead
  method); `planning:activityModal.{noMainTeacher,teacherLabel}` were left alone — both still used
  by the live `ActivityEdition` component.

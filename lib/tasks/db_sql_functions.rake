# frozen_string_literal: true

require_relative "../elvis/database_functions"

# db/schema.rb (Ruby schema format) cannot express custom SQL objects such as the
# adjusted_amount() Postgres function (see lib/elvis/database_functions.rb and
# db/migrate/20260915000000_recreate_adjusted_amount_function.rb). A database built purely
# from schema.rb never runs that migration's raw SQL, even though schema_migrations marks
# it "up" -- so re-apply every Elvis::DatabaseFunctions definition after each schema-only
# database build:
#   - `db:schema:load`, used directly by CI to prepare the test database
#   - `db:test:prepare`, invoked by ActiveRecord::Migration.maintain_test_schema! before
#     every local `bundle exec rspec` run whenever schema.rb has changed
%w[db:schema:load db:test:prepare].each do |task_name|
  Rake::Task[task_name].enhance do
    Elvis::DatabaseFunctions.ensure_all!
  end
end

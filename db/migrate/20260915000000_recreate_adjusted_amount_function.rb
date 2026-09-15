# frozen_string_literal: true

# Re-creates the `adjusted_amount` Postgres function (originally added by
# db/migrate/20220113150945_merge_all_migrations.rb via a raw `execute`). db/schema.rb
# can't capture custom SQL functions, so any database built from schema.rb alone --
# db:schema:load, db:test:prepare, or RSpec's automatic test-schema reload -- ends up
# with schema_migrations marking that old migration "up" while the function itself was
# never created. That's what broke POST /due_payments/list.json ("function
# adjusted_amount(character varying, numeric) does not exist"): due_payment_controller.rb
# and payments_controller.rb both call it in raw SQL fragments.
#
# This migration is the schema-tracked fix for real `rails db:migrate` history (e.g.
# production/staging). lib/elvis/database_functions.rb + lib/tasks/db_sql_functions.rake
# additionally re-apply the same DDL after any schema-only database build, since that
# path never replays this migration's body even when it does run it once.
class RecreateAdjustedAmountFunction < ActiveRecord::Migration[6.1]
  def up
    execute Elvis::DatabaseFunctions::ADJUSTED_AMOUNT_SQL
  end

  def down
    execute "DROP FUNCTION IF EXISTS adjusted_amount(text, real);"
  end
end

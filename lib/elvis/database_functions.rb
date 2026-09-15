# frozen_string_literal: true

module Elvis
  # Re-applies custom PostgreSQL functions defined below as raw SQL.
  #
  # db/schema.rb (this app uses the Ruby schema format) can only express tables, indexes,
  # foreign keys and extensions -- it cannot capture a `CREATE FUNCTION`. A database built
  # purely from schema.rb (db:schema:load, db:test:prepare, and the automatic
  # ActiveRecord::Migration.maintain_test_schema! reload RSpec runs before the suite) marks
  # the migration that created such a function as already applied without ever running its
  # SQL body, silently leaving the function missing. See lib/tasks/db_sql_functions.rake,
  # which calls .ensure_all! after those schema-only loads, and
  # db/migrate/20260915000000_recreate_adjusted_amount_function.rb for the migration used by
  # real `rails db:migrate` history. (Kept as Ruby constants, not a db/*.sql file, since this
  # repo's .gitignore excludes *.sql wholesale.)
  module DatabaseFunctions
    # Signs a payment/due_payment amount by its "operation" column ('+', '-', '0'). Used from
    # raw SQL in app/controllers/due_payment_controller.rb and
    # app/controllers/payments_controller.rb, and from Ruby via Payment#adjusted_amount /
    # DuePayment#adjusted_amount.
    ADJUSTED_AMOUNT_SQL = <<~SQL
      CREATE OR REPLACE FUNCTION adjusted_amount(op text, amount real) RETURNS REAL AS $$
        BEGIN
          CASE op
            WHEN '-' THEN
              RETURN -1 * amount;
            WHEN '0' THEN
              RETURN 0;
            ELSE
              RETURN amount;
          END CASE;
        END;
      $$ LANGUAGE plpgsql;
    SQL

    ALL_SQL = {
      adjusted_amount: ADJUSTED_AMOUNT_SQL
    }.freeze

    def self.ensure_all!
      ALL_SQL.each_value { |sql| ActiveRecord::Base.connection.execute(sql) }
    end
  end
end

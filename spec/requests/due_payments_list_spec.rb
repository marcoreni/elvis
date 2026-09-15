# frozen_string_literal: true

require "rails_helper"

# Regression coverage for POST /due_payments/list.json 500ing with
# `PG::UndefinedFunction: function adjusted_amount(character varying, numeric) does not exist`.
#
# Root cause: db/migrate/20220113150945_merge_all_migrations.rb creates the adjusted_amount()
# Postgres function via a raw `execute`, but db/schema.rb (this app's Ruby schema format) can't
# capture custom SQL objects like that. Any database built purely from schema.rb --
# db:schema:load (what CI's "Prepare test database" step runs), db:test:prepare, or the
# automatic ActiveRecord::Migration.maintain_test_schema! reload before this very suite -- marks
# that migration "up" without ever running its body, leaving the function missing. See
# db/migrate/20260915000000_recreate_adjusted_amount_function.rb and lib/tasks/db_sql_functions.rake
# for the fix (re-applies Elvis::DatabaseFunctions after every schema-only database build).
RSpec.describe "Due payments list", type: :request do
  include Devise::Test::IntegrationHelpers

  let(:admin) do
    FactoryBot.create(:user, email: "due-payments-list-spec@example.com", is_admin: true,
                             first_name: "Admin", last_name: "DuePaymentsSpec")
  end
  let(:payer) do
    FactoryBot.create(:user, email: "due-payments-list-payer@example.com",
                             first_name: "Payer", last_name: "DuePaymentsSpec")
  end
  let(:schedule_status) { PaymentScheduleStatus.create!(label: "En attente de règlement") }
  let(:payment_schedule) do
    PaymentSchedule.create!(user: payer, payable_type: "User", payment_schedule_status: schedule_status)
  end

  before do
    sign_in admin
    DuePayment.create!(
      payment_schedule: payment_schedule,
      amount: 42.5,
      operation: "+",
      previsional_date: Date.today,
      due_payment_status_id: DuePaymentStatus::UNPAID_ID
    )
  end

  it "returns 200 instead of 500ing on the adjusted_amount() SQL call" do
    post "/due_payments/list.json", params: {
      filtered: [],
      sorted: { id: "previsional_date", desc: false },
      page: 0,
      pageSize: 10
    }.to_json, headers: { "Content-Type" => "application/json" }

    expect(response).to have_http_status(:ok)
  end

  it "computes totalDueAmount via adjusted_amount() correctly" do
    post "/due_payments/list.json", params: {
      filtered: [],
      sorted: { id: "previsional_date", desc: false },
      page: 0,
      pageSize: 10
    }.to_json, headers: { "Content-Type" => "application/json" }

    body = JSON.parse(response.body)
    expect(body["rowsCount"]).to be >= 1
    expect(body["totalDueAmount"]).to eq(42.5)
  end
end

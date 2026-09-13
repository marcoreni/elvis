# frozen_string_literal: true

class AddPlanningIdToSchool < ActiveRecord::Migration[6.1]
  def up
    add_reference :schools, :planning, foreign_key: true
  end

  def down
    remove_reference :schools, :planning
  end
end

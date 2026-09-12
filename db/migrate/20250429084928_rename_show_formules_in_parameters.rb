class RenameShowFormulesInParameters < ActiveRecord::Migration[6.1]
  def up
    parameter = Parameter.find_by(label: "show_formules")
    return unless parameter

    parameter.update(label: "activity.show_formules")
  end

  def down
    parameter = Parameter.find_by(label: "activity.show_formules")
    return unless parameter

    parameter.update(label: "show_formules")
  end
end

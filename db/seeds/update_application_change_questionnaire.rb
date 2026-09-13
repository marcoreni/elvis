# frozen_string_literal: true

Question.find_by(name: "change_location").update(select_values: "Indifférent:static_0", is_required: true)

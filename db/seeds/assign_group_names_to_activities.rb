# frozen_string_literal: true

season = Season.current

User.teachers.each do |teacher|
  Activities::AssignGroupsNames
    .new(teacher, season)
    .execute
end

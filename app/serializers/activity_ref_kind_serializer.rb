# == Schema Information
#
# Table name: activity_ref_kinds
#
#  id           :bigint           not null, primary key
#  name         :string
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  is_for_child :boolean          default(FALSE)
#  deleted_at   :datetime
#

class ActivityRefKindSerializer < ActiveModel::Serializer
  attributes :id, :name
end

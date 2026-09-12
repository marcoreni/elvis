# frozen_string_literal: true

class PacksController < ApplicationController
  def index
    return if current_user.is_admin || current_user.is_teacher

    redirect_to root_path
  end

  def get_student_packs_attendance
    render json: {
      teachers: User.where(is_teacher: true).as_json(only: %i[id first_name last_name]),
      activity_refs: ActivityRef.all.as_json(only: %i[id label]),
      seasons: Season.all.as_json,
      selected_season: Season.current.as_json,
      nb_students: Pack.select(:user_id).distinct.count
    }
  end

  def get_student_packs_attendance_by_filter
    packs = Pack.all

    unless params[:selectedTeacher].empty?
      packs = packs.joins(activity_ref: :users).where(users: { id: params[:selectedTeacher].to_i })
    end

    unless params[:selectedActivityRef].empty?
      packs = packs.joins(activity_ref: {}).where(activity_refs: { id: params[:selectedActivityRef].to_i })
    end

    packs = packs.where(season_id: params[:selectedSeason].to_i) unless params[:selectedSeason].empty?

    render json: {
      packs: packs.as_json(include: {
                             activity_ref: {},
                             activity_ref_pricing: {
                               include: {
                                 pricing_category: {}
                               }
                             },
                             user: {}
                           })
    }
  end
end

# frozen_string_literal: true

class StudentAttendancesController < ApplicationController
  def update
    attendance = StudentAttendance.find(params[:id])

    attendance.update attendance_params
  end

  def update_all
    student_attendances = params.permit({ student_attendances: {} })[:student_attendances].to_h.transform_keys(&StudentAttendance.method(:find))
    attendances = student_attendances.keys

    StudentAttendance.transaction do
      student_attendances.each do |attendance, attended|
        attendance.update!(attended: attended)
      end
    end

    result = attendances

    instances_ids = attendances.map(&:activity_instance_id).uniq
    result = ActivityInstance.find(instances_ids.first).student_attendances if instances_ids.one?

    render json: { attendances: result.as_json({
                                                 include: :user
                                               }) }
  end

  def update_remarks
    attendance = StudentAttendance.find(params[:id])
    attendance.update(remarks: params[:remarks])

    render json: { status: "success" }
  rescue StandardError => e
    render json: { status: "error", message: e.message }
  end

  private

  def attendance_params
    params.require(:student_attendance).permit(:attended)
  end
end

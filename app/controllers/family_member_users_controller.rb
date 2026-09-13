# frozen_string_literal: true

class FamilyMemberUsersController < ApplicationController
  def destroy
    fm = FamilyMemberUser.find(params[:id])
    fm.destroy

    render json: {}
  end
end

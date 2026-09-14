# frozen_string_literal: true

class SearchController < ApplicationController
  def index
    result = Search::OmnisearchService.call(params[:search_value])

    respond_to do |format|
      format.json { render json: result }
    end
  end
end

# frozen_string_literal: true

class RemoveController < ApplicationController
  before_action :get_object

  def destroy
    authorize! :destroy, @object

    EventHandler.send("#{@classname.name}").destroy_ended # call to create constant if not set

    Rails.configuration.event_store.within do
      DestroyJob.perform_now(*params)
    end
         .subscribe(to: ["Event#{@classname.name}DestroyEnded".constantize]) do |event|
      args = event.data[:args]

      if args[:success]
        respond_to do |format|
          format.html do
            flash[:success] = args[:message]
            redirect_to request.referer
          end
          format.json { render json: { message: args[:message], success: true }, status: :ok }
        end
      else
        respond_to do |format|
          format.html do
            flash[:destroy_error] = args[:message]
            redirect_to request.referer
          end
          format.json { render json: { message: args[:message], success: false }, status: args[:status] }
        end
      end
    end
      .call
  end

  def destroy_multiple
    ids = params[:ids] || []

    # transform string to array if needed
    ids = ids.split(",") if ids.is_a?(String)

    # get all elements to destroy if authorized
    # @type [Array<ApplicationRecord>]
    elements = ids.length > 0 ? @classname.where(id: ids).accessible_by(current_ability, :destroy).to_a : []

    if elements.empty?
      return render json: { message: t("controllers.remove.no_elements"), success: false },
                    status: :not_found
    end

    EventHandler.send("#{@classname.name}").destroy_ended

    # update ids with only elements that are accessible
    ids = elements.map(&:id)

    endedDestroyElements = []

    Rails.configuration.event_store.within do
      elements.each do |element|
        DestroyJob.perform_now(classname: @classname.name, object: element,
                               selected_dep_to_destroy: params[:selected_dep_to_destroy])
      end
    end.subscribe(to: ["Event#{@classname.name}DestroyEnded".constantize]) do |event|
      obj_id = event.data[:args][:objId]

      if ids.include?(obj_id)
        endedDestroyElements << {
          id: obj_id,
          data: {
            success: event.data[:args][:success],
            message: event.data[:args][:message],
            status: event.data[:args][:status]
          }
        }
      end
    end

    wait_count = 0
    wait_timeout = 600 # 60s (600 * 0.1s)

    # wait for all elements to be destroyed (if asynclly destroyed) or timeout
    while endedDestroyElements.size < elements.size && wait_count < wait_timeout
      sleep(0.1)

      wait_count += 1
    end

    render json: {
      message: t("controllers.remove.destroy_multiple.success"),
      success: endedDestroyElements.filter { |el| el[:data][:success] }.map { |el| el[:id] },
      failed: endedDestroyElements.filter { |el| !el[:data][:success] }
    }
  end

  def get_references
    references = @object.objects_that_reference_me
                        .filter { |ref| !@destroy_params[:auto_deletable_references].include?(ref.class) }
                        .filter { |ref| ref.undeletable_instruction(@object)[:possible] }

    references.map do |ref|
      {
        name: ref.class.name,
        display_name: ref.class.respond_to?(:display_name) ? ref.class.display_name : ref.class.name,
        to_string: (ref.to_s if ref.method(:to_s).owner == ref.class || ref.method(:to_s).owner == ApplicationRecord)
      }
    end
  end

  private

  def get_object
    # @type [Class<ApplicationRecord>]
    @classname = params[:classname].camelcase.constantize

    # @type [{ auto_deletable_references: Array<Class<ApplicationRecord>>, undeletable_message: String, deletable_message: String, success_message: String }]
    @destroy_params = @classname.destroy_params

    # @type [ApplicationRecord]
    @object = @classname.find(params[:id]) if params[:id]

    begin
      # @type [Array<Class<ApplicationRecord>>]
      @selected_dep_to_destroy = (params[:selected_dep_to_destroy] || []).map(&:constantize)
    rescue StandardError => e
      Rails.logger.error("Une erreur est survenue lors de la récupération des dépendances sélectionnées. #{e.message}\n#{(e.backtrace || []).join("\n")}")
      @selected_dep_to_destroy = []
    end
  rescue NameError => e
    Rails.logger.error("La classe n'a pas été trouvée: #{e.message}\n#{(e.backtrace || []).join("\n")}")

    respond_to do |format|
      format.html do
        flash[:destroy_error] = t("controllers.remove.class_not_found")
        redirect_to request.referer
      end
      format.json do
        render json: { message: t("controllers.remove.class_not_found"), success: false }, status: :not_found
      end
    end
  rescue ActiveRecord::RecordNotFound => e
    Rails.logger.error("L'objet n'a pas été trouvé: #{e.message}\n#{(e.backtrace || []).join("\n")}")

    respond_to do |format|
      format.html do
        flash[:destroy_error] = t("controllers.remove.object_not_found")
        redirect_to request.referer
      end
      format.json do
        render json: { message: t("controllers.remove.object_not_found"), success: false }, status: :not_found
      end
    end
  rescue StandardError => e
    Rails.logger.error("Une erreur est survenue lors de la suppression de l'objet. #{e.message}\n#{(e.backtrace || []).join("\n")}")

    respond_to do |format|
      format.html do
        flash[:destroy_error] = t("controllers.remove.generic_error")
        redirect_to request.referer
      end
      format.json do
        render json: { message: t("controllers.remove.generic_error"), success: false }, status: :internal_server_error
      end
    end
  end
end

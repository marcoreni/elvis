# frozen_string_literal: true

require_relative "../../lib/elvis/event_handler"

class ApplicationRecord < ActiveRecord::Base
  self.abstract_class = true

  if Rails.env.kubernetes?
    after_commit :commit_callback
    before_save :register_changes
  end

  # Human-readable name for the model, used in destroy-confirmation UI copy
  # (RemoveController#get_references) and in the undeletable_instruction/build_subject sentences
  # below. Delegates to Rails' own i18n-aware ActiveModel::Name#human, which looks up
  # `activerecord.models.<model_i18n_key>` (a plain string, or a `{one:, other:}` sub-hash
  # pluralized via `count:`) and falls back to a humanized class name when no locale entry exists.
  # See config/locales/{fr,en}.yml's `activerecord.models.*` for the per-model overrides.
  def self.display_class_name(singular = true)
    model_name.human(count: singular ? 1 : 2)
  end

  def self.class_name_gender
    :M
  end

  def class_name
    self.class.name
  end

  # Récupère les associations qui pointent vers le modèle courant
  # exemple: si on est dans PaymentMethod, on récupère les associations qui pointent vers PaymentMethod (like: DuePayment, Payment)
  # @return [Array<ActiveRecord::Reflection::BelongsToReflection>]
  def self.associations_that_reference_me
    ApplicationRecord
      .subclasses # on récupère tous les modèles
      .map do |model|
      model.reflections.filter do |_k, v|
        v.class_name == name # on récupère les associations qui pointent vers notre modèle
      rescue StandardError
        false # on ignore les associations qui ne sont pas définies
      end
    end
      .filter { |m| m.present? } # on filtre les valeurs nulles ou vides
      .flatten
      .map { |m| m.values } # on récupère les valeurs des associations (c'est un hash)
      .flatten
  end

  def self.build_subject(singular = true)
    d_name = display_class_name(singular)

    if singular
      if d_name[/^[aeiouyàâäéèêëîïôöùûüAEIOUYÀÂÄÉÈÊËÎÏÔÖÙÛÜ]/]
        I18n.t("models.application_record.build_subject.vowel", name: d_name)
      elsif class_name_gender == :F
        I18n.t("models.application_record.build_subject.feminine", name: d_name)
      else
        I18n.t("models.application_record.build_subject.masculine", name: d_name)
      end
    else
      I18n.t("models.application_record.build_subject.plural", name: d_name)
    end
  end

  def self.success_message
    # the gender suffix only makes grammatical sense in French ("supprimée" vs "supprimé");
    # other locales' success_message simply doesn't reference %{suffix}
    suffix = I18n.locale == :fr && class_name_gender == :F ? "e" : ""

    I18n.t("models.application_record.success_message", subject: build_subject.capitalize, suffix: suffix)
  end

  # Récupère les paramètres de suppression
  # @return [{ auto_deletable_references: Array<Class<ApplicationRecord>>, ignore_references: Array<Class<ApplicationRecord>>, undeletable_message: String, deletable_message: String, success_message: String }]
  def self.destroy_params
    {
      auto_deletable_references: [], # auto delete references before deleting object
      ignore_references: [], # ignore references and try to delete object
      undeletable_message: I18n.t("models.application_record.destroy_params.undeletable_message"),
      deletable_message: I18n.t("models.application_record.destroy_params.deletable_message"),
      success_message: success_message
    }
  end

  # @return [Array<ActiveRecord::Base>] Liste des objets qui pointent vers le modèle courant
  def objects_that_reference_me
    self.class.associations_that_reference_me
        .filter { |reflection| reflection.active_record != self.class } # on ignore les auto références
        .filter { |reflection| !reflection.through_reflection? } # on ignore les associations qui sont faite via une autre association
        .filter { |reflection| !reflection.foreign_key.include?("_csv") } # on ignore les associations qui sont faite pour des CSV
        .map do |reflection|
      query = reflection.belongs_to? ? { reflection.foreign_key => self[reflection.association_primary_key] } : { reflection.association_primary_key => self[reflection.foreign_key] }
      reflection
        .active_record # on récupère le modèle de l'association
        .where(query) # on récupère les objets qui pointent vers notre modèle
        .records
    end.flatten
  end

  # Instruction permettant de supprimer un objet utilisant la classe courante
  # méthode destiné à être surchargée dans les classes filles
  # @param [ApplicationRecord] source_object objet qui a appelé la méthode
  # @return [{ instruction: String, possible: Boolean }]
  def undeletable_instruction(_source_object = nil)
    instruction = I18n.t(
      "models.application_record.undeletable_instruction.default",
      class_name: self.class.display_class_name
    )

    { instruction: instruction, possible: true }
  end

  class AsyncExecutor
    include Concurrent::Async

    def execute(&block)
      block.call
    end
  end

  # async call of chewy callbacks
  def base_chewy_callbacks
    caller = self
    AsyncExecutor.new.async.execute do
      Chewy.strategy(:active_job) do
        chewy_callbacks.each { |callback| callback.call(caller) }
      end
    end
  end

  private

  # enregistre les changements avant la sauvegarde (update/create)
  def register_changes
    @changes = nil

    return unless has_changes_to_save?

    @changes = changes
  end

  def commit_callback
    classname = "#{self.class.name}".underscore.to_s
    events = []

    events << :create if transaction_include_any_action?([:create])
    events << :update if transaction_include_any_action?([:update])
    events << :destroy if transaction_include_any_action?([:destroy])

    return if @changes.nil? && !events.include?(:destroy)

    request = RequestStore.read :request

    args = {
      model: self,
      changes: @changes,
      controller_params: request&.params
    }

    events.each do |event|
      EventHandler.send(classname).send(event).trigger(sender: self, args: args)
    rescue StandardError => e
      Rails.logger.error "Error while triggering event #{event} on #{classname}: #{e.message}\n #{e.backtrace&.join("\n")}"
    end
  end
end

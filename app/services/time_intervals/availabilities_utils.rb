# frozen_string_literal: true

module TimeIntervals
  # Permet de créer un intervalle de temps de type "disponibilité" dans un planning.
  # Si des conflits sont détectés, l'intervalle ne sera pas créé.
  # Si le paramètre INTERVAL_STEPS est défini, l'intervalle sera segmenté en plusieurs intervalles de taille égale
  # Paramètres :
  # - from : Date de début de l'intervalle
  # - to : Date de fin de l'intervalle
  # - season_id : ID de la saison (pour la vérification des conflits)
  # - planning_id : ID du planning dans lequel créer l'intervalle (planning d'un utilisateur)
  # - comment : Commentaire à ajouter à l'intervalle
  # Retourne : Tableau du (ou des) intervalle(s) créés())
  class AvailabilitiesUtils
    def initialize(from, to, season_id, planning_id, comment)
      @from = from
      @to = to
      @kind = "p"
      @planning = Planning.includes(:time_intervals).find_by(id: planning_id)
      season = Season.find_by(id: season_id)
      raise IntervalError, "err_season_not_found" if season.nil?

      day_start = season.start
      day_end = day_start + 7.day
      @potential_conflicts = @planning
                             &.time_intervals
                             &.where({ start: (day_start..day_end) }) || []
      @comment = comment
    end

    # if save_in_database is false, the comment will not be created
    private def create_objects!(save_in_database: true)
      raise IntervalError, "err_planning_not_found" if @planning.nil?

      # If specified interval is invalid, raise error
      # From time >= to time
      # OR From date != to date (inteval not on the same day)
      raise IntervalError, "err_interval_bounds" if @from.to_datetime >= @to.to_datetime || @from.to_date != @to.to_date

      # Comment#user is a required belongs_to. A school-level availability planning (as opposed
      # to a teacher's) has no associated user (Planning#user is optional), so a comment can't be
      # attributed to anyone here -- fail with a structured error instead of letting
      # create_comment!/build_comment raise ActiveRecord::RecordInvalid uncaught.
      raise IntervalError, "err_comment_requires_planning_user" if @comment.present? && @planning.user.nil?

      step_param = Parameter.find_by_label("INTERVAL_STEPS")
      # Steps are expressed in minutes. An absent parameter (or one without a "p" entry) just
      # means "don't segment" -- it's not an error condition.
      step = step_param.nil? ? 0 : (step_param.parse[@kind] || 0)

      has_conflicts = false
      new_intervals = []
      TimeInterval.transaction do
        new_intervals = segment_interval(@from, @to, step).map do |int|
          existing_interval = @planning.time_intervals.find_by(start: int[:start], end: int[:end],
                                                               kind: @kind, is_validated: false)
          next if existing_interval

          interval = TimeInterval.new
          interval.start = int[:start]
          interval.end = int[:end]
          interval.kind = @kind
          interval.is_validated = false

          if check_conflicts?(interval)
            has_conflicts = true
            nil
          else
            if save_in_database
              interval.save!
              unless @comment.blank?
                interval.create_comment!(content: @comment.strip,
                                         user: @planning.user)
              end
            else
              interval.build_comment(content: @comment.strip, user: @planning.user) unless @comment.blank?
            end

            interval
          end
        end
                                                          .compact

        raise IntervalError, "err_interval_creation_failed" if new_intervals.length == 0 || has_conflicts
      end

      new_intervals
    end

    def bulk_create
      new_intervals = create_objects!

      @planning.time_intervals << new_intervals
      @planning.save!

      new_intervals
    end

    # Check if the interval can be created
    # Returns [true, [created_intervals], nil] if the interval can be created
    # Returns [false, [], IntervalError] if the interval cannot be created
    def can_create?
      [true, create_objects!(save_in_database: false), nil]
    rescue IntervalError => e
      [false, [], e]
    end

    private

    def segment_interval(from, to, step)
      intervals = []

      from_time = from.to_datetime
      to_time = to.to_datetime

      if step == 0
        intervals << { start: from_time, end: to_time }
      elsif (interval_count = ((to_time - from_time) * 1.day.in_minutes.to_i / step).to_f.floor - 1)

        for i in 0..interval_count
          start_date = from_time + (i * step).minutes
          end_date = start_date + step.minutes

          intervals << { start: start_date, end: end_date }
        end
      end

      intervals
    end

    def check_conflicts?(interval)
      @potential_conflicts.each do |pc|
        if interval.kind == "p" && pc.kind == "p" && pc.overlap_in_any_way?(interval)
          return true
        elsif interval.kind != "p" && pc.kind != "p" && pc.overlap_in_any_way?(interval)
          return true
        end
      end

      false
    end
  end
end

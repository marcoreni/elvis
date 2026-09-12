module StudentEvaluations
  class GetEvaluationWeeks
    def execute
      next_season = Season.next
      current_season = Season.current

      year = next_season.nil? ? current_season.end.year : next_season.start.year

      fromMonth = Time.new(year, 6, 1)
      toMonth = Time.new(year, 9, 1)

      from = fromMonth.to_date.beginning_of_month.beginning_of_week
      to = toMonth.to_date.end_of_month.end_of_week

      (from..to).each_with_object({}) do |date, dates|
        dates[date.year] = {} if dates[date.year].nil?
        dates[date.year][date.month] = [] if dates[date.year][date.month].nil?

        start_of_week = date.to_date.beginning_of_week
        end_of_week = date.to_date.end_of_week

        dates[date.year][date.month] << { from: start_of_week, to: end_of_week } if start_of_week == date.to_date
      end
    end
  end
end

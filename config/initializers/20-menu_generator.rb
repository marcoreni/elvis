module MenuGenerator
  def self.generate_menus
    generate_side_menu
    generate_my_menu
  end

  def self.generate_side_menu
    Elvis::MenuManager.add_menu :side_menu

    if Plugin.visible.any? && !Elvis::MenuManager.plugin_item?
      parent_menu = Elvis::MenuManager::MenuItem.new(
        :plugins,
        "plugins",
        "index",
        { caption: :"menu.plugins", icon:"fa-puzzle-piece", user_role:"admin", position: 8 }
      )

      Elvis::MenuManager.insert_menu_item :side_menu, parent_menu
    end

    #admin menu

    users = Elvis::MenuManager::MenuItem.new(
      :users,
      "users",
      "index",
      { caption: :"menu.users", icon: "fa-user-friends", user_role: "admin", position: 0 }
    )

    inscriptions = Elvis::MenuManager::MenuItem.new(
      :inscriptions,
      "inscriptions",
      "",
      { caption: :"menu.inscriptions", icon: "fa-file-alt", user_role: "admin", position: 1 }
    )
    inscriptions.add(Elvis::MenuManager::MenuItem.new(
      :adherents,
      "adhesion",
      "index",
      { caption: :"menu.adhesions" }
    ))
    inscriptions.add(Elvis::MenuManager::MenuItem.new(
      :activities_applications,
      "activities_applications",
      "index",
      { caption: :"menu.applications" }
    ))

    inscriptions.add(Elvis::MenuManager::MenuItem.new(
      :monitor_students,
      "packs",
      "index",
      { caption: :"menu.packs", icon: "fa-user-graduate", user_role: "admin" }
    ))
    inscriptions.add(Elvis::MenuManager::MenuItem.new(
      :new_activities_applications,
      "activities_applications",
      "new",
      { caption: :"menu.new_application" }
    ))
    inscriptions.add(Elvis::MenuManager::MenuItem.new(
      :status_activities_applications,
      "parameters/activity_application_parameters",
      "index",
      { caption: :"menu.params" }
    ))

    plannings = Elvis::MenuManager::MenuItem.new(
      :plannings,
      "plannings",
      "",
      { caption: :"menu.plannings", icon: "fa-calendar", user_role: "admin", position: 2 }
    )

    #----------------------------------------------------------------------------------------

    plannings.add(Elvis::MenuManager::MenuItem.new(
      :admin_presence_sheet,
      "users",
      "presence_sheet",
      { caption: :"menu.presences", icon: "fa-check", user_role: "teacher", position: 1 }
    ) do
      { id: current_user&.id, date: Date.today.strftime("%F") }
    end)

    #----------------------------------------------------------------------------------------


    plannings.add(Elvis::MenuManager::MenuItem.new(
      :seasons,
      "seasons",
      "index",
      { caption: :"menu.seasons" }
    ))
    plannings.add(Elvis::MenuManager::MenuItem.new(
      :activity,
      "activity",
      "index",
      { caption: :"menu.courses_list" }
    ))
    plannings.add(Elvis::MenuManager::MenuItem.new(
      :planning_teachers,
      "planning",
      "index_for_teachers",
      { caption: :"menu.planning_teachers" }
    ))
    plannings.add(Elvis::MenuManager::MenuItem.new(
      :planning_rooms,
      "planning",
      "index_for_rooms",
      { caption: :"menu.planning_rooms" }
    ))
    plannings.add(Elvis::MenuManager::MenuItem.new(
      :scripts,
      "scripts",
      "replicate_week_activities",
      { caption: :"menu.replicate_courses" }
    ))
    plannings.add(Elvis::MenuManager::MenuItem.new(
      :planning_parameters,
      "parameters/planning_parameters",
      "index",
      { caption: :"menu.params" }
    ))

    monitoring = Elvis::MenuManager::MenuItem.new(
      :monitoring,
      "absences",
      "",
      { caption: :"menu.monitoring", icon: "fa-clipboard-list", user_role: "admin", position: 2.5 }
    )
    monitoring.add(Elvis::MenuManager::MenuItem.new(
      :absences,
      "absences",
      "index",
      { caption: :"menu.absences" }
    ))

    payments = Elvis::MenuManager::MenuItem.new(
      :payments,
      "payments",
      "",
      { caption: :"menu.payments", icon: "fa-euro-sign", user_role: "admin", position: 3 }
    )
    payments.add(Elvis::MenuManager::MenuItem.new(
      :payment,
      "payments",
      "index",
      { caption: :"menu.payments" }
    ))
    payments.add(Elvis::MenuManager::MenuItem.new(
      :payments_parameters,
      "parameters/payments_parameters",
      "index",
      { caption: :"menu.params" }
    ))

    locations = Elvis::MenuManager::MenuItem.new(
      :rooms,
      "parameters/rooms_parameters",
      "index",
      { caption: :"menu.rooms_sites", icon: "fa-calendar", user_role: "admin", position: 4 }
    )

    activities = Elvis::MenuManager::MenuItem.new(
      :activities,
      "activities",
      "",
      { caption: :"menu.activities", icon: "fa-music", user_role: "admin", position: 5 }
    )
    activities.add(Elvis::MenuManager::MenuItem.new(
      :activity_ref_kind,
      "activity_ref_kind",
      "index",
      { caption: :"menu.activity_families" }
    ))
    activities.add(Elvis::MenuManager::MenuItem.new(
      :instruments,
      "instruments",
      "index",
      { caption: :"menu.instruments" }
    ))
    activities.add(Elvis::MenuManager::MenuItem.new(
      :activity_ref,
      "activity_ref",
      "index",
      { caption: :"menu.activity_refs" }
    ))
    show_formules = Parameter.find_by(label: 'activity.show_formules')&.value == 'true'
    if show_formules
      activities.add(Elvis::MenuManager::MenuItem.new(
        :formule,
        "formules",
        "index",
        { caption: :"menu.formulas" }
      ))
    end

    evaluations = Elvis::MenuManager::MenuItem.new(
      :evaluations,
      "evaluations",
      "",
      { caption: :"menu.evaluations", icon: "fa-graduation-cap", user_role: "admin", position: 6 }
    )
    evaluations.add(Elvis::MenuManager::MenuItem.new(
      :student_evaluations_stats,
      "student_evaluations_stats",
      "stats",
      { caption: :"menu.evaluations_summary" }
    ))
    evaluations.add(Elvis::MenuManager::MenuItem.new(
      :evaluation_appointments,
      "evaluation_appointments",
      "index",
      { caption: :"menu.evaluations_management" }
    ))
    evaluations.add(Elvis::MenuManager::MenuItem.new(
      :evaluation_appointments_incomplete,
      "evaluation_appointments",
      "incomplete",
      { caption: :"menu.students_without_slots" }
    ))
    evaluations.add(Elvis::MenuManager::MenuItem.new(
      :evaluation_parameters,
      "parameters/evaluation_parameters",
      "index",
      { caption: :"menu.params" }
    ))

    parameters = Elvis::MenuManager::MenuItem.new(
      :parameters,
      "parameters",
      "index",
      { caption: :"menu.parameters", icon: "fa-cog", user_role: "admin", position: 10 }
    )


    Elvis::MenuManager.insert_menu_item :side_menu, users
    Elvis::MenuManager.insert_menu_item :side_menu, inscriptions
    Elvis::MenuManager.insert_menu_item :side_menu, plannings
    Elvis::MenuManager.insert_menu_item :side_menu, monitoring
    Elvis::MenuManager.insert_menu_item :side_menu, payments
    Elvis::MenuManager.insert_menu_item :side_menu, locations
    Elvis::MenuManager.insert_menu_item :side_menu, activities
    Elvis::MenuManager.insert_menu_item :side_menu, evaluations
    Elvis::MenuManager.insert_menu_item :side_menu, parameters

    #teacher menu
    planning = Elvis::MenuManager::MenuItem.new(
      :planning,
      "planning",
      "show_simple",
      { caption: :"menu.my_planning", icon: "fa-calendar", user_role: "!!teacher", position: 0 }
    )

    teacher_inscriptions = Elvis::MenuManager::MenuItem.new(
      :teachers_activities_applications,
      "activities_applications",
      "index",
      { caption: :"menu.applications", icon: "fa-table", user_role: "!!teacher", position: 1 }
    )

    attendences = Elvis::MenuManager::MenuItem.new(
      :users,
      "users",
      "presence_sheet",
      { caption: :"menu.presences", icon: "fa-check", user_role: "!!teacher", position: 2 }
    ) do
      { id: current_user&.id, date: Date.today.strftime("%F") }
    end

    disponibility = Elvis::MenuManager::MenuItem.new(
      :plannings,
      "planning",
      "show_availabilities",
      { caption: :"menu.my_availabilities", icon: "fa-calendar-check", user_role: "!!teacher", position: 3 }
    )

    evaluation = Elvis::MenuManager::MenuItem.new(
      :evaluations,
      "users",
      "season_activities",
      { caption: :"menu.my_evaluations", icon: "fa-graduation-cap", user_role: "!!teacher", position: 4 }
    ) do
      { id: current_user&.id }
    end


    planning_simulation = Elvis::MenuManager::MenuItem.new(
      :planning_simulation,
      "users",
      "previsional_groups",
      { caption: :"menu.planning_simulation", icon: "fa-users", user_role: "!!teacher", position: 5 }
    ) do
      { id: current_user&.id }
    end

    teacher_courses = Elvis::MenuManager::MenuItem.new(
      :teacher_courses,
      "activity",
      "index",
      { caption: :"menu.courses_list", icon: "fa-list", user_role: "!!teacher", position: 6 }
    )


    Elvis::MenuManager.prepend_menu_item :side_menu, planning
    Elvis::MenuManager.prepend_menu_item :side_menu, teacher_inscriptions if Parameter.get_value("activity_applications.authorize_teachers", default: false)
    Elvis::MenuManager.prepend_menu_item :side_menu, attendences
    Elvis::MenuManager.prepend_menu_item :side_menu, disponibility
    Elvis::MenuManager.prepend_menu_item :side_menu, evaluation
    Elvis::MenuManager.prepend_menu_item :side_menu, planning_simulation
    Elvis::MenuManager.prepend_menu_item :side_menu, teacher_courses if Parameter.get_value("teachers.teacher_can_manage_courses", default: false)

    # User menu

    homepage = Elvis::MenuManager::MenuItem.new(
      :user_homepage,
      "my_activities",
      "show",
      { caption: :"menu.home", icon: "fa-home", user_role: "simple", position: 1 },
      ) do
      { id: current_user&.id }
    end

    applications = Elvis::MenuManager::MenuItem.new(
      :user_applications,
      "users",
      "new_application",
      { caption: :"menu.my_applications", icon: "fa-table", user_role: "simple", position: 2 },
      ) do
      { id: current_user&.id }
    end

    Elvis::MenuManager.prepend_menu_item :side_menu, applications
    Elvis::MenuManager.prepend_menu_item :side_menu, homepage
  end

  def self.generate_my_menu
    Elvis::MenuManager.add_menu :my_menu

    my_profile = Elvis::MenuManager::MenuItem.new(
      :my_profile,
      "users",
      "show",
      { caption: :"menu.my_profile", icon: "fa-user", position: 1 }
    ) do
      { id: current_user&.id }
    end

    divider = Elvis::MenuManager::MenuItem.new(
      :divider,
      "",
      "",
      { user_role: "admin" }
    )

    disconnect = Elvis::MenuManager::MenuItem.new(
      :disconnect,
      "sessions",
      "destroy",
      { caption: :"menu.logout", icon:"fa-sign-out-alt", position: 100, a_options: { "data-method": "delete" } }
    )


    Elvis::MenuManager.insert_menu_item :my_menu, my_profile
    Elvis::MenuManager.insert_menu_item :my_menu, divider
    Elvis::MenuManager.insert_menu_item :my_menu, disconnect

  end

  def self.regenerate_menus
    Elvis::MenuManager.clear_menus

    generate_side_menu
    generate_my_menu

    Plugin.where.not(activated_at: nil).each do |plugin|
      config_file = File.read(File.join(plugin.absolute_path, "config", "config.json"))
      config = JSON.parse(config_file)

      plugin.register_settings(config["settings"]) if plugin.configurable?

      menus = if Module.const_defined?(plugin.name.camelcase) && (plugin_module = Module.const_get(plugin.name.camelcase)) && plugin_module.respond_to?(:menu_is_to_add?)
                config["menus"].filter { |m| plugin_module.menu_is_to_add?(m) }
              else
                config["menus"]
              end

      # inscription des menus du plugin
      Plugin.register_menus(menus)
    end
  end
end

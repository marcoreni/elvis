require 'test_helper'
require 'pp'

class UsersTest < ActiveSupport::TestCase
    setup do
        # whole_family/get_users_paying_for_self/get_paying_family_members all default their
        # `season` argument to Season.current_apps_season, which crashes (NoMethodError on nil)
        # or silently no-ops (family_links returns [] for a nil season) without a real Season row.
        Season.create!(
            start: 6.months.ago,
            end: 6.months.from_now,
            opening_date_for_applications: 7.months.ago,
            opening_date_for_new_applications: 5.months.ago,
            closing_date_for_applications: 5.months.from_now,
            is_current: true,
            label: "Test Season"
        )
    end

    test "child should not pay for herself" do
        child = User.create!({ birthday: "10/10/2010", email: "child1@example.com" })
        assert_equal child.whole_family, [child]
        assert_nil child.get_first_paying_family_member
    end

    test "father should pay for himself" do
        father = User.create!({ birthday: "10/10/1990", is_paying: true, email: "father1@example.com" })
        assert_equal father.whole_family, [father]
        assert_equal father.get_first_paying_family_member, father
    end

    test "get_paying_family_members" do
        child = User.create!({ birthday: "10/10/2010", email: "child2@example.com" })
        father = User.create!({ birthday: "10/10/1990", email: "father2@example.com" })
        mother = User.create!({ birthday: "10/10/1991", email: "mother2@example.com" })

        father_link = FamilyMemberUser.create!({ user: father, member: child, is_paying_for: true, season: Season.current_apps_season})
        mother_link = FamilyMemberUser.create!({ user: mother, member: child, is_paying_for: false, season: Season.current_apps_season })

        assert_equal child.get_paying_family_members, [father_link]
        assert_equal father.get_paying_family_members, [father_link]
        assert_equal mother.get_paying_family_members, []
    end

    test "father should pay for child" do
        child = User.create!({ birthday: "10/10/2010", email: "child3@example.com" })
        father = User.create!({ birthday: "10/10/1990", email: "father3@example.com", is_paying: true })
        mother = User.create!({ birthday: "10/10/1991", email: "mother3@example.com" })

        father_link = FamilyMemberUser.create!({ user: child, member: father, is_paying_for: true, season: Season.current_apps_season })
        mother_link = FamilyMemberUser.create!({ user: child, member: mother, is_paying_for: false, season: Season.current_apps_season })

        # We do not take into account the activities, so every person not paying pay for herself
        assert_equal child.get_users_paying_for_self, [father]
        assert_equal father.get_users_paying_for_self, [father]
        assert_equal mother.get_users_paying_for_self, []
    end

    test "couple one payer" do
        man = User.create!({ first_name: "Man", birthday: "10/10/1990", email: "man4@example.com", is_paying: true })
        woman = User.create!({ first_name: "Woman", birthday: "10/10/1991", email: "woman4@example.com" })

        link = FamilyMemberUser.create!({ user: woman, member: man, is_paying_for: true, season: Season.current_apps_season })

        assert_equal man.whole_family, [man, woman]
        assert_equal woman.whole_family, [man, woman]

        assert_equal man.get_users_paying_for_self, [man]
        assert_equal woman.get_users_paying_for_self, [man]
    end

    test "couple no payer" do
        man = User.create!({ first_name: "Man", birthday: "10/10/1990", email: "man5@example.com" })
        woman = User.create!({ first_name: "Woman", birthday: "10/10/1991", email: "woman5@example.com", is_paying: true })

        link = FamilyMemberUser.create!({ user: woman, member: man, is_paying_for: false, season: Season.current_apps_season })

        assert_equal man.get_users_paying_for_self, []
        assert_equal woman.get_users_paying_for_self, [woman]
    end

    test "couple both payer for both" do
        man = User.create!({ first_name: "Man", birthday: "10/10/1990", email: "man6@example.com" })
        woman = User.create!({ first_name: "Woman", birthday: "10/10/1991", email: "woman6@example.com" })

        link = FamilyMemberUser.create!({ user: woman, member: man, is_paying_for: true, season: Season.current_apps_season })
        link_two = FamilyMemberUser.create!({ user: man, member: woman, is_paying_for: true, season: Season.current_apps_season })

        assert (man.get_users_paying_for_self - [man, woman]).empty?
        assert (woman.get_users_paying_for_self - [man, woman]).empty?
    end

    test "multiple payers simple" do
        child = User.create!({ first_name: "child", birthday: "10/10/2010", email: "child7@example.com" })
        father = User.create!({ first_name: "father", birthday: "10/10/1990", email: "father7@example.com" })
        mother = User.create!({ first_name: "mother", birthday: "10/10/1991", email: "mother7@example.com", is_paying: true })

        father_link = FamilyMemberUser.create!({ user: child, member: father, is_paying_for: true, season: Season.current_apps_season })
        mother_link = FamilyMemberUser.create!({ user: child, member: mother, is_paying_for: true, season: Season.current_apps_season })

        assert_equal child.get_users_paying_for_self, [father, mother]
        assert_equal father.get_users_paying_for_self, []
        assert_equal mother.get_users_paying_for_self, [mother]
    end

    test "multiple payers complex" do
        first_child = User.create!({ birthday: "10/10/2010", email: "first_child8@example.com" })
        second_child = User.create!({ birthday: "11/10/2010", email: "second_child8@example.com" })
        third_child = User.create!({ birthday: "12/10/2010", email: "third_child8@example.com" })
        father = User.create!({ birthday: "10/10/1990", email: "father8@example.com" })
        mother = User.create!({ birthday: "10/10/1991", email: "mother8@example.com" })

        father_link = FamilyMemberUser.create!({ user: first_child, member: father, is_paying_for: true, season: Season.current_apps_season })
        mother_link = FamilyMemberUser.create!({ user: first_child, member: mother, is_paying_for: true, season: Season.current_apps_season })
        father_link_two = FamilyMemberUser.create!({ user: second_child, member: father, is_paying_for: true, season: Season.current_apps_season })
        mother_link_two = FamilyMemberUser.create!({ user: second_child, member: mother, is_paying_for: false, season: Season.current_apps_season })
        father_link_three = FamilyMemberUser.create!({ user: third_child, member: father, is_paying_for: false, season: Season.current_apps_season })
        mother_link_three = FamilyMemberUser.create!({ user: third_child, member: mother, is_paying_for: true, season: Season.current_apps_season })
        brother_link = FamilyMemberUser.create!({ user: second_child, member: first_child, is_paying_for: false, season: Season.current_apps_season })

        assert (first_child.get_users_paying_for_self - [father, mother]).empty?
        assert (second_child.get_users_paying_for_self - [father, mother]).empty?
        assert_equal third_child.get_users_paying_for_self, [mother]

        assert (father.get_users_paying_for_self - [father, mother]).empty?
        assert (mother.get_users_paying_for_self - [father, mother]).empty?
    end

    test "Multiple adult payers" do
        florence = User.create!({ first_name: 'florence', birthday: "10/10/1990", email: "florence9@example.com", is_paying: true })
        bernard = User.create!({ first_name: 'bernard', birthday: "10/10/1991", email: "bernard9@example.com" })
        julie = User.create!({ first_name: 'julie', birthday: "10/10/1991", email: "julie9@example.com" })

        clara = User.create!({ first_name: 'clara', birthday: "10/10/2010", email: "clara9@example.com" })

        marital_link = FamilyMemberUser.create!({ user: bernard, member: florence, is_paying_for: false, season: Season.current_apps_season })
        father_link = FamilyMemberUser.create!({ user: clara, member: bernard, is_paying_for: true, season: Season.current_apps_season })
        step_mother_link = FamilyMemberUser.create!({ user: clara, member: florence, is_paying_for: false, season: Season.current_apps_season })
        mother_link = FamilyMemberUser.create!({ user: clara, member: julie, is_paying_for: false, season: Season.current_apps_season })

        assert_equal florence.get_users_paying_for_self, [florence]
        assert_equal bernard.get_users_paying_for_self, []
        assert_equal clara.get_users_paying_for_self, [bernard]
        assert_equal julie.get_users_paying_for_self, []
    end
end

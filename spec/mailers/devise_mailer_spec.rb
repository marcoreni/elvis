require "rails_helper"

# Regression coverage for feature/i18n-04-devise-and-public-pages: these two mailer actions had
# their French copy replaced with I18n keys, and this branch also fixed a nested-<strong> bug in
# confirmation_instructions found during code review. unlock_instructions/email_changed/
# password_change are intentionally not covered here — see docs/KnownIssues.md, they're dead code
# (no :lockable module, send_email_changed_notification/send_password_change_notification are both
# disabled in config/initializers/devise.rb, and nothing in the app ever calls them).
RSpec.describe DeviseMailer, type: :mailer do
  let!(:school) { School.create!(name: "École de Test") }
  let(:user) { FactoryBot.create(:user, email: "devise-mailer-spec@example.com") }
  let(:token) { "raw-token-value" }

  describe "#confirmation_instructions" do
    it "does not double-wrap the app name in nested <strong> tags" do
      mail = described_class.confirmation_instructions(user, token)

      expect(mail.body.encoded).not_to match(%r{<strong>\s*<strong>})
    end

    it "links to the real confirmation URL, not markup" do
      mail = described_class.confirmation_instructions(user, token)

      expect(mail.body.encoded).to include(confirm_url(user, confirmation_token: token))
    end

    it "renders in French by default" do
      mail = described_class.confirmation_instructions(user, token)

      expect(mail.body.encoded).to include("Confirmer mon compte")
    end

    it "renders in English" do
      I18n.with_locale(:en) do
        mail = described_class.confirmation_instructions(user, token)
        expect(mail.body.encoded).to include("Confirm my account")
      end
    end

    it "never leaks a raw missing-translation marker" do
      mail = described_class.confirmation_instructions(user, token)

      expect(mail.body.encoded).not_to include("translation missing")
    end
  end

  describe "#reset_password_instructions" do
    it "links to a real anchor href, not markup, for the reset button" do
      mail = described_class.reset_password_instructions(user, token)

      expect(mail.body.encoded).not_to match(%r{href="[^"]*<a })
    end

    it "renders in French by default" do
      mail = described_class.reset_password_instructions(user, token)

      expect(mail.body.encoded).to include("Vous avez demandé à réinitialiser votre mot de passe")
    end

    it "renders in English" do
      I18n.with_locale(:en) do
        mail = described_class.reset_password_instructions(user, token)
        expect(mail.body.encoded).to include("You requested to reset your password")
      end
    end

    it "never leaks a raw missing-translation marker" do
      mail = described_class.reset_password_instructions(user, token)

      expect(mail.body.encoded).not_to include("translation missing")
    end
  end
end

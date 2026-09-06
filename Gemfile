require_relative "lib/elvis/plugin_gem_utils"

source "https://rubygems.org"

git_source(:github) do |repo_name|
  repo_name = "#{repo_name}/#{repo_name}" unless repo_name.include?("/")
  "https://github.com/#{repo_name}.git"
end

gem "base64"
gem "logger"

# Bundle edge Rails instead: gem 'rails', github: 'rails/rails'
gem "rails", "6.1.7.10"
gem "rails_event_store", "<= 2.18.0"
# Use postgresql as the database for Active Record
gem "pg"
# Use Puma as the app server
gem "bootsnap"
gem "mutex_m"
gem "puma"

gem "react-rails"
gem "shakapacker", "10.3.2"

gem "i18n"
gem "irb"

gem "request_store"

gem "rails-i18n"

gem "aws-sdk-s3", require: false
gem "azure-storage-blob"
gem "cancancan"
gem "devise"
gem "devise-i18n"
gem "devise-token_authenticatable"

gem "annotate"

gem "responders"
gem "rubyzip"
gem "wicked_pdf"

gem "kaminari", "~> 1.2.2"

gem "deep_cloneable"

gem "active_model_serializers"
gem "fast_jsonapi"
gem "oj"

gem "sentry-rails"
gem "sentry-ruby"

gem "acts_as_paranoid"
gem "chewy", "< 7.4"
gem "sidekiq"

# patch for "wrong number of arguments" error
gem "connection_pool", "< 3"

gem "rqrcode"

gem "countries"
gem "money"
gem "phony_rails"
gem "recaptcha", require: "recaptcha/rails"
gem "tzinfo-data"

# Profiling
gem "memory_profiler" # For memory profiling
gem "rack-mini-profiler", require: false
gem "rails_performance"
gem "redis-namespace"
gem "stackprof" # For call-stack profiling flamegraphs


group :development, :test do
  # Call "byebug" anywhere in the code to stop execution and get a debugger console
  gem "byebug", platforms: %i[mri windows]
  gem "capybara"
  gem "database_cleaner"
  gem "factory_bot_rails"
  gem "i18n-tasks"
  gem "minitest-rails"
  gem "rails-controller-testing"
  gem "rspec"
  gem "rspec-rails"
  gem "wkhtmltopdf-binary"
end

group :development do
  # Access an IRB console on exception pages or by using <%= console %> anywhere in the code.
  gem "listen", ">= 3.0.5"
  gem "web-console", ">= 3.3.0"
  # Spring speeds up development by keeping your application running in the background. Read more: https://github.com/rails/spring
  # gem 'spring'
  # gem 'spring-watcher-listen', '~> 2.0.0'
  # gem 'memory_profiler'

  gem "pry-rails"

  gem "bullet", "< 8"

  gem "foreman"
  gem "letter_opener"
  gem "seed_dump"

  # Ruby lint (see CLAUDE.md "Common commands" and .rubocop.yml)
  gem "rubocop", require: false
end

gem "rack-cors"

gem "composite_primary_keys"

gem "acsv-p"
gem "activejob-status"
gem "liquid-rails", git: "https://github.com/Countable-us/liquid-rails", branch: "master"
gem "mimemagic"
gem "panoramic", github: "ELVIS-SOFTWARE/panoramic"
gem "phonelib"
gem "rails_semantic_logger"
gem "rchardet"
gem "translate_enum"
gem "whenever"

PluginGemUtils.get_plugins_to_install(include_libraries: true).each do |plugin|

  if plugin.is_from_tag?
    gem plugin.name, git: plugin.full_url, tag: plugin.tag
  else
    gem plugin.name, git: plugin.full_url, branch: plugin.branch
  end
end

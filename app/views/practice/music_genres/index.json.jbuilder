# frozen_string_literal: true

json.array! @music_genres, partial: "music_genres/music_genre", as: :music_genre

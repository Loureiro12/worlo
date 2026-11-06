-- Worlo QA round 1: "Quero ir" destinations get a cover photo.
--
-- The photo is picked from the phone's gallery and uploaded to the public
-- post-photos bucket (like profile photos: <user>/<uuid>.jpg); the row keeps
-- its URL. Without one the card shows the wish's solid color.

alter table public.wish_destinations
  add column cover_url text
    check (cover_url is null or (cover_url ~ '^https?://\S+$' and char_length(cover_url) <= 500));

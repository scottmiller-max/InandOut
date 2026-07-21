# Squarespace content — DEPRECATED, see squarespace-*.html instead

This file described an early, never-shipped design concept for the
inandoutmovin.com Squarespace site: a Tally.so embedded form, three-tier
pricing ($899 flat / $149-mo premium / custom enterprise), and placeholder
app-store links. None of that matches the live site and it should not be
used as a reference.

The actual live site is four Squarespace pages, each built from a single
custom Code Block (HTML/CSS, with JS for the two form pages). The real
source for each, pulled directly from the Squarespace page editor, lives in
this repo as:

- `squarespace-home.html` — Home (`/`): the quote-request lead form (posts to
  the `contact-submit` Supabase edge function), an app-download teaser
  ("Coming soon to iOS & Android"), and a "Talk to Riley" section.
- `squarespace-about.html` — About (`/about`): mission, "what you can expect,"
  company story, a Riley/AI disclosure blurb, and a trust/compliance list.
- `squarespace-services.html` — Services (`/services`): the four service
  categories (Residential, Commercial, Long Distance, Loading & Unloading),
  a "why choose us" grid, pricing card ($165/hr, 2 movers included), a
  testimonial, and a closing CTA.
- `squarespace-contact.html` — Contact (`/contact`): a second contact form
  (name/email/phone/topic/message) that also posts to `contact-submit`.
  **Known bug:** this form's fetch URL is the relative path
  `/functions/v1/contact-submit`, which resolves against
  `www.inandoutmovin.com` instead of the Supabase project — unlike the Home
  page form, which correctly uses the full
  `https://gdiudffqjhidreqzklbl.supabase.co/functions/v1/contact-submit` URL.
  This almost certainly means Contact-page submissions are failing silently.
  Fix: update the fetch URL in the Contact page's code block to the full
  Supabase URL, matching the Home page.

Squarespace is the source of truth for all four pages. When the live content
changes, re-open Pages > [page] > (click into the block) > pencil/edit icon >
expand > select all > copy, and paste the result into the matching file
above so the repo stays accurate.

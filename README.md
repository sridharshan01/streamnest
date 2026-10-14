# StreamNest
## Run locally
    npm install && cp .env.example .env.local && npm run dev
    npm run lint && npm test && npm run build
## Supabase
Run `supabase/migrations/001_init.sql` then `002_profile_trigger.sql` in the SQL editor. Put the project URL, anon key and service-role key in `.env.local`.
Authentication > URL Configuration: set Site URL to your deployed URL and add `<url>/login` and `<url>/reset` to Redirect URLs.
## Deploy on Render
New > Web Service > connect the GitHub repo. Build `npm install && npm run build`, start `npm start`, add the 3 env vars before the first build.
## Status
- Implemented: sign-up, email or username sign-in, email verification, password reset, link analyzer, player with resume, history, recently watched, saved videos, trash with restore, RLS.
- Detection only: TeraBox, Diskwala, BlinkNote, Vividcast.
- Not built: collections/folders, Playwright and RLS tests, theme toggle button (follows system setting).

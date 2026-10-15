# StreamNest

StreamNest analyzes video URLs, plays compatible direct video files, and maintains an authenticated watch history. Third-party share-page integrations must be implemented and verified individually; a detected provider is not automatically a playable source.

## Requirements
- Node.js 20 or newer
- A Supabase project
- Public Supabase project URL and anon key
- Supabase service-role key for server-side username availability/login routes (keep this secret)

## Local setup
1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Never expose the service-role key in client-side code or commit `.env.local`.
3. In Supabase SQL Editor, run `supabase/migrations/001_init.sql`, then `supabase/migrations/002_profile_trigger.sql`. Confirm both scripts complete successfully.
4. In Supabase Authentication settings, configure the Site URL and add your local/deployed callback URLs, including `/login` and `/reset`, to the allowed redirect URLs.
5. If email verification is enabled, configure Supabase email delivery and verify the email before signing in.
6. Run `npm install`, then `npm run dev`. Open the local URL printed by Next.js.
7. Before deploying, run `npm run lint`, `npm test`, and `npm run build`.

## Important troubleshooting
- If username availability cannot be checked, the API now reports a configuration/database problem instead of falsely claiming that the username is taken. Confirm the service-role key is set on the server and both SQL migrations have run.
- If account creation reports a profile/username trigger error, inspect the Supabase logs and confirm migration `002_profile_trigger.sql` installed the `on_auth_user_created` trigger.
- The direct-link analyzer probes `HEAD` and falls back to a small Range GET, so it supports more file hosts than a HEAD-only implementation. Some servers still deny automated access or require authentication.
- Browser playback requires a directly accessible video source. HLS playback additionally depends on the host's CORS configuration unless the browser supports native HLS.
- TeraBox, Diskwala, BlinkNote, and Vividcast currently have detection/fallback handling only unless a provider adapter is separately implemented and verified. For links to share pages, StreamNest may need to open the original service; this cannot be fixed by changing the video player alone. Use official APIs or authorized integrations.
- Downloads use a server-side, SSRF-checked streaming route for directly accessible video files. Private links, expiring links, DRM-protected streams, and providers that require an authenticated session may not work.

## Provider support status
- Direct MP4/WebM/MOV and other supported direct video file URLs: best-effort analysis, playback, and download. Actual playback depends on host availability, headers, codecs, and access permissions.
- Direct HLS `.m3u8`: playback when the browser/player and source CORS policy allow it; not offered as a single-file download.
- TeraBox, Diskwala, BlinkNote, Vividcast: provider detection and original-link fallback; no verified direct extraction integration is included in this ZIP.
- Other share pages: generic direct-media probe and honest unsupported-page fallback.

## Deployment
Use a Node.js-compatible deployment target. Set all three environment variables in the deployment platform before building. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Apply the SQL migrations to the same Supabase project used by the deployment.

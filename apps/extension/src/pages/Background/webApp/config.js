// Shared config for the device-pairing + upload integration with apps/web
// (docs/specs/04-integration.md). apps/web serves its pages and its API from
// one origin, so unlike the legacy auth split inherited from the original
// extension (SCREENBOLT_APP_BASE
// for pages vs SCREENBOLT_API_BASE_URL for the API), this flow only needs one
// origin. SCREENBOLT_API_BASE_URL is reused here (it's already the
// established env var name/convention for "the web app's origin" elsewhere
// in this codebase) for both the /connect tab URL and the API calls.
//
// Defaults to http://localhost:3000 per docs/specs/04-integration.md, so a
// dev build works against a local `apps/web` without any extra env setup.
export const WEB_APP_URL = (
  process.env.SCREENBOLT_API_BASE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

// Dedicated flag for this device-pairing / upload-to-apps/web feature.
// Deliberately NOT the pre-existing SCREENBOLT_ENABLE_CLOUD_FEATURES flag:
// that flag gates a much larger, unrelated system inherited from the
// original extension
// (its own login/subscription flow, Bunny CDN cloud recording, project/scene
// APIs under SCREENBOLT_APP_BASE) that expects a completely different backend
// than apps/web implements, and turning it on would surface a lot of dead
// UI/broken requests that have nothing to do with this integration. This
// flag only gates the new pairing + single-shot upload path built for
// sub-project 4, and defaults ON (opt-out via "false") now that apps/web is
// a real destination.
export const WEB_UPLOAD_ENABLED =
  process.env.SCREENBOLT_ENABLE_WEB_UPLOAD !== "false";

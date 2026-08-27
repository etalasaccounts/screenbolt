import type { NextConfig } from "next";
import path from "path";
import fs from "fs";
import { createRequire } from "module";

// next.config.ts is loaded as ESM (this repo has no top-level "type":
// "commonjs" override), so the ambient CommonJS `require` isn't in scope
// here -- need an explicit one to pre-resolve package paths below.
const require = createRequire(import.meta.url);

// packages/editor (docs/architecture.md's "Shared code" section;
// docs/specs/07-shared-editor.md) is plain source living outside apps/web,
// with no package.json/node_modules of its own -- resolved via the
// "@screenbolt/editor" tsconfig path alias below rather than an npm
// workspace. Turbopack (Next's default bundler) only resolves files inside
// its configured project root, so that root needs to widen to cover both
// apps/web and packages/editor.
const REPO_ROOT = path.resolve(__dirname, "../..");

// Turbopack resolves bare-specifier imports (react-svg, mediabunny, etc.)
// by walking up node_modules directories from the *importing file's* real
// location. Files pulled in from packages/editor sit outside apps/web, so
// that walk never reaches apps/web/node_modules (packages/ is a sibling of
// apps/web, not an ancestor) -- same issue as apps/extension's webpack
// config, just Turbopack's version of the fix. Pin each package the shared
// editor imports to its resolved path in apps/web/node_modules explicitly.
const SHARED_EDITOR_PACKAGES = [
  "react-svg",
  "gif.js",
  "localforage",
  "mediabunny",
  "fix-webm-duration",
  "webm-duration-fix",
  "plyr-react",
  "plyr",
  "react-advanced-cropper",
  "wavesurfer.js",
  "@radix-ui/react-alert-dialog",
  "@radix-ui/react-select",
  "@radix-ui/react-slider",
  "@radix-ui/react-switch",
  "@radix-ui/react-toast",
];

// turbopack.resolveAlias targets want a path relative to next.config.ts
// (see the `fs: { browser: './empty.ts' }` example in Next's own upgrade
// guide) -- a bare absolute filesystem path resolves the *specifier* but
// Turbopack then fails to load it, so route every target through this.
const toAlias = (absPath: string) => {
  const rel = path.relative(__dirname, absPath).replace(/\\/g, "/");
  return rel.startsWith(".") ? rel : `./${rel}`;
};

const resolveAlias: Record<string, string> = {};
for (const pkg of SHARED_EDITOR_PACKAGES) {
  try {
    resolveAlias[pkg] = toAlias(require.resolve(pkg));
  } catch {
    // Left unresolved on purpose -- a missing package here means the
    // shared editor's build will fail loudly with a normal "module not
    // found" pointing at the real import, which is easier to debug than
    // silently swallowing it here.
  }
}
// plyr-react's package.json "main" (what require.resolve follows above)
// points at its Rollup CJS build, which does its own manual ESM-interop
// unwrap of the "plyr" package. Turbopack *also* interops "plyr" on its
// own when resolving that inner require() -- the two layers stack and
// double-wrap the default export, so `new Plyr(...)` inside plyr-react
// blows up with "PlyrJS__default.default is not a constructor". The
// "module" build (plyr-react/esm/index.js) imports "plyr" directly with no
// manual interop step, so it doesn't hit this at all -- use that instead.
try {
  resolveAlias["plyr-react"] = toAlias(
    path.join(path.dirname(require.resolve("plyr-react")), "esm", "index.js"),
  );
} catch {}
// "plyr" itself has the same problem one layer down: its package.json
// "main" (dist/plyr.js) is an old UMD bundle with no static ESM exports at
// all, which Turbopack's strict import analysis rejects outright ("Export
// default doesn't exist"). dist/plyr.mjs is a real ESM build with a proper
// `export { Plyr as default }` -- point at that instead.
try {
  // "plyr/package.json" isn't resolvable directly -- its own "exports" map
  // doesn't expose that subpath. require.resolve("plyr") (the main entry,
  // dist/plyr.js) still works, so derive the dist folder from that instead.
  const plyrDistDir = path.dirname(require.resolve("plyr"));
  resolveAlias["plyr"] = toAlias(path.join(plyrDistDir, "plyr.mjs"));
} catch {}
// CSS files imported by name from inside those packages (not just their
// main JS entry) need their own exact-specifier aliases.
try {
  resolveAlias["plyr-react/plyr.css"] = toAlias(require.resolve("plyr-react/plyr.css"));
} catch {}
try {
  resolveAlias["react-advanced-cropper/dist/style.css"] = toAlias(
    require.resolve("react-advanced-cropper/dist/style.css"),
  );
} catch {}
// fixWebmDurationOffThread.js's "?raw" import of this exact file (see the
// turbopack.rules entry below) -- resolveAlias matches the specifier before
// the query string, so this needs its own entry distinct from the bare
// "fix-webm-duration" -> main-entry alias above.
try {
  resolveAlias["fix-webm-duration/fix-webm-duration.js"] = toAlias(
    require.resolve("fix-webm-duration/fix-webm-duration.js"),
  );
} catch {}
// mediabunny ships environment-branching "exports" (its package.json has
// separate "browser"/"node"/"default" conditions under "."), because its
// Node build eagerly `require("node:fs/promises")` for a disk-backed
// fallback that has no browser equivalent -- its browser build stubs that
// whole module out instead (see its "browser" field). `require.resolve`
// above is plain Node module resolution: Node never applies a "browser"
// condition, so it silently picked mediabunny's *Node* bundle
// (dist/bundles/mediabunny.node.cjs) for every host, including this one
// running entirely client-side. Turbopack's browser runtime has no real
// `require()` for a Node builtin, so any mediabunny op that actually ran
// (e.g. the webm->mp4 conversion the shared editor kicks off right after
// loading a recording) crashed with "Unexpected use of runtime require",
// leaving the editor stuck with no ready video and export marked
// unavailable. Walk up from the (wrong) resolved file to mediabunny's own
// package.json and read its declared browser entry point directly instead
// of trusting require.resolve's Node-only pick.
try {
  const nodeEntry = require.resolve("mediabunny");
  let dir = path.dirname(nodeEntry);
  let pkgRoot: string | null = null;
  while (dir !== path.dirname(dir)) {
    const candidate = path.join(dir, "package.json");
    if (fs.existsSync(candidate)) {
      const json = JSON.parse(fs.readFileSync(candidate, "utf8"));
      if (json.name === "mediabunny") {
        pkgRoot = dir;
        break;
      }
    }
    dir = path.dirname(dir);
  }
  if (!pkgRoot) throw new Error("Could not locate mediabunny's package.json");
  const pkgJson = JSON.parse(fs.readFileSync(path.join(pkgRoot, "package.json"), "utf8"));
  const browserCondition = pkgJson.exports?.["."]?.browser;
  const browserEntry =
    typeof browserCondition === "string" ? browserCondition : browserCondition?.import;
  if (!browserEntry) throw new Error("mediabunny package.json has no browser export condition");
  resolveAlias["mediabunny"] = toAlias(path.join(pkgRoot, browserEntry));
} catch {
  // Left unresolved on purpose, same rationale as the main loop above --
  // fail loudly with a normal "module not found" rather than silently
  // falling back to the broken Node bundle.
  delete resolveAlias["mediabunny"];
}

const nextConfig: NextConfig = {
  turbopack: {
    root: REPO_ROOT,
    resolveAlias,
    rules: {
      // See webpack.config.js's matching resourceQuery rule and
      // fixWebmDurationOffThread.js's comment -- "?raw" replaces webpack's
      // inline "!!raw-loader!..." syntax so this one import works
      // identically under both bundlers.
      "*": {
        condition: { query: /raw/ },
        type: "raw",
      },
    },
  },
  // Add headers to control framing and CSP.
  // Previously, the app set no frame headers at all, creating clickjacking
  // exposure on all routes. This config opens up /embed for third-party
  // embedding while closing that exposure everywhere else.
  // Note: app/(home) already iframes /record/editor-frame internally;
  // frame-ancestors 'self' permits that, so it stays working.
  //
  // IMPORTANT: In Next.js, every matching header source is applied, and when
  // the same header key appears multiple times, the later one overwrites.
  // The catch-all "/:path*" also matches "/embed/abc", so it would override
  // the embed rule unless we explicitly exclude it. Use a negative lookahead
  // to prevent "/embed/" from matching the catch-all.
  async headers() {
    return [
      {
        source: "/embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *",
          },
        ],
      },
      {
        source: "/((?!embed/).*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

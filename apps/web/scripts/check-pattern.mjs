#!/usr/bin/env node
/**
 * API route pattern compliance checker.
 *
 * Enforces the shape rules that ESLint cannot express. Layer *import* boundaries
 * are enforced separately by no-restricted-imports in eslint.config.mjs; this
 * script checks the *structure* of each handler.
 *
 * Usage:
 *   node scripts/check-pattern.mjs                 # check every API route
 *   node scripts/check-pattern.mjs <paths...>      # check only these (pre-commit)
 *
 * Exits 1 if any route violates the pattern. See PATTERN.md for the contract.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WEB_DIR = path.resolve(import.meta.dirname, "..");
const API_DIR = path.join(WEB_DIR, "app", "api");
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

/** Known rule names for validation of EXEMPT entries. */
const KNOWN_RULES = [
  "service",
  "auth",
  "contract-frozen",
  "handler",
  "try-catch",
  "error-handling",
  "zod",
  "response-shape",
  "envelope",
  "no-manual-status",
];

let frozenContracts = {};
try {
  const contractPath = path.join(SCRIPT_DIR, "frozen-contracts.json");
  frozenContracts = JSON.parse(readFileSync(contractPath, "utf8"));
} catch (err) {
  console.error("Warning: Could not load frozen-contracts.json:", err.message);
}

/**
 * Routes excused from rules, each with a reason. Keep this narrow and explicit —
 * it is the only escape hatch, and it is deliberately not a wildcard.
 *
 * Rules may be specified in two forms:
 *   - Plain rule name ("auth") — exempts the rule for all handlers in the file
 *   - Per-handler rule ("auth:GET") — exempts the rule only for the named handler
 *
 * Both forms work together: a plain rule exempts all handlers, while per-handler
 * rules carve out specific exemptions without blanket-exempting the file.
 */
const EXEMPT = {
  "app/api/auth/[...nextauth]/route.ts": {
    rules: "*",
    reason:
      "Three-line re-export of NextAuth `handlers`; there is no handler body to inspect.",
  },
  "app/api/auth/signup/route.ts": {
    rules: ["auth"],
    reason:
      "Public endpoint: signup is what creates the user, so it cannot require an authenticated caller.",
  },
  "app/api/video-views/route.ts": {
    rules: ["auth"],
    reason:
      "Public endpoint: records views on shared videos, which anonymous viewers must be able to hit. Attribution falls back to a session id when there is no user.",
  },
  "app/api/videos/[id]/route.ts": {
    rules: ["auth:GET"],
    reason:
      "GET is public: fetches video detail for shared video links, which anonymous viewers must be able to access. PUT and DELETE require authentication and are not exempted.",
  },
  "app/api/videos/[id]/comments/route.ts": {
    rules: ["auth:GET"],
    reason:
      "GET is public: fetches comments on shared videos, which anonymous viewers must be able to read. POST requires authentication and is not exempted.",
  },
  "app/api/extension/pair/init/route.ts": {
    rules: ["auth", "envelope", "no-manual-status"],
    reason:
      "Public endpoint: the extension generates a pairing code before any user has signed in, so there is no caller to authenticate yet. Frozen external contract with Chrome extension; response shape is audited separately by contract-frozen rule.",
  },
  "app/api/extension/pair/status/route.ts": {
    rules: ["auth", "envelope", "no-manual-status"],
    reason:
      "Public endpoint: the unpaired extension polls pairing status by code alone. The code is the bearer credential. Frozen external contract with Chrome extension; response shape is audited separately by contract-frozen rule.",
  },
  "app/api/upload/route.ts": {
    rules: ["envelope", "no-manual-status"],
    reason:
      "Frozen external contract with web and extension clients; response shape is audited separately by contract-frozen rule.",
  },
  "app\\api\\billing\\webhook\\route.ts": {
    rules: ["auth"],
    reason:
      "Public endpoint: Midtrans payment notification webhook. Authentication is performed via SHA512 signature verification on the payload rather than a user session.",
  },
};

/**
 * OAuth redirect routes return NextResponse.redirect() rather than a JSON
 * envelope, so response-shape does not apply. Detected by content, not by a
 * hardcoded path list, so new OAuth routes are covered automatically.
 */
function isRedirectRoute(src) {
  return /NextResponse\.redirect\s*\(/.test(src);
}

const HANDLERS = ["GET", "POST", "PATCH", "PUT", "DELETE"];
const BODY_HANDLERS = new Set(["POST", "PATCH", "PUT"]);

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry === "route.ts") out.push(full);
  }
  return out;
}

/** Extract a handler's body by brace matching from its opening `{`. */
function handlerBody(src, startIdx) {
  const open = src.indexOf("{", startIdx);
  if (open === -1) return "";
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  return src.slice(open);
}

function lineOf(src, idx) {
  return src.slice(0, idx).split("\n").length;
}

function findHandlers(src) {
  const found = [];
  for (const name of HANDLERS) {
    const re = new RegExp(`export\\s+(?:async\\s+)?(?:function\\s+${name}\\b|const\\s+${name}\\s*=)`);
    const m = re.exec(src);
    if (m) found.push({ name, index: m.index, body: handlerBody(src, m.index) });
  }
  return found;
}

function checkRoute(absPath) {
  const rel = path.relative(WEB_DIR, absPath);
  const src = readFileSync(absPath, "utf8");
  const violations = [];

  const exempt = EXEMPT[rel];
  if (exempt && exempt.rules === "*") return { rel, violations, exempt };
  const skip = new Set(Array.isArray(exempt?.rules) ? exempt.rules : []);

  // Validate EXEMPT entries: rule names and handler names must be known
  for (const entry of skip) {
    const [ruleName, handlerName] = entry.split(":");
    if (!KNOWN_RULES.includes(ruleName)) {
      console.error(
        `Warning: ${rel}: unknown rule in EXEMPT entry "${entry}" (rule: "${ruleName}")`
      );
    }
    if (handlerName && !HANDLERS.includes(handlerName)) {
      console.error(
        `Warning: ${rel}: unknown handler in EXEMPT entry "${entry}" (handler: "${handlerName}")`
      );
    }
  }

  const add = (idx, rule, message, handlerName) => {
    // Check both plain rule (applies to all handlers) and per-handler rule
    if (skip.has(rule) || (handlerName && skip.has(`${rule}:${handlerName}`))) return;
    violations.push({ line: lineOf(src, idx), rule, message });
  };

  // --- file-level: service layer ---
  // Check service IMPORT count only at file level (exactly one import is required).
  // The "service is actually called" check is per-handler (see below in handler loop).
  const serviceImports = [
    ...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']@\/lib\/services\/[^"']+["']/g),
  ];
  const imported = serviceImports.flatMap((m) =>
    m[1]
      .split(",")
      .map((s) => s.trim().split(/\s+as\s+/).pop().trim())
      .filter(Boolean)
  );

  if (serviceImports.length === 0) {
    add(0, "service", "No service imported. API routes must delegate to a service in @/lib/services.");
  } else if (serviceImports.length > 1) {
    add(
      serviceImports[1].index,
      "service",
      `Imports ${serviceImports.length} services. A route must depend on exactly one — keep dependencies flat.`
    );
  }

  // --- file-level: auth ---
  // Auth checks are now per-handler (see handler loop below).
  // A genuinely public route belongs in EXEMPT with a reason.

  // --- file-level: contract-frozen ---
  // Only the three frozen routes are checked. If one of them imports the envelope
  // functions, it's being wrapped, which breaks the extension. The shape check
  // is regex-based and fuzzy (extracts keys from JSON literals), but it catches
  // the coarse break of wrapping a response in { success, data }. The import check
  // is exact.
  const frozenRoutes = [
    "app/api/extension/pair/init/route.ts",
    "app/api/extension/pair/status/route.ts",
    "app/api/upload/route.ts",
  ];
  if (frozenRoutes.includes(rel)) {
    // Check 1: No import of api-response functions
    if (/import\s*\{[^}]*(?:ok|fail|handleApiError)[^}]*\}\s*from\s*["']@\/lib\/shared\/api-response["']/.test(src)) {
      add(0, "contract-frozen", `${rel} imports envelope functions from @/lib/shared/api-response. Frozen routes must not use ok()/fail()/handleApiError() — they have a fixed external contract.`);
    }

    // Check 2: Verify response shape matches fixture
    const contract = frozenContracts[rel];
    if (contract) {
      // Extract top-level keys from NextResponse.json() calls
      // Pattern: NextResponse.json({ key1: val1, key2: val2, ... })
      // Extract only property names (identifiers followed by colons, not part of expressions like x.y)
      const jsonCalls = [...src.matchAll(/NextResponse\.json\s*\(\s*\{([^}]+)\}/g)];
      const foundKeys = new Set();
      for (const m of jsonCalls) {
        const objContent = m[1];
        // Extract property names: identifier followed by colon, not preceded by a dot or letter
        // (to avoid matching things like `error.message :` in ternaries)
        const keyMatches = [...objContent.matchAll(/(?:^|[^.\w])([a-zA-Z_]\w*)\s*:/g)];
        for (const km of keyMatches) {
          foundKeys.add(km[1]);
        }
      }

      // Extract status codes from NextResponse.json calls
      // Look for the { status: NNN } pattern in the options parameter
      // This regex finds all status codes in the file (not just in NextResponse.json)
      // but that's acceptable for the frozen routes which should rarely change
      const statusCodeMatches = [...src.matchAll(/\{\s*status\s*:\s*(\d{3})\s*\}/g)];
      const foundStatuses = new Set(statusCodeMatches.map(m => parseInt(m[1], 10)));

      // If the route has a NextResponse.json with only one parameter (implicit 200), add it
      if (/NextResponse\.json\s*\(\s*\{[^{}]*\}\s*\)(?!\s*,\s*\{)/.test(src)) {
        foundStatuses.add(200);
      }

      // Compare: all contract keys and statuses must be found
      const contractKeys = new Set(contract.topLevelKeys);
      const contractStatuses = new Set(contract.statusCodes);

      const missingKeys = [...contractKeys].filter(k => !foundKeys.has(k));
      const extraKeys = [...foundKeys].filter(k => !contractKeys.has(k));
      const missingStatuses = [...contractStatuses].filter(s => !foundStatuses.has(s));
      const extraStatuses = [...foundStatuses].filter(s => !contractStatuses.has(s));

      if (missingKeys.length > 0 || extraKeys.length > 0 || missingStatuses.length > 0 || extraStatuses.length > 0) {
        let msg = `${rel} response shape has drifted from the frozen contract:`;
        if (missingKeys.length > 0) msg += ` missing keys [${missingKeys.join(", ")}]`;
        if (extraKeys.length > 0) msg += ` extra keys [${extraKeys.join(", ")}]`;
        if (missingStatuses.length > 0) msg += ` missing statuses [${missingStatuses.join(", ")}]`;
        if (extraStatuses.length > 0) msg += ` extra statuses [${extraStatuses.join(", ")}]`;
        add(0, "contract-frozen", msg);
      }
    }
  }

  const handlers = findHandlers(src);
  if (handlers.length === 0) {
    add(0, "handler", "No exported HTTP handler found.");
  }

  const redirectRoute = isRedirectRoute(src);

  for (const h of handlers) {
    const { name, body, index } = h;

    // --- per-handler: auth ---
    // The guard must actually return. An empty `if (!user) {}` satisfies a naive
    // presence check while authenticating nothing -- it reads as compliant and
    // enforces nothing. A genuinely public route belongs in EXEMPT with a reason.
    if (!/getCurrentUser\s*\(/.test(body)) {
      add(index, "auth", `${name} handler does not call getCurrentUser() — every route must authenticate.`, name);
    } else if (!/if\s*\(\s*!\s*\w+\s*\)\s*(?:return\b|\{[^}]*\breturn\b)/.test(body)) {
      add(
        index,
        "auth",
        `${name} handler calls getCurrentUser() but the \`if (!user)\` guard does not return. An empty guard authenticates nothing — if the route is genuinely public, exempt it in EXEMPT with a reason instead.`,
        name
      );
    }

    // --- per-handler: service is actually called ---
    // The service must actually be USED in this handler, not merely imported at the file level.
    // Checking the import alone lets a route satisfy this rule with a dead import, which is
    // guardrail theater -- it reads as compliant while delegating nothing.
    if (serviceImports.length > 0) {
      const used = imported.filter((n) => new RegExp(`\\b${n}\\s*\\.`).test(body));
      if (used.length === 0) {
        add(
          index,
          "service",
          `${name} handler does not call the imported service. Remove the dead import — a handler that needs no service should return early or use a different pattern.`,
          name
        );
      }
    }

    if (!/\btry\s*\{/.test(body) || !/\bcatch\s*\(/.test(body)) {
      add(index, "try-catch", `${name} handler is not wrapped in try/catch.`, name);
    } else if (!/console\.error\s*\(|handleApiError\s*\(/.test(body)) {
      add(index, "error-handling", `${name} catch block does not call console.error() or handleApiError().`, name);
    }

    // Only require zod where a body is actually read. Demanding .safeParse from
    // every POST pushes bodyless endpoints (disconnect, revoke) into calling
    // request.json() just to have something to validate -- which throws on an
    // empty body and turns a working 200 into a 500.
    // JSON bodies only. Multipart/form-data routes validate differently (file
    // size, mime type, storage config) and forcing zod on them just produces
    // vacuous `z.unknown()` schemas that validate nothing.
    const readsBody = /\b(?:request|req)\s*\.\s*json\s*\(/.test(body);
    if (BODY_HANDLERS.has(name) && readsBody && !/\.safeParse\s*\(/.test(body)) {
      add(index, "zod", `${name} reads a request body but does not validate it with a zod schema (.safeParse).`, name);
    }

    // Only the failure envelope is enforced. The `{ success: true, data }` success
    // envelope is NOT checked: it is used by 1 of 30 routes and was never adopted.
    // Typed-error handling (ValidationError/NotFoundError/ConflictError) is likewise
    // not enforced -- only 4 of 30 routes import them. Both are tracked follow-ups
    // in PATTERN.md rather than hard rules, so this check stays meaningful.
    if (!redirectRoute && !/\{\s*error\s*[:,}]|fail\s*\(|handleApiError\s*\(/.test(body)) {
      add(index, "response-shape", `${name} does not return { error: ... }, fail(), or handleApiError() on failure.`, name);
    }

    // envelope: Every non-frozen route must return through ok() or handleApiError()
    // for success responses. This prevents hand-built { foo: 1 } shapes.
    if (!redirectRoute && !/\bok\s*\(/.test(body) && !/handleApiError\s*\(/.test(body)) {
      add(index, "envelope", `${name} must return through ok() or handleApiError() for the envelope.`, name);
    }

    // no-manual-status: No hand-built NextResponse.json({ error }, { status })
    // patterns outside the three frozen routes.
    if (/NextResponse\.json\s*\(\s*\{\s*error\s*[:,]/.test(body)) {
      const hasManualStatus = /NextResponse\.json\s*\(\s*\{[^}]*error[^}]*\}\s*,\s*\{\s*status\s*:/.test(body);
      if (hasManualStatus) {
        add(index, "no-manual-status", `${name} hand-builds NextResponse.json({ error }, { status }). Use fail() or handleApiError() instead.`, name);
      }
    }
  }

  return { rel, violations, exempt: null, redirectRoute };
}

// --- entry point ---
const argv = process.argv.slice(2);
let targets;
if (argv.length > 0) {
  targets = argv
    .map((p) => path.resolve(WEB_DIR, p))
    .filter((p) => p.startsWith(API_DIR) && p.endsWith("route.ts"));
  if (targets.length === 0) process.exit(0); // nothing relevant staged
} else {
  targets = walk(API_DIR);
}

let violating = 0;
let compliant = 0;
let exemptCount = 0;

for (const file of targets.sort()) {
  const res = checkRoute(file);
  if (res.exempt) {
    exemptCount++;
    console.log(`EXEMPT ${res.rel}\n       reason: ${res.exempt.reason}\n`);
    continue;
  }
  if (res.violations.length === 0) {
    compliant++;
    continue;
  }
  violating++;
  console.log(res.rel + (res.redirectRoute ? "  (redirect route: response-shape skipped)" : ""));
  for (const v of res.violations.sort((a, b) => a.line - b.line)) {
    console.log(`  ${res.rel}:${v.line}  [${v.rule}]  ${v.message}`);
  }
  console.log("");
}

const checked = compliant + violating + exemptCount;
console.log(
  `${checked} routes checked, ${compliant} compliant, ${violating} violating` +
    (exemptCount ? `, ${exemptCount} exempt` : "")
);

process.exit(violating > 0 ? 1 : 0);

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next (unanchored so a stray nested
    // .next from running a command in the wrong cwd doesn't get linted too):
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "next-env.d.ts",
    // Vendored third-party asset, not authored code -- see
    // docs/specs/07-shared-editor.md (copied from apps/extension's
    // src/assets/vendor/gif.js/gif.worker.js so the shared editor's GIF
    // export worker resolves the same /assets/vendor/... path on web).
    "public/assets/vendor/**",
  ]),
  // Honour the underscore convention the codebase already uses for
  // deliberately-unused bindings (e.g. `_request` in handlers that ignore it).
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Layer boundary enforcement: Server .ts files under app/ (like sitemap.ts, robots.ts, manifest.ts)
  // may call services but must not touch the database or vendor clients directly.
  {
    files: ["app/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/db", "@/lib/db/**"],
              message:
                "Server .ts files must not query the database directly. Call a service in @/lib/services instead — see apps/web/CLAUDE.md.",
            },
            {
              group: ["drizzle-orm", "drizzle-orm/**"],
              message:
                "Server .ts files must not query the database directly. Call a service in @/lib/services instead — see apps/web/CLAUDE.md.",
            },
            {
              group: ["postgres"],
              message:
                "Server .ts files must not query the database directly. Call a service in @/lib/services instead — see apps/web/CLAUDE.md.",
            },
            {
              group: ["@/lib/integrations/**"],
              message:
                "Server .ts files must not import vendor clients directly. Call a service in @/lib/services instead — see apps/web/CLAUDE.md.",
            },
          ],
        },
      ],
    },
  },
  // Layer boundary enforcement: API routes must not touch the database.
  {
    files: ["app/api/**/route.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/db", "@/lib/db/**"],
              message:
                "API routes must not touch the database. Call a service in @/lib/services instead — see apps/web/CLAUDE.md.",
            },
            {
              group: ["drizzle-orm", "drizzle-orm/**"],
              message:
                "API routes must not touch the database. Call a service in @/lib/services instead — see apps/web/CLAUDE.md.",
            },
            {
              group: ["postgres"],
              message:
                "API routes must not touch the database. Call a service in @/lib/services instead — see apps/web/CLAUDE.md.",
            },
            {
              group: ["@/lib/integrations/**"],
              message:
                "API routes must not import vendor clients. Call a service in @/lib/services instead — see apps/web/CLAUDE.md.",
            },
          ],
        },
      ],
    },
  },
  // Layer boundary enforcement: Services must not call other services and must be framework-agnostic.
  {
    files: ["lib/services/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/services/**", "./*.service", "../services/**"],
              message:
                "Services must not call other services (keep dependencies flat). Move shared logic into @/lib/db or a shared helper.",
            },
            {
              group: ["next/server"],
              message:
                "Services must be framework-agnostic. Handle NextResponse in the API route layer.",
            },
            {
              group: ["@/lib/hooks/**"],
              message:
                "Services must not call hooks. Hooks are for React components, not business logic.",
            },
            {
              group: ["drizzle-orm", "drizzle-orm/**"],
              message:
                "Services must not access the database directly. Call functions from @/lib/db instead.",
            },
            {
              group: ["postgres"],
              message:
                "Services must not access the database directly. Call functions from @/lib/db instead.",
            },
          ],
          paths: [
            {
              name: "@/lib/db",
              message:
                "Services must not build queries. Import a named function from @/lib/db/<module> instead.",
            },
            {
              name: "@/lib/db/schema",
              message:
                "Services must not build queries. Import a named function from @/lib/db/<module> instead.",
            },
          ],
        },
      ],
    },
  },
  // Layer boundary enforcement: Database files contain Drizzle queries only — no business logic, no service imports.
  {
    files: ["lib/db/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/services/**"],
              message:
                "Database files contain Drizzle queries only — no business logic, no service imports.",
            },
            {
              group: ["@/lib/integrations/**"],
              message:
                "Database files contain Drizzle queries only — no vendor clients.",
            },
            {
              group: ["next/server"],
              message:
                "Database files contain Drizzle queries only — no Next.js imports.",
            },
          ],
        },
      ],
    },
  },
  // Layer boundary enforcement: Integration layer (vendor clients) must not call services or use Next.js.
  {
    files: ["lib/integrations/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/services/**"],
              message:
                "Integration layer contains vendor clients only — no business logic, no service calls.",
            },
            {
              group: ["next/server"],
              message:
                "Integration layer contains vendor clients only — no Next.js imports.",
            },
            {
              group: ["@/lib/db", "@/lib/db/**"],
              message:
                "Integration layer contains vendor clients only — no database access. Data access belongs in @/lib/db, called from a service.",
            },
          ],
        },
      ],
    },
  },
  // Layer boundary enforcement: Auth adapter must not import services or integrations.
  {
    files: ["lib/auth/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/services/**"],
              message:
                "Auth adapter must not import services. Keep the auth layer independent from business logic.",
            },
            {
              group: ["@/lib/integrations/**"],
              message:
                "Auth adapter must not import integrations. Keep the auth layer independent from vendor clients.",
            },
          ],
        },
      ],
    },
  },
  // Layer boundary enforcement: Hooks are React Query wrappers. Call the API route via fetch, never a service or the DB directly.
  {
    files: ["lib/hooks/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/services/**"],
              message:
                "Hooks are React Query wrappers. Call the API route via fetch, never a service or the DB directly.",
            },
            {
              group: ["@/lib/db", "@/lib/db/**"],
              message:
                "Hooks are React Query wrappers. Call the API route via fetch, never a service or the DB directly.",
            },
          ],
        },
      ],
    },
  },
  // Layer boundary enforcement: Client utilities (DOM code, presentation formatters) must not import from backend layers.
  {
    files: ["lib/client/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/db", "@/lib/db/**"],
              message:
                "Client utilities must not import from the database layer. These files run in the browser.",
            },
            {
              group: ["@/lib/services/**"],
              message:
                "Client utilities must not import from services. Call the API route via a hook instead.",
            },
            {
              group: ["@/lib/integrations/**"],
              message:
                "Client utilities must not import from integrations. These run on the server only.",
            },
          ],
        },
      ],
    },
  },
  // Layer boundary enforcement: Components must go through a hook. Never import a service or the database directly.
  {
    files: ["components/**", "app/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/services/**"],
              message:
                "Components must go through a hook. Never import a service or the database directly.",
            },
            {
              group: ["@/lib/db", "@/lib/db/**"],
              message:
                "Components must go through a hook. Never import a service or the database directly.",
            },
            {
              group: ["@/lib/integrations/**"],
              message:
                "Components must not import vendor clients. Call the API route through a hook instead — see apps/web/CLAUDE.md.",
            },
          ],
        },
      ],
    },
  },
  // Layer boundary enforcement: Recording utilities (getUserMedia, getDisplayMedia, etc.)
  // run in the browser and must not access the database or call services directly.
  {
    files: ["lib/recording/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/db", "@/lib/db/**"],
              message:
                "Recording utilities run in the browser and must not access the database. Call the API route via a hook instead — see apps/web/CLAUDE.md.",
            },
            {
              group: ["@/lib/services/**"],
              message:
                "Recording utilities run in the browser and must not call services. Call the API route via a hook instead — see apps/web/CLAUDE.md.",
            },
            {
              group: ["@/lib/integrations/**"],
              message:
                "Recording utilities run in the browser and must not import vendor clients. These run on the server only — see apps/web/CLAUDE.md.",
            },
          ],
        },
      ],
    },
  },
  // Layer boundary enforcement: Editor adapters run in the browser and must not
  // access the database or call services directly.
  {
    files: ["lib/editor/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/db", "@/lib/db/**"],
              message:
                "Editor adapters run in the browser and must not access the database. Call the API route via a hook instead — see apps/web/CLAUDE.md.",
            },
            {
              group: ["@/lib/services/**"],
              message:
                "Editor adapters run in the browser and must not call services. Call the API route via a hook instead — see apps/web/CLAUDE.md.",
            },
            {
              group: ["@/lib/integrations/**"],
              message:
                "Editor adapters run in the browser and must not import vendor clients. These run on the server only — see apps/web/CLAUDE.md.",
            },
          ],
        },
      ],
    },
  },
  // Server components render on the server, where no hook/API round trip exists,
  // so page.tsx and layout.tsx may call the Service layer directly. They still
  // must never touch the database. Declared last so it overrides the stricter
  // component zone above for these two filenames only -- a "use client" file
  // named page.tsx is the one gap here, which review has to catch.
  {
    files: ["app/**/page.tsx", "app/**/layout.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/db", "@/lib/db/**"],
              message:
                "Server components must not query the database directly. Call a service in @/lib/services instead.",
            },
            {
              group: ["@/lib/integrations/**"],
              message:
                "Server components must not import vendor clients directly. Call a service in @/lib/services instead — see apps/web/CLAUDE.md.",
            },
          ],
        },
      ],
    },
  },
  // Next.js wraps the global fetch, and inside that wrapper cancelling a
  // response body never settles: the request hangs with no error, no log line
  // and no timeout. It cost three debugging rounds to find as the cause of an
  // upload frozen at "Finishing…", and it is invisible to unit tests because
  // plain Node's fetch handles it fine. Read the body instead — even a body
  // you do not want, which is cheap for the range requests this came up in.
  {
    files: ["app/**", "lib/**", "components/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[property.name='cancel'][object.property.name='body']",
          message:
            "Do not cancel a fetch response body — under Next's patched fetch it never settles and the request hangs silently. Read it instead (e.g. await res.arrayBuffer()).",
        },
      ],
    },
  },
]);

export default eslintConfig;

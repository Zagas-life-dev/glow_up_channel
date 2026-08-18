import nextConfig from "eslint-config-next"

/**
 * Flat config for the Next app.
 *
 * ESLint is pinned to 9.x in package.json on purpose. `eslint-config-next`
 * peers `eslint >=9`, but two of the plugins it pulls in — `eslint-plugin-react`
 * and `eslint-plugin-react-hooks` — still cap at ESLint 9, and ESLint 10 removed
 * `context.getFilename()`, which `eslint-plugin-react` calls while detecting the
 * React version. On ESLint 10 that throws before a single file is linted. Bump
 * back to 10 only once `eslint-plugin-react` ships a release that supports it.
 */
const config = [
  {
    // Flat config only ignores node_modules and .git by default, so everything
    // else vendored into the repo has to be named here or ESLint walks into it.
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "coverage/**",
      "next-env.d.ts",
      // A Python virtualenv, but it carries megabytes of bundled JS (Playwright)
      // that ESLint will happily parse for a couple of minutes if allowed.
      "Scraper/venv/**",
      // The backend is a separate project with its own tooling.
      "latest-glowup-channel/**",
      // Generated design artefacts, not source.
      "design_handoff_glowup_unified/**",
      "public/sw.js",
    ],
  },

  ...nextConfig,

  {
    name: "glowup/severities",
    rules: {
      /*
       * `eslint-plugin-react-hooks` v7 added the React Compiler rules, and they
       * fire ~140 times across a codebase written before they existed. They are
       * worth keeping — they find real cascading renders and mutation bugs — but
       * as errors they make lint unusable as a gate, which means nobody runs it
       * and the genuinely new problems go unseen too.
       *
       * So: warnings. `pnpm lint` fails on things that are actually broken, and
       * these stay visible to be worked through. Promote each one back to
       * "error" as its last occurrence is cleared.
       *
       * Current counts, for whoever picks this up:
       *   set-state-in-effect            ~95
       *   exhaustive-deps                ~36
       *   immutability                   ~21
       *   purity                         ~13
       *   refs                            ~5
       *   preserve-manual-memoization     ~5
       */
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/preserve-manual-memoization": "warn",

      /*
       * Off, not warned. This rule exists to catch a stray `>` or `}` in JSX,
       * but every one of its ~54 hits here is an apostrophe in ordinary prose
       * ("you're", "don't"), which React renders correctly. Escaping readable
       * copy to satisfy it would make the source worse, and the noise buries
       * the two cases where it would have had a point.
       */
      "react/no-unescaped-entities": "off",

      /*
       * `next/image` is the right default, but a handful of places legitimately
       * need a plain <img> — user-supplied URLs off arbitrary hosts that are not
       * in `next.config` remotePatterns, and a PWA banner that renders before
       * hydration. Warn so new ones still get questioned.
       */
      "@next/next/no-img-element": "warn",
    },
  },
]

export default config

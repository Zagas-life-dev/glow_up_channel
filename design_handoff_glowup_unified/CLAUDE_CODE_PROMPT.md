# Paste this into Claude Code

Run from the root of your local `Glowup-diaries-main` folder, after copying this
handoff folder to `design_handoff_glowup_unified/` inside it.

---

Read `design_handoff_glowup_unified/README.md` in full, then open
`design_handoff_glowup_unified/GlowUp Unified.dc.html` in a browser to see the nine
screens it documents. Those HTML files are design references, not code to copy.

Work only in this local working copy. Do not push, do not create branches on the
GitHub remote, do not open a PR.

Then:

1. Confirm you understand the mapping from the README's "Screens" section to routes
   in `app/`, and list any screen where the target route is ambiguous. Stop and ask
   me about those before writing code.
2. Implement in this order, one commit per step, and let me review before moving on:
   1. `components/app-bottom-nav.tsx` — four tabs: Today `/`, Discover `/discover`,
      Pipeline `/pipeline`, Me `/profile/[id]`. Remove Events, Playlist, Settings.
   2. New `app/pipeline/` route — the tracked-items list, grouped Due this week /
      Waiting on them / Closed. Read `docs/SAVED_ITEMS_BACKWARD_COMPATIBILITY.md`
      first and backfill existing saves as pipeline items with a due date derived
      from the item's deadline.
   3. Save → Track everywhere: `components/feed-card.tsx`,
      `components/engagement-actions.tsx`, and any other save affordance you find.
   4. New `app/discover/` route — one date-sorted list across
      `data/events_rows.json`, `jobs_rows.json`, `opportunities_rows.json`,
      `resources_rows.json`, with per-type actions (RSVP / Apply / Track / Open) and
      the search state behind the top-left control. Redirect `app/events` and
      `app/search` to it.
   5. `app/page.tsx` + `components/feed-container.tsx` — Today, with the single dark
      urgent card that expands in place.
   6. `app/opportunities/[id]` — detail with the pipeline band under the hero.
   7. `app/profile/[id]` — You, with readiness / searches / playlists tabs.
   8. `app/onboarding` — interest setup before the auth wall.
   9. `app/notifications` — the four allowed alert reasons only.
   10. Re-entry sheet on return after a tracked deadline passes.
3. Use the project's existing Tailwind semantic tokens and shadcn/ui primitives.
   Where a colour in the README's token list has no token yet, add it to the theme
   rather than hard-coding the hex.
4. Do not add features the README does not describe. In particular: no
   "you might like" notifications, no relevance sort, no passive save.

Start with step 1 only, then show me the diff.

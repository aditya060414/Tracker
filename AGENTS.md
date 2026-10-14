<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Shared shell (sidebar + header) lives in `src/components/layout/AppLayout.tsx`, mounted once in `__root.tsx`; each module is its own route file. Why: keeps nav mounted while pages change.
- Reusable presentational pieces live in `src/components/common/`; pages pass data via props. Why: consistent look across modules.
- User data is currently persisted in localStorage via `useLocal` (read after hydration). Why: no backend yet; swap for Lovable Cloud when auth/persistence is added.
- Theme is a `.dark` class set by an inline head script before render, persisted in localStorage. Why: avoids wrong-theme flash.

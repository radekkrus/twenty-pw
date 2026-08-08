/**
 * 🔴 Fork addition, not upstream.
 *
 * Lets a browser-side runtime keep a view's *unsaved* filters and sorts across a reload.
 *
 * Twenty holds what you type into the filter bar in a jotai atom and nowhere else — not in
 * the URL, not in storage. `loadRecordIndexStates` writes the view's own filters into that
 * atom on every mount, so F5 throws away whatever the operator narrowed the list down to.
 * On a 23k-row base that is the difference between "filter, look, refresh, keep looking"
 * and "filter again from scratch every time".
 *
 * This replaces `infra/twenty/patches/patch-front-viewstate.js`, which used to rewrite the
 * minified chunk at container boot.
 *
 * ## The runtime stays outside the bundle, on purpose
 *
 * The implementation lives in `/brand/view-state.js`, served by Caddy. Keeping it there
 * means its heuristics — which properties decide "same filter", how long a stored copy
 * lives, when a server-side view edit invalidates it — can be tuned by editing one file
 * and hard-reloading, with no image build and no restart. It also keeps a kill switch that
 * needs no deploy: `localStorage['tw:viewstate:off'] = '1'`.
 *
 * ## Failing open is the whole design
 *
 * When the runtime is absent, disabled, or throws, this returns null and every caller falls
 * back to the view's own values, which is exactly stock behaviour. A missing runtime must
 * degrade, never break: this code path runs on every record index mount.
 */

type ViewStateShapes<TFilters, TGroups, TSorts> = {
  filters: TFilters;
  groups: TGroups;
  sorts: TSorts;
};

type ViewStateRuntime = {
  restore?: (context: unknown) => unknown;
};

/**
 * Ask the runtime what this view should open with.
 *
 * Returns null to mean "use the view's own values". The generic ties the result to the
 * baseline that was handed in, because the runtime stores and returns those same shapes.
 */
export const restoreViewState = <TFilters, TGroups, TSorts>(context: {
  store: unknown;
  viewId: string;
  filtersAtom: unknown;
  groupsAtom: unknown;
  sortsAtom: unknown;
  contextAtom: unknown;
  baseline: ViewStateShapes<TFilters, TGroups, TSorts>;
}): ViewStateShapes<TFilters, TGroups, TSorts> | null => {
  const runtime = (
    globalThis as typeof globalThis & {
      __twentyViewState?: ViewStateRuntime;
    }
  ).__twentyViewState;

  if (typeof runtime?.restore !== 'function') {
    return null;
  }

  try {
    return (
      (runtime.restore(context) as ViewStateShapes<
        TFilters,
        TGroups,
        TSorts
      > | null) ?? null
    );
  } catch {
    // A broken runtime must not take the record index down with it.
    return null;
  }
};

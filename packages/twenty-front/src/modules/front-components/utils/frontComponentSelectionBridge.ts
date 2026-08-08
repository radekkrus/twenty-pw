/**
 * 🔴 Fork addition, not upstream.
 *
 * Carries the "select all" rule and its resolved filter from the host, which computes them
 * when it builds an engine command's context, to the front component sandbox, which is
 * otherwise handed only `selectedRecordIds` — an empty array whenever the selection is an
 * exclusion rule rather than a list.
 *
 * ## Why a module-level singleton and not a prop
 *
 * The two sites live in unrelated trees: `buildHeadlessCommandContextApi` runs against a
 * raw jotai `Store` outside React, and `useFrontComponentExecutionContext` is a hook deep
 * inside the renderer. There is no shared owner to thread a value through without
 * rewriting the command pipeline's signature, which is a much larger change than the
 * problem justifies.
 *
 * This replaces what used to be `infra/twenty/patches/patch-front-selection.js`: a script
 * that rewrote `globalThis.__twentySelection` into two minified chunks at container boot,
 * renamed them so an immutable asset cache would refetch, and repointed every reference.
 * Same mechanism, now typed, greppable, and impossible to silently miss on an image bump.
 *
 * ## Lifetime
 *
 * Last write wins, and a read is only meaningful for the command the host just built. That
 * is acceptable because the host writes it immediately before mounting the component that
 * reads it, and the value is re-derived on every command. It is deliberately not cleared
 * on unmount: a component that remounts (the renderer republishes context as the panel
 * re-renders) must still see the selection it was opened with.
 */

export type FrontComponentSelection = {
  rule: unknown;
  filter: unknown;
};

let current: FrontComponentSelection | null = null;

export const setFrontComponentSelection = (
  selection: FrontComponentSelection,
): void => {
  current = selection;
};

export const getFrontComponentSelection = (): FrontComponentSelection | null =>
  current;

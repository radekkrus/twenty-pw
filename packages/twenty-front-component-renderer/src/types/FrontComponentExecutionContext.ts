import { type AppLocale } from 'twenty-shared/translations';

export type FrontComponentExecutionContext = {
  frontComponentId: string;
  userId: string | null;
  /**
   * @deprecated Use `selectedRecordIds` instead. Derive single record as `selectedRecordIds.length === 1 ? selectedRecordIds[0] : null`.
   */
  recordId: string | null;
  /** All selected record IDs */
  selectedRecordIds: string[];
  /**
   * The rule and filter behind a "select all", when there is one. Null otherwise.
   *
   * 🔴 Fork addition, not upstream. Must stay in step with the canonical definition in
   * `twenty-sdk/src/sdk/front-component/types/FrontComponentExecutionContext.ts`; this is a
   * second copy of the same shape, used by the worker exports.
   */
  selectionFilter?: {
    rule: unknown;
    filter: unknown;
  } | null;
  /** Resolved color scheme of the host UI ('System' is already resolved) */
  colorScheme: 'light' | 'dark';
  locale?: AppLocale;
};

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
   * The rule and filter behind a "select all", when there is one.
   *
   * 🔴 Fork addition, not upstream. Ticking the header checkbox produces no ids: the host
   * keeps that selection as an exclusion rule over the live filter chips and resolves it
   * only inside its own actions. That is why "Update Companies" on 3 421 rows works while
   * an app command on the same 3 421 rows receives an empty `selectedRecordIds`.
   *
   * Without this an app cannot turn "zaznacz wszystko" into one click; the operator has to
   * save the view or tick a marker field first. `null` when the selection is a plain list
   * of ids, which `selectedRecordIds` already carries.
   */
  selectionFilter?: {
    rule: unknown;
    filter: unknown;
  } | null;
  /** Resolved color scheme of the host UI ('System' is already resolved) */
  colorScheme: 'light' | 'dark';
  locale?: AppLocale;
};

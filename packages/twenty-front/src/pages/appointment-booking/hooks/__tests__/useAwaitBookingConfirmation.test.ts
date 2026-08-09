import { act, renderHook } from '@testing-library/react';

type PwMeetingRecord = { id: string };

// Models the real hook honestly: a query result never changes on its own between
// renders - it only changes because `refetch` actually ran (a real network round
// trip resolving with new data). Mutating `currentRecords` anywhere other than
// inside `mockRefetch`'s implementation would reintroduce the bug this test suite
// exists to catch: a test that passes even when the poll loop never refetches.
let currentRecords: PwMeetingRecord[] = [];
const mockRefetch = jest.fn();
const mockUseFindManyRecords = jest.fn();

jest.mock('@/object-record/hooks/useFindManyRecords', () => ({
  useFindManyRecords: (params: unknown) => mockUseFindManyRecords(params),
}));

import { useAwaitBookingConfirmation } from '~/pages/appointment-booking/hooks/useAwaitBookingConfirmation';

// Mirrors the hook's own MAX_POLLS/POLL_INTERVAL_MS constants (not exported, so pinned here).
const MAX_POLLS = 15;
const POLL_INTERVAL_MS = 5000;

describe('useAwaitBookingConfirmation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    currentRecords = [];
    mockRefetch.mockReset();
    mockUseFindManyRecords.mockReset();
    mockUseFindManyRecords.mockImplementation(() => ({
      records: currentRecords,
      refetch: mockRefetch,
      loading: false,
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stays idle when not armed and never queries', () => {
    const { result } = renderHook(() =>
      useAwaitBookingConfirmation({ companyId: 'company-1', armed: false }),
    );

    expect(result.current.status).toBe('idle');
    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it('scopes the query to the company AND to rows created after arming, so an old booking never counts', () => {
    renderHook(() =>
      useAwaitBookingConfirmation({ companyId: 'company-1', armed: true }),
    );

    const lastCallParams = mockUseFindManyRecords.mock.calls.at(-1)?.[0] as {
      objectNameSingular: string;
      filter: unknown;
    };

    expect(lastCallParams.objectNameSingular).toBe('pwMeeting');
    expect(lastCallParams.filter).toEqual({
      and: [
        { companyId: { eq: 'company-1' } },
        { createdAt: { gt: expect.any(String) } },
      ],
    });
  });

  it('actually calls refetch on each poll instead of re-reading a stale query result', () => {
    renderHook(() =>
      useAwaitBookingConfirmation({ companyId: 'company-1', armed: true }),
    );

    expect(mockRefetch).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS);
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('moves to found once a poll refetch turns up a pwMeeting row for the company', () => {
    // The only place `currentRecords` is allowed to change - simulating a real refetch
    // resolving with a freshly-created row.
    mockRefetch.mockImplementation(() => {
      currentRecords = [{ id: 'meeting-1' }];
    });

    const { result } = renderHook(() =>
      useAwaitBookingConfirmation({ companyId: 'company-1', armed: true }),
    );

    expect(result.current.status).toBe('waiting');

    act(() => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS);
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('found');
  });

  it('keeps waiting while the poll budget has attempts left, refetching on every attempt', () => {
    const { result } = renderHook(() =>
      useAwaitBookingConfirmation({ companyId: 'company-1', armed: true }),
    );

    expect(result.current.status).toBe('waiting');

    // Drive the attempt counter up via the hook's own setTimeout, one poll interval at a
    // time, stopping one short of the bound - each advance must go through act() so the
    // resulting setAttempt state update is flushed before the next timer is scheduled.
    for (let poll = 0; poll < MAX_POLLS - 1; poll += 1) {
      act(() => {
        jest.advanceTimersByTime(POLL_INTERVAL_MS);
      });
    }

    expect(result.current.status).toBe('waiting');
    expect(mockRefetch).toHaveBeenCalledTimes(MAX_POLLS - 1);
  });

  it('gives up and reports timedOut once the poll budget is exhausted with no row found', () => {
    const { result } = renderHook(() =>
      useAwaitBookingConfirmation({ companyId: 'company-1', armed: true }),
    );

    for (let poll = 0; poll < MAX_POLLS; poll += 1) {
      act(() => {
        jest.advanceTimersByTime(POLL_INTERVAL_MS);
      });
    }

    expect(result.current.status).toBe('timedOut');
    expect(mockRefetch).toHaveBeenCalledTimes(MAX_POLLS);
  });
});

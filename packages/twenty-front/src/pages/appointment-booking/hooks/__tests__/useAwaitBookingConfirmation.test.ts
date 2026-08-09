import { act, renderHook } from '@testing-library/react';

const mockRefetch = jest.fn();

jest.mock('@/object-record/hooks/useFindManyRecords', () => ({
  useFindManyRecords: () => ({ records: mockRefetch(), refetch: jest.fn(), loading: false }),
}));

import { useAwaitBookingConfirmation } from '~/pages/appointment-booking/hooks/useAwaitBookingConfirmation';

// Mirrors the hook's own MAX_POLLS/POLL_INTERVAL_MS constants (not exported, so pinned here).
const MAX_POLLS = 8;
const POLL_INTERVAL_MS = 5000;

describe('useAwaitBookingConfirmation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockRefetch.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stays idle when not armed', () => {
    mockRefetch.mockReturnValue([]);
    const { result } = renderHook(() =>
      useAwaitBookingConfirmation({ companyId: 'company-1', armed: false }),
    );

    expect(result.current.status).toBe('idle');
  });

  it('moves to found once a pwMeeting row appears for the company', () => {
    mockRefetch.mockReturnValue([]);
    const { result, rerender } = renderHook(
      ({ armed }) =>
        useAwaitBookingConfirmation({ companyId: 'company-1', armed }),
      { initialProps: { armed: true } },
    );

    expect(result.current.status).toBe('waiting');

    mockRefetch.mockReturnValue([{ id: 'meeting-1' }]);
    rerender({ armed: true });

    expect(result.current.status).toBe('found');
  });

  it('keeps waiting while the poll budget has attempts left', () => {
    mockRefetch.mockReturnValue([]);
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
  });

  it('gives up and reports timedOut once the poll budget is exhausted with no row found', () => {
    mockRefetch.mockReturnValue([]);
    const { result } = renderHook(() =>
      useAwaitBookingConfirmation({ companyId: 'company-1', armed: true }),
    );

    for (let poll = 0; poll < MAX_POLLS; poll += 1) {
      act(() => {
        jest.advanceTimersByTime(POLL_INTERVAL_MS);
      });
    }

    expect(result.current.status).toBe('timedOut');
  });
});

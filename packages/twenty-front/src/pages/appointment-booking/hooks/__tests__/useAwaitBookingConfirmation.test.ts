import { act, renderHook } from '@testing-library/react';

const mockRefetch = jest.fn();

jest.mock('@/object-record/hooks/useFindManyRecords', () => ({
  useFindManyRecords: () => ({ records: mockRefetch(), refetch: jest.fn(), loading: false }),
}));

import { useAwaitBookingConfirmation } from '~/pages/appointment-booking/hooks/useAwaitBookingConfirmation';

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
});

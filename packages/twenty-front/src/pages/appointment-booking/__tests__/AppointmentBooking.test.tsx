import { render, screen } from '@testing-library/react';

import { AppointmentBooking } from '~/pages/appointment-booking/AppointmentBooking';

jest.mock('@/object-record/hooks/useObjectRecordSearchRecords', () => ({
  useObjectRecordSearchRecords: () => ({
    searchRecords: [],
    loading: false,
  }),
}));

jest.mock('@/object-record/hooks/useCreateOneRecord', () => ({
  useCreateOneRecord: () => ({ createOneRecord: jest.fn() }),
}));

describe('AppointmentBooking', () => {
  it('renders the page heading', () => {
    render(<AppointmentBooking />);

    expect(
      screen.getByRole('heading', { name: 'Nowe spotkanie' }),
    ).toBeInTheDocument();
  });
});

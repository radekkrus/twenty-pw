import { render, screen } from '@testing-library/react';

import { AppointmentBooking } from '~/pages/appointment-booking/AppointmentBooking';

describe('AppointmentBooking', () => {
  it('renders the page heading', () => {
    render(<AppointmentBooking />);

    expect(
      screen.getByRole('heading', { name: 'Nowe spotkanie' }),
    ).toBeInTheDocument();
  });
});

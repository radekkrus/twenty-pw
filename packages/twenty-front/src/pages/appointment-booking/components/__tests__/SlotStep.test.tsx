import { render } from '@testing-library/react';

import { SlotStep } from '~/pages/appointment-booking/components/SlotStep';

const mockCalProps: { calLink?: string; config?: Record<string, unknown> } = {};

jest.mock('@calcom/embed-react', () => ({
  __esModule: true,
  default: (props: { calLink: string; config: Record<string, unknown> }) => {
    mockCalProps.calLink = props.calLink;
    mockCalProps.config = props.config;
    return <div data-testid="cal-embed" />;
  },
}));

describe('SlotStep', () => {
  it('embeds the closer calLink prefilled with the lead name and email', () => {
    render(
      <SlotStep
        closer={{ name: 'Kasia Wrzesień', calcomEventSlug: 'kasia-wrzesien/30min' }}
        leadName="Klinika Uroda"
        leadEmail="kontakt@klinikauroda.pl"
      />,
    );

    expect(mockCalProps.calLink).toBe('kasia-wrzesien/30min');
    expect(mockCalProps.config).toMatchObject({
      name: 'Klinika Uroda',
      email: 'kontakt@klinikauroda.pl',
      layout: 'month_view',
    });
  });
});

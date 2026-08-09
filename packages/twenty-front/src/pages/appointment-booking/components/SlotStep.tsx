import { useEffect, useState } from 'react';
import Cal, { getCalApi } from '@calcom/embed-react';

import { useAwaitBookingConfirmation } from '~/pages/appointment-booking/hooks/useAwaitBookingConfirmation';

type SlotStepProps = {
  closer: { name: string; calcomEventSlug: string };
  leadName: string;
  leadEmail?: string;
  companyId: string;
};

export const SlotStep = ({
  closer,
  leadName,
  leadEmail,
  companyId,
}: SlotStepProps) => {
  const [armed, setArmed] = useState(false);
  const { status } = useAwaitBookingConfirmation({ companyId, armed });

  useEffect(() => {
    (async () => {
      const cal = await getCalApi();
      cal('on', {
        action: 'bookingSuccessfulV2',
        callback: () => setArmed(true),
      });
    })();
  }, []);

  if (status === 'waiting') return <div>Zapisujemy w tle...</div>;
  if (status === 'found') return <div>Spotkanie zapisane.</div>;
  if (status === 'timedOut')
    return (
      <div>
        Rezerwacja przeszła w Cal.com, ale jeszcze nie widzimy jej w CRM - sprawdź za
        chwilę w module Meetings.
      </div>
    );

  return (
    <Cal
      calLink={closer.calcomEventSlug}
      config={{
        layout: 'month_view',
        name: leadName,
        email: leadEmail ?? '',
      }}
    />
  );
};

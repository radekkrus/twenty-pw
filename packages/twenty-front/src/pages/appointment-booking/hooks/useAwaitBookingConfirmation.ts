import { useEffect, useState } from 'react';

import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';

type BookingConfirmationStatus = 'idle' | 'waiting' | 'found' | 'timedOut';

/** Bridge cron runs every 60s - a few retries at a few seconds apart covers it without
 * making the setter stare at a spinner for a full minute on the common case. */
const MAX_POLLS = 8;
const POLL_INTERVAL_MS = 5000;

export const useAwaitBookingConfirmation = ({
  companyId,
  armed,
}: {
  companyId: string;
  armed: boolean;
}): { status: BookingConfirmationStatus } => {
  const [attempt, setAttempt] = useState(0);

  const { records } = useFindManyRecords<{
    id: string;
    __typename: 'pwMeeting';
  }>({
    objectNameSingular: 'pwMeeting',
    filter: { companyId: { eq: companyId } },
    skip: !armed,
  });

  useEffect(() => {
    if (!armed || (records ?? []).length > 0 || attempt >= MAX_POLLS) return;

    const timer = setTimeout(() => setAttempt((current) => current + 1), POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [armed, records, attempt]);

  if (!armed) return { status: 'idle' };
  if ((records ?? []).length > 0) return { status: 'found' };
  if (attempt >= MAX_POLLS) return { status: 'timedOut' };

  return { status: 'waiting' };
};

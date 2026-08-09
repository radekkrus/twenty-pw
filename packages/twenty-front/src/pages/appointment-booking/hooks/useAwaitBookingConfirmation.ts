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

  // Freshness fence: a repeat client has old pwMeeting rows for the same company.
  // Without gating on "created after we armed", the very first poll would match one
  // of those and report `found` immediately - a false positive as broken as a false
  // timeout. Derived during render (React's documented "adjusting state while
  // rendering" pattern) so the very first query already carries the right filter,
  // no extra render/flicker.
  const [wasArmed, setWasArmed] = useState(armed);
  const [armedAt, setArmedAt] = useState<string | null>(
    armed ? new Date().toISOString() : null,
  );
  if (armed !== wasArmed) {
    setWasArmed(armed);
    setArmedAt(armed ? new Date().toISOString() : null);
  }

  const { records, refetch } = useFindManyRecords<{
    id: string;
    __typename: 'pwMeeting';
  }>({
    objectNameSingular: 'pwMeeting',
    filter: {
      and: [
        { companyId: { eq: companyId } },
        { createdAt: { gt: armedAt ?? new Date().toISOString() } },
      ],
    },
    skip: !armed,
  });

  useEffect(() => {
    if (!armed || (records ?? []).length > 0 || attempt >= MAX_POLLS) return;

    const timer = setTimeout(() => {
      // Apollo's useQuery does not re-hit the network on a re-render with identical
      // variables - `attempt` incrementing alone changes nothing it depends on. This
      // refetch() is what actually makes each poll a real request.
      refetch();
      setAttempt((current) => current + 1);
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [armed, records, attempt, refetch]);

  if (!armed) return { status: 'idle' };
  if ((records ?? []).length > 0) return { status: 'found' };
  if (attempt >= MAX_POLLS) return { status: 'timedOut' };

  return { status: 'waiting' };
};

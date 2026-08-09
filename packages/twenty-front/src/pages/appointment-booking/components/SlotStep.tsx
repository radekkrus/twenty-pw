import Cal from '@calcom/embed-react';

type SlotStepProps = {
  closer: { name: string; calcomEventSlug: string };
  leadName: string;
  leadEmail?: string;
};

export const SlotStep = ({ closer, leadName, leadEmail }: SlotStepProps) => (
  <Cal
    calLink={closer.calcomEventSlug}
    config={{
      layout: 'month_view',
      name: leadName,
      email: leadEmail ?? '',
    }}
  />
);

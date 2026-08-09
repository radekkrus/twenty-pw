import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';

type CloserRecord = {
  id: string;
  name: string;
  calcomEventSlug: string | null;
  active: boolean;
  __typename: 'mtgCloser';
};

type PickedCloser = { id: string; name: string; calcomEventSlug: string };

type CloserStepProps = {
  onPicked: (closer: PickedCloser) => void;
};

export const CloserStep = ({ onPicked }: CloserStepProps) => {
  const { records } = useFindManyRecords<CloserRecord>({
    objectNameSingular: 'mtgCloser',
    filter: { active: { eq: true } },
  });

  const bookable = (records ?? []).filter(
    (closer): closer is CloserRecord & { calcomEventSlug: string } =>
      Boolean(closer.calcomEventSlug),
  );

  return (
    <div>
      {bookable.map((closer) => (
        <button
          key={closer.id}
          type="button"
          onClick={() =>
            onPicked({
              id: closer.id,
              name: closer.name,
              calcomEventSlug: closer.calcomEventSlug,
            })
          }
        >
          {closer.name}
        </button>
      ))}
    </div>
  );
};

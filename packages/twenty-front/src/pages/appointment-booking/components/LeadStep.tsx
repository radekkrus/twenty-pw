import { useState } from 'react';

import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { useObjectRecordSearchRecords } from '@/object-record/hooks/useObjectRecordSearchRecords';

type PickedCompany = { id: string; name: string; email?: string };

type LeadStepProps = {
  onPicked: (company: PickedCompany) => void;
};

export const LeadStep = ({ onPicked }: LeadStepProps) => {
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { searchRecords } = useObjectRecordSearchRecords({
    objectNameSingulars: ['company'],
    searchInput: query,
    skip: query.trim().length < 2,
  });

  const { createOneRecord } = useCreateOneRecord({
    objectNameSingular: 'company',
  });

  const handleCreate = async () => {
    if (submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const created = await createOneRecord({
        name: newName,
        leadEmails: { primaryEmail: newEmail },
        // libphonenumber-js needs a country hint or a `+`-prefixed number to
        // parse correctly - a bare local number (e.g. "123456789") can fail
        // silently server-side. No validation here per Task 2 scope; Task 6
        // revisits form polish.
        leadPhones: { primaryPhoneNumber: newPhone },
      });

      onPicked({ id: created.id, name: newName, email: newEmail });
    } catch {
      setSubmitError('Nie udało się zapisać kliniki. Spróbuj ponownie.');
      setSubmitting(false);
    }
  };

  if (creating) {
    return (
      <div>
        <label>
          Nazwa
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
        </label>
        <label>
          Email
          <input
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
          />
        </label>
        <label>
          Telefon
          <input
            value={newPhone}
            onChange={(event) => setNewPhone(event.target.value)}
          />
        </label>
        <button type="button" onClick={handleCreate} disabled={submitting}>
          {submitting ? 'Zapisywanie...' : 'Zapisz klinikę'}
        </button>
        {submitError !== null ? <p>{submitError}</p> : null}
      </div>
    );
  }

  return (
    <div>
      <input
        placeholder="Klinika - zacznij pisać nazwę"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {searchRecords?.map((result) => (
        <button
          key={result.recordId}
          type="button"
          onClick={() =>
            onPicked({ id: result.recordId, name: result.label })
          }
        >
          {result.label}
        </button>
      ))}
      <button type="button" onClick={() => setCreating(true)}>
        Nowa klinika
      </button>
    </div>
  );
};

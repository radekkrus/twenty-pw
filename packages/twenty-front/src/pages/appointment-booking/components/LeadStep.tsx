import { useState } from 'react';

import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { useObjectRecordSearchRecords } from '@/object-record/hooks/useObjectRecordSearchRecords';

type PickedCompany = { id: string; name: string };

type LeadStepProps = {
  onPicked: (company: PickedCompany) => void;
};

export const LeadStep = ({ onPicked }: LeadStepProps) => {
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const { searchRecords } = useObjectRecordSearchRecords({
    objectNameSingulars: ['company'],
    searchInput: query,
    skip: query.trim().length < 2,
  });

  const { createOneRecord } = useCreateOneRecord({
    objectNameSingular: 'company',
  });

  const handleCreate = async () => {
    const created = await createOneRecord({
      name: newName,
      leadEmails: { primaryEmail: newEmail },
      leadPhones: { primaryPhoneNumber: newPhone },
    });

    onPicked({ id: created.id, name: newName });
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
        <button type="button" onClick={handleCreate}>
          Zapisz klinikę
        </button>
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
      {(searchRecords as unknown as { record: PickedCompany }[] | undefined)?.map((result) => (
        <button
          key={result.record.id}
          type="button"
          onClick={() => onPicked(result.record)}
        >
          {result.record.name}
        </button>
      ))}
      <button type="button" onClick={() => setCreating(true)}>
        Nowa klinika
      </button>
    </div>
  );
};

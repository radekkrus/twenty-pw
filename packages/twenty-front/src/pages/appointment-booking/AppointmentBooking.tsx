import { styled } from '@linaria/react';
import { useState } from 'react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { LeadStep } from '~/pages/appointment-booking/components/LeadStep';

type PickedCompany = { id: string; name: string };

const StyledPage = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
  padding: ${themeCssVariables.spacing[6]};
  width: 100%;
`;

export const AppointmentBooking = () => {
  const [pickedCompany, setPickedCompany] = useState<PickedCompany | null>(
    null,
  );

  return (
    <StyledPage>
      <h1>Nowe spotkanie</h1>
      {pickedCompany === null ? (
        <LeadStep onPicked={setPickedCompany} />
      ) : (
        <div>
          <p>
            Klinika: {pickedCompany.name}{' '}
            <button type="button" onClick={() => setPickedCompany(null)}>
              Zmień klinikę
            </button>
          </p>
          {/* Task 3 renders <CloserStep> here once pickedCompany is set */}
        </div>
      )}
    </StyledPage>
  );
};

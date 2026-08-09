import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledPage = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
  padding: ${themeCssVariables.spacing[6]};
  width: 100%;
`;

export const AppointmentBooking = () => (
  <StyledPage>
    <h1>Nowe spotkanie</h1>
  </StyledPage>
);

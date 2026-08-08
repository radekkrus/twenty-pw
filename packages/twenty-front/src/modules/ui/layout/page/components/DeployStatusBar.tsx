import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

/**
 * Set by hand right before every deploy of this fork - the one thing on screen a stale
 * browser tab or a reverted build cannot fake. Warsaw time.
 */
const DEPLOY_STAMP = '2026-08-08 17:41';

const StyledBar = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.primary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-shrink: 0;
  height: 24px;
  justify-content: flex-end;
  padding: 0 ${themeCssVariables.spacing[3]};

  @media print {
    display: none;
  }
`;

const StyledLabel = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: 11px;
  white-space: nowrap;
`;

export const DeployStatusBar = () => (
  <StyledBar>
    <StyledLabel>Last update: {DEPLOY_STAMP}</StyledLabel>
  </StyledBar>
);

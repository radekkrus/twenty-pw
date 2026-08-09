import { NavigationDrawerOpenedSection } from '@/navigation-menu-item/display/sections/components/NavigationDrawerOpenedSection';
import { NavigationDrawerWorkspaceSectionSkeletonLoader } from '@/object-metadata/components/NavigationDrawerWorkspaceSectionSkeletonLoader';
import { NavigationDrawerItem } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';

import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';

import { IconCalendarEvent } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const FavoritesSectionDispatcher = lazy(() =>
  import('@/navigation-menu-item/display/sections/favorites/components/FavoritesSectionDispatcher').then(
    (module) => ({
      default: module.FavoritesSectionDispatcher,
    }),
  ),
);

const WorkspaceSectionDispatcher = lazy(() =>
  import('@/navigation-menu-item/display/sections/workspace/components/WorkspaceSectionDispatcher').then(
    (module) => ({
      default: module.WorkspaceSectionDispatcher,
    }),
  ),
);

const StyledScrollableItemsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
`;

export const MainNavigationDrawerScrollableItems = () => {
  const { t } = useLingui();
  const { pathname } = useLocation();
  const isAppointmentBookingActive = pathname === AppPath.AppointmentBooking;

  return (
    <StyledScrollableItemsContainer>
      <NavigationDrawerItem
        label={t`+ Nowe spotkanie`}
        Icon={IconCalendarEvent}
        to={AppPath.AppointmentBooking}
        active={isAppointmentBookingActive}
      />
      <NavigationDrawerOpenedSection />
      <Suspense fallback={<NavigationDrawerWorkspaceSectionSkeletonLoader />}>
        <FavoritesSectionDispatcher />
        <WorkspaceSectionDispatcher />
      </Suspense>
    </StyledScrollableItemsContainer>
  );
};

import { styled } from '@linaria/react';
import { useParams } from 'react-router-dom';

import { CommandMenuComponentInstanceContext } from '@/command-menu/states/contexts/CommandMenuComponentInstanceContext';
import { MAIN_CONTEXT_STORE_INSTANCE_ID } from '@/context-store/constants/MainContextStoreInstanceId';
import { ContextStoreComponentInstanceContext } from '@/context-store/states/contexts/ContextStoreComponentInstanceContext';
import { navigationMenuItemsSelector } from '@/navigation-menu-item/common/states/navigationMenuItemsSelector';
import { PageLayoutRenderer } from '@/page-layout/components/PageLayoutRenderer';
import { LayoutRenderingProvider } from '@/ui/layout/contexts/LayoutRenderingContext';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';
import { PageTitle } from '@/ui/utilities/page-title/components/PageTitle';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isDefined } from 'twenty-shared/utils';
import { PageLayoutType } from '~/generated-metadata/graphql';
import { StandalonePageHeader } from '~/pages/page-layout/StandalonePageHeader';

const StyledPageLayoutContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;

  @media print {
    display: block;
    min-height: auto;
    overflow: visible;
  }
`;

export const StandalonePageLayoutPage = () => {
  const { pageLayoutId } = useParams<{ pageLayoutId: string }>();

  const navigationMenuItems = useAtomStateValue(navigationMenuItemsSelector);
  const navigationMenuItem = navigationMenuItems.find(
    (item) => item.pageLayoutId === pageLayoutId,
  );
  const pageTitle = navigationMenuItem?.name?.trim();

  if (!isDefined(pageLayoutId)) {
    return null;
  }

  return (
    <ContextStoreComponentInstanceContext.Provider
      value={{ instanceId: MAIN_CONTEXT_STORE_INSTANCE_ID }}
    >
      <CommandMenuComponentInstanceContext.Provider
        value={{ instanceId: pageLayoutId }}
      >
        {isDefined(pageTitle) && pageTitle !== '' && (
          <PageTitle title={pageTitle} />
        )}
        <PageCardLayout
          header={<StandalonePageHeader pageLayoutId={pageLayoutId} />}
        >
          <LayoutRenderingProvider
            value={{
              targetRecordIdentifier: undefined,
              layoutType: PageLayoutType.STANDALONE_PAGE,
              isInSidePanel: false,
            }}
          >
            <StyledPageLayoutContainer>
              <PageLayoutRenderer pageLayoutId={pageLayoutId} />
            </StyledPageLayoutContainer>
          </LayoutRenderingProvider>
        </PageCardLayout>
      </CommandMenuComponentInstanceContext.Provider>
    </ContextStoreComponentInstanceContext.Provider>
  );
};

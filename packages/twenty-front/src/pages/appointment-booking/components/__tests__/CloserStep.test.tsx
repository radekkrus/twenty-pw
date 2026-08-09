import { fireEvent, render, screen } from '@testing-library/react';

import { CloserStep } from '~/pages/appointment-booking/components/CloserStep';

const mockRecords = jest.fn();
const mockLoading = jest.fn();

jest.mock('@/object-record/hooks/useFindManyRecords', () => ({
  useFindManyRecords: () => ({
    records: mockRecords(),
    loading: mockLoading(),
  }),
}));

describe('CloserStep', () => {
  beforeEach(() => {
    mockLoading.mockReturnValue(false);
  });

  it('lists active closers and calls onPicked with the chosen one', () => {
    mockRecords.mockReturnValue([
      { id: 'closer-1', name: 'Kasia Wrzesień', calcomEventSlug: 'kasia-wrzesien/30min', active: true, __typename: 'mtgCloser' },
      { id: 'closer-2', name: 'Marek Dudek', calcomEventSlug: 'marek-dudek/30min', active: true, __typename: 'mtgCloser' },
    ]);
    const onPicked = jest.fn();

    render(<CloserStep onPicked={onPicked} />);
    fireEvent.click(screen.getByText('Kasia Wrzesień'));

    expect(onPicked).toHaveBeenCalledWith({
      id: 'closer-1',
      name: 'Kasia Wrzesień',
      calcomEventSlug: 'kasia-wrzesien/30min',
    });
  });

  it('does not list a closer with no calcomEventSlug yet', () => {
    mockRecords.mockReturnValue([
      { id: 'closer-3', name: 'Nieskonfigurowany', calcomEventSlug: null, active: true, __typename: 'mtgCloser' },
    ]);

    render(<CloserStep onPicked={jest.fn()} />);

    expect(screen.queryByText('Nieskonfigurowany')).not.toBeInTheDocument();
  });

  it('shows an honest empty-state message when the roster finished loading with zero bookable closers', () => {
    mockRecords.mockReturnValue([]);

    render(<CloserStep onPicked={jest.fn()} />);

    expect(
      screen.getByText(
        'Żaden closer nie ma jeszcze skonfigurowanego kalendarza Cal.com. Skontaktuj się z administratorem.',
      ),
    ).toBeInTheDocument();
  });

  it('does not show the empty-state message while the roster is still loading', () => {
    mockRecords.mockReturnValue([]);
    mockLoading.mockReturnValue(true);

    render(<CloserStep onPicked={jest.fn()} />);

    expect(
      screen.queryByText(
        'Żaden closer nie ma jeszcze skonfigurowanego kalendarza Cal.com. Skontaktuj się z administratorem.',
      ),
    ).not.toBeInTheDocument();
  });
});

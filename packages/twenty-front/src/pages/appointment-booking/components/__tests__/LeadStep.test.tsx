import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { LeadStep } from '~/pages/appointment-booking/components/LeadStep';

const mockSearchRecords = jest.fn();
const mockCreateOneRecord = jest.fn();

jest.mock('@/object-record/hooks/useObjectRecordSearchRecords', () => ({
  useObjectRecordSearchRecords: () => ({
    searchRecords: mockSearchRecords(),
    loading: false,
  }),
}));

jest.mock('@/object-record/hooks/useCreateOneRecord', () => ({
  useCreateOneRecord: () => ({ createOneRecord: mockCreateOneRecord }),
}));

describe('LeadStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onPicked with a search result when clicked', () => {
    mockSearchRecords.mockReturnValue([
      {
        recordId: 'company-1',
        label: 'Klinika Uroda',
        objectNameSingular: 'company',
        objectLabelSingular: 'Company',
        tsRank: 0,
        tsRankCD: 0,
      },
    ]);
    const onPicked = jest.fn();

    render(<LeadStep onPicked={onPicked} />);
    fireEvent.change(
      screen.getByPlaceholderText('Klinika - zacznij pisać nazwę'),
      {
        target: { value: 'Uroda' },
      },
    );
    fireEvent.click(screen.getByText('Klinika Uroda'));

    expect(onPicked).toHaveBeenCalledWith({
      id: 'company-1',
      name: 'Klinika Uroda',
    });
  });

  it('creates a new company and calls onPicked with it', async () => {
    mockSearchRecords.mockReturnValue([]);
    mockCreateOneRecord.mockResolvedValue({
      id: 'company-new',
      name: 'Nowa Klinika',
    });
    const onPicked = jest.fn();

    render(<LeadStep onPicked={onPicked} />);
    fireEvent.click(screen.getByText('Nowa klinika'));
    fireEvent.change(screen.getByLabelText('Nazwa'), {
      target: { value: 'Nowa Klinika' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'kontakt@nowaklinika.pl' },
    });
    fireEvent.change(screen.getByLabelText('Telefon'), {
      target: { value: '+48123456789' },
    });
    fireEvent.click(screen.getByText('Zapisz klinikę'));

    await waitFor(() =>
      expect(onPicked).toHaveBeenCalledWith({
        id: 'company-new',
        name: 'Nowa Klinika',
        email: 'kontakt@nowaklinika.pl',
      }),
    );
    expect(mockCreateOneRecord).toHaveBeenCalledWith({
      name: 'Nowa Klinika',
      leadEmails: { primaryEmail: 'kontakt@nowaklinika.pl' },
      leadPhones: { primaryPhoneNumber: '+48123456789' },
    });
  });

  it('shows an error and re-enables the button when creation fails, without calling onPicked', async () => {
    mockSearchRecords.mockReturnValue([]);
    mockCreateOneRecord.mockRejectedValue(new Error('network down'));
    const onPicked = jest.fn();

    render(<LeadStep onPicked={onPicked} />);
    fireEvent.click(screen.getByText('Nowa klinika'));
    fireEvent.change(screen.getByLabelText('Nazwa'), {
      target: { value: 'Nowa Klinika' },
    });
    fireEvent.click(screen.getByText('Zapisz klinikę'));

    await waitFor(() =>
      expect(
        screen.getByText('Nie udało się zapisać kliniki. Spróbuj ponownie.'),
      ).toBeInTheDocument(),
    );
    expect(onPicked).not.toHaveBeenCalled();
    expect(screen.getByText('Zapisz klinikę')).not.toBeDisabled();
  });

  it('disables the submit button and guards against double submission while a request is in flight', async () => {
    mockSearchRecords.mockReturnValue([]);
    let resolveCreate: (value: { id: string; name: string }) => void;
    mockCreateOneRecord.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    const onPicked = jest.fn();

    render(<LeadStep onPicked={onPicked} />);
    fireEvent.click(screen.getByText('Nowa klinika'));
    fireEvent.change(screen.getByLabelText('Nazwa'), {
      target: { value: 'Nowa Klinika' },
    });

    fireEvent.click(screen.getByText('Zapisz klinikę'));
    fireEvent.click(screen.getByText('Zapisywanie...'));

    expect(screen.getByText('Zapisywanie...')).toBeDisabled();
    expect(mockCreateOneRecord).toHaveBeenCalledTimes(1);

    resolveCreate!({ id: 'company-new', name: 'Nowa Klinika' });
    await waitFor(() => expect(onPicked).toHaveBeenCalledTimes(1));
  });
});

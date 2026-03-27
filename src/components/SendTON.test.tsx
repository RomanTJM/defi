// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

afterEach(cleanup);
import SendTON from './SendTON';

vi.mock('../services/ton', () => ({
  getWalletContract: vi.fn(() => ({
    address: { toString: () => 'UQDmocksendaddress1234testnet' },
  })),
  fetchTransactions: vi.fn(async () => []),
  sendTon: vi.fn(async () => true),
  estimateTransferFee: vi.fn(async () => ({ formatted: '0.0042', isExact: true })),
}));

vi.mock('../services/security', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/security')>();
  return {
    ...actual,
    // isAddressValid и checkAddressSpoofing оставляем реальными
  };
});

const mockKeyPair = {
  publicKey: Buffer.alloc(32),
  secretKey: Buffer.alloc(64),
};

const VALID_ADDRESS = 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t';

describe('SendTON', () => {
  const onBack = vi.fn();

  beforeEach(() => {
    onBack.mockClear();
  });

  it('отображает форму отправки с полями адреса и суммы', async () => {
    render(<SendTON keyPair={mockKeyPair} onBack={onBack} />);
    expect(screen.getByPlaceholderText('UQ...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
  });

  it('кнопка "Далее" заблокирована при пустых полях', () => {
    render(<SendTON keyPair={mockKeyPair} onBack={onBack} />);
    expect(screen.getByRole('button', { name: /далее/i })).toBeDisabled();
  });

  it('кнопка "Далее" активна при заполненных полях', () => {
    render(<SendTON keyPair={mockKeyPair} onBack={onBack} />);
    fireEvent.change(screen.getByPlaceholderText('UQ...'), { target: { value: VALID_ADDRESS } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '1' } });
    expect(screen.getByRole('button', { name: /далее/i })).not.toBeDisabled();
  });

  it('показывает ошибку при невалидном адресе и клике "Далее"', () => {
    render(<SendTON keyPair={mockKeyPair} onBack={onBack} />);
    fireEvent.change(screen.getByPlaceholderText('UQ...'), { target: { value: 'not_valid' } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /далее/i }));
    expect(screen.getByText(/неверный формат адреса/i)).toBeInTheDocument();
  });

  it('показывает ошибку при нулевой сумме и клике "Далее"', () => {
    render(<SendTON keyPair={mockKeyPair} onBack={onBack} />);
    fireEvent.change(screen.getByPlaceholderText('UQ...'), { target: { value: VALID_ADDRESS } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /далее/i }));
    expect(screen.getByText(/неверная сумма/i)).toBeInTheDocument();
  });

  it('переходит на экран подтверждения при валидных данных', () => {
    render(<SendTON keyPair={mockKeyPair} onBack={onBack} />);
    fireEvent.change(screen.getByPlaceholderText('UQ...'), { target: { value: VALID_ADDRESS } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '2.5' } });
    fireEvent.click(screen.getByRole('button', { name: /далее/i }));
    expect(screen.getByText(/подтвердите отправку/i)).toBeInTheDocument();
    expect(screen.getByText(VALID_ADDRESS)).toBeInTheDocument();
    expect(screen.getByText('2.5')).toBeInTheDocument();
  });

  it('экран подтверждения содержит кнопки "Подтвердить" и "Отменить"', () => {
    render(<SendTON keyPair={mockKeyPair} onBack={onBack} />);
    fireEvent.change(screen.getByPlaceholderText('UQ...'), { target: { value: VALID_ADDRESS } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /далее/i }));
    expect(screen.getByRole('button', { name: /подтвердить отправку/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /отменить/i })).toBeInTheDocument();
  });

  it('отображает комиссию сети на экране подтверждения', async () => {
    render(<SendTON keyPair={mockKeyPair} onBack={onBack} />);
    fireEvent.change(screen.getByPlaceholderText('UQ...'), { target: { value: VALID_ADDRESS } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /далее/i }));
    // Сначала может быть "Расчёт...", потом появится значение
    await waitFor(() => {
      expect(screen.getByText('0.0042')).toBeInTheDocument();
    });
  });

  it('"Отменить" на экране подтверждения возвращает к форме', () => {
    render(<SendTON keyPair={mockKeyPair} onBack={onBack} />);
    fireEvent.change(screen.getByPlaceholderText('UQ...'), { target: { value: VALID_ADDRESS } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /далее/i }));
    fireEvent.click(screen.getByRole('button', { name: /отменить/i }));
    expect(screen.getByPlaceholderText('UQ...')).toBeInTheDocument();
  });

  it('успешная отправка показывает success-сообщение', async () => {
    render(<SendTON keyPair={mockKeyPair} onBack={onBack} />);
    fireEvent.change(screen.getByPlaceholderText('UQ...'), { target: { value: VALID_ADDRESS } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /далее/i }));
    fireEvent.click(screen.getByRole('button', { name: /подтвердить отправку/i }));
    await waitFor(() => {
      expect(screen.getByText(/успешно отправлена/i)).toBeInTheDocument();
    });
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

afterEach(cleanup);
import Dashboard from './Dashboard';

const MOCK_ADDRESS = 'UQDmockdashboardaddress1234testnet';
const MOCK_BALANCE = '3.14';

vi.mock('../services/ton', () => ({
  getWalletContract: vi.fn(() => ({
    address: { toString: () => MOCK_ADDRESS },
  })),
  fetchBalance: vi.fn(async () => MOCK_BALANCE),
  fetchTransactions: vi.fn(async () => []),
}));

const mockKeyPair = {
  publicKey: Buffer.alloc(32),
  secretKey: Buffer.alloc(64),
};

describe('Dashboard', () => {
  const props = {
    keyPair: mockKeyPair,
    onSend: vi.fn(),
    onReceive: vi.fn(),
    onLogout: vi.fn(),
  };

  beforeEach(() => {
    Object.values(props).forEach(fn => typeof fn === 'function' && fn.mockClear?.());
  });

  it('показывает индикатор загрузки сразу после маунта', () => {
    render(<Dashboard {...props} />);
    // Баланс отображается как '...' пока идёт загрузка
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('отображает баланс после загрузки', async () => {
    render(<Dashboard {...props} />);
    await waitFor(() => {
      expect(screen.getByText(MOCK_BALANCE)).toBeInTheDocument();
    });
  });

  it('отображает адрес кошелька после загрузки', async () => {
    render(<Dashboard {...props} />);
    await waitFor(() => {
      expect(screen.getByText(MOCK_ADDRESS)).toBeInTheDocument();
    });
  });

  it('показывает пустое состояние когда транзакций нет', async () => {
    render(<Dashboard {...props} />);
    await waitFor(() => {
      expect(screen.getByText('Транзакций пока нет')).toBeInTheDocument();
    });
  });

  it('содержит кнопки "Отправить" и "Получить"', async () => {
    render(<Dashboard {...props} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /отправить/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /получить/i })).toBeInTheDocument();
    });
  });

  it('поле поиска фильтрует пустой список без ошибок', async () => {
    render(<Dashboard {...props} />);
    await waitFor(() => screen.getByPlaceholderText(/поиск/i));
    // Просто проверяем что поле присутствует и компонент не падает
    expect(screen.getByPlaceholderText(/поиск/i)).toBeInTheDocument();
  });
});

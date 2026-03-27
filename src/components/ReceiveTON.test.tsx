// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

afterEach(cleanup);
import ReceiveTON from './ReceiveTON';

const MOCK_ADDRESS = 'UQDmockaddress1234567890testnet';

vi.mock('../services/ton', () => ({
  getWalletContract: vi.fn(() => ({
    address: { toString: () => MOCK_ADDRESS },
  })),
}));

const mockKeyPair = {
  publicKey: Buffer.alloc(32),
  secretKey: Buffer.alloc(64),
};

describe('ReceiveTON', () => {
  const onBack = vi.fn();

  beforeEach(() => {
    onBack.mockClear();
  });

  it('отображает адрес кошелька', () => {
    render(<ReceiveTON keyPair={mockKeyPair} onBack={onBack} />);
    expect(screen.getAllByText(MOCK_ADDRESS).length).toBeGreaterThan(0);
  });

  it('отображает кнопку копирования адреса', () => {
    render(<ReceiveTON keyPair={mockKeyPair} onBack={onBack} />);
    expect(screen.getByRole('button', { name: /копировать адрес/i })).toBeInTheDocument();
  });

  it('кнопка "Назад" вызывает onBack', () => {
    render(<ReceiveTON keyPair={mockKeyPair} onBack={onBack} />);
    fireEvent.click(screen.getByTitle('Назад'));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('показывает QR-блок (img или placeholder)', () => {
    render(<ReceiveTON keyPair={mockKeyPair} onBack={onBack} />);
    const img = screen.queryByRole('img', { name: /qr/i });
    // QR либо загружен как img, либо показывается placeholder — в любом случае не падает
    expect(img || screen.queryByText(/загрузка qr/i)).toBeTruthy();
  });

  it('отображает предупреждение об использовании Testnet', () => {
    render(<ReceiveTON keyPair={mockKeyPair} onBack={onBack} />);
    expect(screen.getByText(/Testnet TON/i)).toBeInTheDocument();
  });
});

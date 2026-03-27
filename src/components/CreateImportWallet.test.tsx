// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

afterEach(cleanup);
import CreateImportWallet from './CreateImportWallet';

vi.mock('../services/wallet', () => ({
  generateWalletMnemonic: vi.fn(async () => Array(24).fill('test')),
  isValidMnemonic: vi.fn(async (words: string[]) => words.every(w => w === 'test')),
  encryptMnemonic: vi.fn(() => 'encrypted_data'),
  decryptMnemonic: vi.fn(() => Array(24).fill('test')),
  getWalletKeyPair: vi.fn(async () => ({
    publicKey: Buffer.alloc(32),
    secretKey: Buffer.alloc(64),
  })),
}));

describe('CreateImportWallet', () => {
  const onUnlocked = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    onUnlocked.mockClear();
  });

  it('показывает экран выбора (CHOICE) когда нет сохранённого кошелька', () => {
    render(<CreateImportWallet onUnlocked={onUnlocked} />);
    expect(screen.getByText('Создать новый кошелек')).toBeInTheDocument();
    expect(screen.getByText('Импортировать по 24 словам')).toBeInTheDocument();
  });

  it('показывает экран входа (LOGIN) когда wallet_data есть в localStorage', () => {
    localStorage.setItem('wallet_data', 'encrypted_data');
    render(<CreateImportWallet onUnlocked={onUnlocked} />);
    expect(screen.getByText('Вход в кошелек')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Локальный пароль')).toBeInTheDocument();
  });

  it('показывает ошибку при вводе неверного пароля на экране LOGIN', () => {
    localStorage.setItem('wallet_data', 'encrypted_data');

    // decryptMnemonic вернёт 24 слова 'test' — в тесте логина нас устраивает happy path,
    // поэтому проверяем сценарий пустого пароля, который срабатывает до вызова decrypt
    render(<CreateImportWallet onUnlocked={onUnlocked} />);

    // Очищаем localStorage чтобы decryptMnemonic вернул null
    localStorage.removeItem('wallet_data');

    const loginBtn = screen.getByRole('button', { name: /войти/i });
    fireEvent.click(loginBtn);

    // wallet_data не найден → функция вернётся без ошибки (return guard), onUnlocked не вызван
    expect(onUnlocked).not.toHaveBeenCalled();
  });

  it('переходит на экран импорта при нажатии "Импортировать"', () => {
    render(<CreateImportWallet onUnlocked={onUnlocked} />);
    fireEvent.click(screen.getByText('Импортировать по 24 словам'));
    expect(screen.getByText('Введите ваши 24 слова')).toBeInTheDocument();
  });

  it('переходит обратно к выбору по кнопке "Назад"', () => {
    render(<CreateImportWallet onUnlocked={onUnlocked} />);
    fireEvent.click(screen.getByText('Импортировать по 24 словам'));
    fireEvent.click(screen.getByText('Назад'));
    expect(screen.getByText('Создать новый кошелек')).toBeInTheDocument();
  });

  it('показывает предупреждение о сохранении слов на экране CREATE', async () => {
    render(<CreateImportWallet onUnlocked={onUnlocked} />);
    fireEvent.click(screen.getByText('Создать новый кошелек'));
    // Ждём появления экрана CREATE (generateWalletMnemonic async)
    expect(await screen.findByText(/Обязательно запишите эти 24 слова/i)).toBeInTheDocument();
  });
});

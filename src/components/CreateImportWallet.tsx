import { useState, useEffect } from 'react';
import { generateWalletMnemonic, isValidMnemonic, encryptMnemonic, decryptMnemonic } from '../services/wallet';

interface Props {
  onUnlocked: (mnemonic: string[]) => void;
}

export default function CreateImportWallet({ onUnlocked }: Props) {
  const [mode, setMode] = useState<'LOGIN' | 'CREATE' | 'IMPORT' | 'CHOICE'>('CHOICE');
  const [words, setWords] = useState<string[]>(Array(24).fill(''));
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('wallet_data');
    if (stored) {
      setMode('LOGIN');
    }
  }, []);

  const handleCreateNew = async () => {
    setIsLoading(true);
    try {
      const generated = await generateWalletMnemonic();
      setWords(generated);
      setMode('CREATE');
    } catch {
      setError('Ошибка при генерации кошелька');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = () => {
    setWords(Array(24).fill(''));
    setMode('IMPORT');
  };

  const handleWordChange = (index: number, value: string) => {
    const newWords = [...words];
    newWords[index] = value.trim().toLowerCase();
    setWords(newWords);
    setError('');
  };

  const handleSaveAndUnlock = async () => {
    if (password.length < 4) {
      setError('Пароль должен содержать минимум 4 символа');
      return;
    }

    setIsLoading(true);
    const valid = await isValidMnemonic(words);
    setIsLoading(false);

    if (!valid) {
      setError('Неверная seed-фраза. Проверьте правильность всех 24 слов.');
      return;
    }

    const encrypted = encryptMnemonic(words, password);
    localStorage.setItem('wallet_data', encrypted);
    onUnlocked(words);
  };

  const handleLogin = () => {
    const stored = localStorage.getItem('wallet_data');
    if (!stored) return;

    const decrypted = decryptMnemonic(stored, password);
    if (!decrypted || decrypted.length !== 24) {
      setError('Неверный пароль или данные повреждены');
      return;
    }

    onUnlocked(decrypted);
  };

  const handleClearWallet = () => {
    if (window.confirm("Вы уверены? Если у вас нет копии 24 слов, вы навсегда потеряете доступ к кошельку.")) {
      localStorage.removeItem('wallet_data');
      setMode('CHOICE');
      setPassword('');
      setError('');
    }
  }

  if (mode === 'LOGIN') {
    return (
      <form className="container" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
        <h2>Вход в кошелек</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Введите ваш локальный пароль</p>

        {error && <div className="error-box">{error}</div>}

        {/* Скрытое поле username устраняет предупреждение браузера об accessibility в формах с паролем */}
        <input type="text" name="username" autoComplete="username" aria-hidden="true" style={{ display: 'none' }} readOnly />

        <label className="label">Пароль</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Локальный пароль"
          autoComplete="current-password"
        />

        <button type="submit">Войти</button>
        <button type="button" className="secondary danger" style={{ marginTop: 'auto' }} onClick={handleClearWallet}>Сбросить кошелек</button>
      </form>
    );
  }

  if (mode === 'CHOICE') {
    return (
      <div className="container" style={{ justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ color: 'var(--primary-color)', fontSize: 32, marginBottom: 8 }}>TON Wallet</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Testnet web-клиент</p>
        </div>

        <button onClick={handleCreateNew} disabled={isLoading}>
          {isLoading ? 'Генерация...' : 'Создать новый кошелек'}
        </button>
        <button className="secondary" onClick={handleImport}>
          Импортировать по 24 словам
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>{mode === 'CREATE' ? 'Сохраните ваши 24 слова' : 'Введите ваши 24 слова'}</h2>

      {mode === 'CREATE' && (
        <div className="warning-box">
          Обязательно запишите эти 24 слова в надежном месте. Если вы их потеряете, вы не сможете восстановить доступ к средствам!
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      <div className="word-grid">
        {words.map((word, i) => (
          <div className="word-item" key={i}>
            <span className="word-index">{i + 1}</span>
            <input
              style={{ margin: 0, padding: '4px 4px 4px 20px', border: 'none', backgroundColor: 'transparent', textAlign: 'center' }}
              value={word}
              readOnly={mode === 'CREATE'}
              onChange={(e) => handleWordChange(i, e.target.value)}
            />
          </div>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSaveAndUnlock(); }}>
        {/* Скрытое поле username устраняет предупреждение браузера об accessibility в формах с паролем */}
        <input type="text" name="username" autoComplete="username" aria-hidden="true" style={{ display: 'none' }} readOnly />
        <div style={{ marginTop: 24, marginBottom: 24 }}>
          <label className="label">Задайте локальный пароль для быстрого входа</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Минимум 4 символа"
            autoComplete="new-password"
          />
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Проверка...' : 'Продолжить'}
        </button>
        <button type="button" className="secondary" onClick={() => setMode('CHOICE')}>
          Назад
        </button>
      </form>
    </div>
  );
}

import { useState, useEffect } from 'react';
import CreateImportWallet from './components/CreateImportWallet';
import Dashboard from './components/Dashboard';
import SendTON from './components/SendTON';
import ReceiveTON from './components/ReceiveTON';
import type { KeyPair } from '@ton/crypto';
import { getWalletKeyPair } from './services/wallet';

export type AppView = 'INIT' | 'DASHBOARD' | 'SEND' | 'RECEIVE';

function App() {
  const [view, setView] = useState<AppView>('INIT');
  const [mnemonic, setMnemonic] = useState<string[] | null>(null);
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);

  useEffect(() => {
    async function loadKeys() {
      if (mnemonic) {
        const kp = await getWalletKeyPair(mnemonic);
        setKeyPair(kp);
      }
    }
    loadKeys();
  }, [mnemonic]);

  const handleWalletUnlocked = (phrase: string[]) => {
    setMnemonic(phrase);
    setView('DASHBOARD');
  };

  const logout = () => {
    setMnemonic(null);
    setKeyPair(null);
    setView('INIT');
  };

  if (view === 'INIT') {
    return <CreateImportWallet onUnlocked={handleWalletUnlocked} />;
  }

  if (!keyPair || !mnemonic) {
    return <div className="loader">Загрузка ключей...</div>;
  }

  return (
    <div className="container" style={{ padding: 0 }}>
      {view === 'DASHBOARD' && (
        <Dashboard 
          keyPair={keyPair} 
          onSend={() => setView('SEND')} 
          onReceive={() => setView('RECEIVE')} 
          onLogout={logout} 
        />
      )}
      {view === 'SEND' && (
        <SendTON 
          keyPair={keyPair} 
          onBack={() => setView('DASHBOARD')} 
        />
      )}
      {view === 'RECEIVE' && (
        <ReceiveTON 
          keyPair={keyPair} 
          onBack={() => setView('DASHBOARD')} 
        />
      )}
    </div>
  );
}

export default App;

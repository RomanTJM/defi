import { useState } from 'react';
import type { KeyPair } from '@ton/crypto';
import { ArrowLeft, Copy, CheckCircle2 } from 'lucide-react';
import { getWalletContract } from '../services/ton';

interface Props {
  keyPair: KeyPair;
  onBack: () => void;
}

export default function ReceiveTON({ keyPair, onBack }: Props) {
  const [copied, setCopied] = useState(false);

  const address = getWalletContract(keyPair).address.toString({ testOnly: true, bounceable: false });

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container">
      <div className="top-bar">
        <button className="back-btn" onClick={onBack} title="Назад">
          <ArrowLeft size={24} />
        </button>
        <h3 style={{ margin: 0, flex: 1, textAlign: 'center' }}>Получить TON</h3>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 32 }}>

        <div style={{ width: 200, height: 200, backgroundColor: 'white', borderRadius: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 32 }}>
          {address ? (
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${address}`}
              alt="QR Code"
              style={{ width: 180, height: 180 }}
            />
          ) : (
            <div style={{ color: 'black' }}>Загрузка QR...</div>
          )}
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 16 }}>
          Отправляйте только Testnet TON на этот адрес.
        </p>

        <div className="address-box" onClick={handleCopy} style={{ width: '100%' }}>
          <div style={{ flex: 1, overflow: 'hidden', textAlign: 'center' }}>
            <div className="address-text" style={{ whiteSpace: 'normal', wordBreak: 'break-all', fontSize: 16, lineHeight: 1.5 }}>
              {address}
            </div>
          </div>
        </div>

        <button onClick={handleCopy} className={copied ? 'secondary' : ''}>
          {copied ? <><CheckCircle2 size={20} /> Адрес скопирован</> : <><Copy size={20} /> Копировать адрес</>}
        </button>
      </div>
    </div>
  );
}

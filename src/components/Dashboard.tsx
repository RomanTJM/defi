import { useState, useEffect, useMemo } from 'react';
import type { KeyPair } from '@ton/crypto';
import { getWalletContract, fetchBalance, fetchTransactions } from '../services/ton';
import type { Transaction } from '@ton/ton';
import { LogOut, Send, Download, Copy, CheckCircle2, History } from 'lucide-react';

interface ParsedTx {
  tx: Transaction;
  isIncoming: boolean;
  amount: string;
  otherAddress: string;
  date: string;
}

interface Props {
  keyPair: KeyPair;
  onSend: () => void;
  onReceive: () => void;
  onLogout: () => void;
}

export default function Dashboard({ keyPair, onSend, onReceive, onLogout }: Props) {
  const [balance, setBalance] = useState<string>('0');
  const [address, setAddress] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      const contract = getWalletContract(keyPair);
      const walletAddress = contract.address.toString({ testOnly: true, bounceable: false });
      setAddress(walletAddress);

      const bal = await fetchBalance(walletAddress);
      setBalance(bal);

      const txs = await fetchTransactions(walletAddress, 20);
      setTransactions(txs);
      setIsLoading(false);
    }
    init();
  }, [keyPair]);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const parsedTransactions = useMemo<ParsedTx[]>(() => {
    return transactions.map(tx => {
      let isIncoming = false;
      let amount = '0';
      let otherAddress = '';

      if (tx.inMessage?.info.type === 'internal') {
        isIncoming = true;
        amount = (Number(tx.inMessage.info.value.coins) / 1e9).toString();
        otherAddress = tx.inMessage.info.src.toString({ testOnly: true, bounceable: false });
      }

      if (!isIncoming && tx.outMessages.size > 0) {
        const firstOut = tx.outMessages.values()[0];
        if (firstOut?.info.type === 'internal') {
          amount = (Number(firstOut.info.value.coins) / 1e9).toString();
          otherAddress = firstOut.info.dest.toString({ testOnly: true, bounceable: false });
        }
      }

      const date = new Date(tx.now * 1000).toLocaleString('ru-RU', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      return { tx, isIncoming, amount, otherAddress, date };
    });
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (!searchQuery) return parsedTransactions;
    const q = searchQuery.toLowerCase();
    return parsedTransactions.filter(({ tx, otherAddress }) =>
      otherAddress.toLowerCase().includes(q) ||
      tx.hash().toString('hex').toLowerCase().includes(q)
    );
  }, [parsedTransactions, searchQuery]);

  return (
    <div className="container" style={{ padding: '24px 16px' }}>
      <header>
        <h3 style={{ margin: 0 }}>Ваш Кошелек (Testnet)</h3>
        <button className="back-btn" onClick={onLogout} title="Выйти">
          <LogOut size={20} />
        </button>
      </header>

      <div className="balance-section">
        <label className="label">Текущий баланс</label>
        <div className="balance-amount">
          {isLoading ? '...' : <>{balance} <span>TON</span></>}
        </div>
      </div>

      <div className="actions">
        <button onClick={onSend}><Send size={20} /> Отправить</button>
        <button className="secondary" onClick={onReceive}><Download size={20} /> Получить</button>
      </div>

      <div className="address-box" onClick={handleCopy}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <label className="label" style={{ marginBottom: 4 }}>Ваш адрес</label>
          <div className="address-text" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {address}
          </div>
        </div>
        <div style={{ paddingLeft: 12, color: copied ? 'var(--success-color)' : 'var(--primary-color)' }}>
          {copied ? <CheckCircle2 size={24} /> : <Copy size={24} />}
        </div>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <History size={16} /> Последние транзакции
        </h4>
      </div>

      <input
        type="text"
        placeholder="Поиск по адресу или хэшу..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ padding: '10px 14px', fontSize: 14 }}
      />

      <div className="transactions-list">
        {isLoading && <div className="loader">Загрузка истории...</div>}

        {!isLoading && filteredTransactions.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px 0' }}>
            {searchQuery ? 'Ничего не найдено' : 'Транзакций пока нет'}
          </div>
        )}

        {filteredTransactions.map(({ isIncoming, amount, otherAddress, date }, idx) => (
          <div className="tx-item" key={idx}>
            <div className="tx-left">
              <div className="tx-icon">
                {isIncoming ? <Download size={20} color="var(--success-color)" /> : <Send size={20} color="var(--text-primary)" />}
              </div>
              <div className="tx-info">
                <h4>{isIncoming ? 'Получено' : 'Отправлено'}</h4>
                <p>{otherAddress ? `${otherAddress.slice(0, 6)}...${otherAddress.slice(-6)}` : '—'}</p>
                <p style={{ fontSize: 10 }}>{date}</p>
              </div>
            </div>
            <div className={`tx-amount ${isIncoming ? 'positive' : ''}`} style={{ fontWeight: 'bold' }}>
              {isIncoming ? '+' : '-'}{amount} TON
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

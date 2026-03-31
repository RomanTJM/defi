import { useState, useEffect } from 'react';
import type { KeyPair } from '@ton/crypto';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { sendTon, fetchTransactions, getWalletContract, estimateTransferFee } from '../services/ton';
import { checkAddressSpoofing, isAddressValid } from '../services/security';

interface Props {
  keyPair: KeyPair;
  onBack: () => void;
}

type Step = 'FORM' | 'CONFIRM';

export default function SendTON({ keyPair, onBack }: Props) {
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [step, setStep] = useState<Step>('FORM');

  const [warningMsg, setWarningMsg] = useState('');
  const [isSpoofed, setIsSpoofed] = useState(false);
  const [historyAddresses, setHistoryAddresses] = useState<string[]>([]);
  const [fee, setFee] = useState<string | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeExact, setFeeExact] = useState(true);

  useEffect(() => {
    if (step !== 'CONFIRM') return;
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) return;

    let cancelled = false;

    const fetchFee = async () => {
      setFeeLoading(true);
      setFee(null);
      try {
        const { formatted, isExact } = await estimateTransferFee(keyPair, toAddress, numAmount.toString());
        if (!cancelled) {
          setFee(formatted);
          setFeeExact(isExact);
        }
      } finally {
        if (!cancelled) setFeeLoading(false);
      }
    };

    fetchFee();
    return () => { cancelled = true; };
  }, [step, amount, toAddress, keyPair]);

  useEffect(() => {
    async function loadHistory() {
      const contract = getWalletContract(keyPair);
      const walletAddress = contract.address.toString({ testOnly: true, bounceable: false });
      const txs = await fetchTransactions(walletAddress, 50);

      const addresses = new Set<string>();
      txs.forEach(tx => {
        if (tx.outMessages.size > 0) {
          const firstOut = tx.outMessages.values()[0];
          if (firstOut?.info.type === 'internal') {
            addresses.add(firstOut.info.dest.toString({ testOnly: true, bounceable: false }));
          }
        }
        if (tx.inMessage?.info.type === 'internal') {
          addresses.add(tx.inMessage.info.src.toString({ testOnly: true, bounceable: false }));
        }
      });
      setHistoryAddresses(Array.from(addresses));
    }
    loadHistory();
  }, [keyPair]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const addr = e.target.value;
    setToAddress(addr);

    if (addr.length > 20) {
      const spoofCheck = checkAddressSpoofing(addr, historyAddresses);
      setWarningMsg(spoofCheck.message);
      setIsSpoofed(spoofCheck.isSpoofed);
    } else {
      setWarningMsg('');
      setIsSpoofed(false);
    }
  };

  const handleProceedToConfirm = () => {
    if (!isAddressValid(toAddress)) {
      setStatusMsg('Неверный формат адреса!');
      return;
    }
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      setStatusMsg('Неверная сумма!');
      return;
    }
    setStatusMsg('');
    setStep('CONFIRM');
  };

  const handleConfirmSend = async () => {
    setIsLoading(true);
    setStatusMsg('');

    const numAmount = parseFloat(amount.replace(',', '.'));
    const success = await sendTon(keyPair, toAddress, numAmount.toString());

    if (success) {
      setIsSuccess(true);
      setStatusMsg('Транзакция успешно отправлена! Сеть обновит баланс в течение нескольких секунд.');
      setToAddress('');
      setAmount('');
      setStep('FORM');
    } else {
      setIsSuccess(false);
      setStatusMsg('Произошла ошибка при отправке транзакции.');
      setStep('FORM');
    }
    setIsLoading(false);
  };

  const renderSpoofWarning = () => {
    if (!isSpoofed || toAddress.length < 10) return null;
    const start = toAddress.substring(0, 5);
    const end = toAddress.slice(-5);
    const mid = toAddress.substring(5, toAddress.length - 5);
    return (
      <div className="warning-box" style={{ flexDirection: 'column' }}>
        <strong>ВНИМАНИЕ! ВОЗМОЖЕН ADDRESS SPOOFING!</strong>
        <p>{warningMsg}</p>
        <div style={{ marginTop: 8, background: 'var(--bg-color)', padding: 8, borderRadius: 8, textAlign: 'center' }}>
          <span className="spoofed-start">{start}</span>
          <span className="spoofed-mid">{mid}</span>
          <span className="spoofed-end">{end}</span>
        </div>
        <p style={{ fontSize: 12, marginTop: 8 }}>
          Красная часть отличается от известного контакта. Проверяйте ВЕСЬ адрес, не только начало и конец.
        </p>
      </div>
    );
  };

  if (step === 'CONFIRM') {
    const numAmount = parseFloat(amount.replace(',', '.'));
    return (
      <div className="container">
        <div className="top-bar">
          <button className="back-btn" onClick={() => setStep('FORM')} title="Назад">
            <ArrowLeft size={24} />
          </button>
          <h3 style={{ margin: 0, flex: 1, textAlign: 'center' }}>Подтвердите отправку</h3>
          <div style={{ width: 40 }} />
        </div>

        <div style={{ background: 'var(--bg-color)', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid var(--border-color)' }}>
          <p className="label" style={{ marginBottom: 4 }}>Получатель</p>
          <p style={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: 14, margin: 0 }}>{toAddress}</p>
        </div>

        <div style={{ background: 'var(--bg-color)', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid var(--border-color)' }}>
          <p className="label" style={{ marginBottom: 4 }}>Сумма</p>
          <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{numAmount} <span style={{ fontSize: 16, color: 'var(--text-secondary)' }}>TON</span></p>
        </div>

        <div style={{ background: 'var(--bg-color)', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid var(--border-color)' }}>
          <p className="label" style={{ marginBottom: 4 }}>Комиссия сети</p>
          {feeLoading ? (
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>Расчёт...</p>
          ) : (
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              {fee ?? '≈0.005'}{' '}
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>TON</span>
              {!feeExact && (
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 6 }}>
                  (приблизительно)
                </span>
              )}
            </p>
          )}
        </div>

        {isSpoofed && (
          <div className="warning-box" style={{ flexDirection: 'column', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} />
              <strong>Адрес подозрителен!</strong>
            </div>
            <p style={{ fontSize: 13, margin: '8px 0 0' }}>{warningMsg}</p>
          </div>
        )}

        {!isSpoofed && warningMsg && (
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>{warningMsg}</p>
        )}

        <button
          onClick={handleConfirmSend}
          disabled={isLoading}
          className={isSpoofed ? 'danger' : ''}
        >
          {isLoading ? 'Отправка...' : isSpoofed ? 'Всё равно отправить' : 'Подтвердить отправку'}
        </button>
        <button className="secondary" onClick={() => setStep('FORM')} disabled={isLoading}>
          Отменить
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="top-bar">
        <button className="back-btn" onClick={onBack} title="Назад">
          <ArrowLeft size={24} />
        </button>
        <h3 style={{ margin: 0, flex: 1, textAlign: 'center' }}>Отправить TON</h3>
        <div style={{ width: 40 }} />
      </div>

      {statusMsg && (
        <div className={isSuccess ? 'success-box' : 'error-box'}>
          {statusMsg}
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <label className="label">Адрес получателя (Testnet)</label>
        <input
          type="text"
          placeholder="UQ..."
          value={toAddress}
          onChange={handleAddressChange}
        />
        {renderSpoofWarning()}
        {!isSpoofed && warningMsg && toAddress.length > 20 && (
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: -8 }}>
            {warningMsg}
          </p>
        )}
      </div>

      <div style={{ marginBottom: 24 }}>
        <label className="label">Сумма (TON)</label>
        <input
          type="number"
          placeholder="0.00"
          min="0"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <button
        onClick={handleProceedToConfirm}
        disabled={!toAddress || !amount}
      >
        Далее
      </button>
    </div>
  );
}

import { TonClient, WalletContractV4, internal, fromNano, toNano, SendMode, Address, type Transaction } from '@ton/ton';
import type { KeyPair } from '@ton/crypto';
import { getHttpEndpoint } from '@orbs-network/ton-access';

let clientInstance: TonClient | null = null;

export async function getTonClient(): Promise<TonClient> {
    if (!clientInstance) {
        const endpoint = await getHttpEndpoint({ network: 'testnet' });
        clientInstance = new TonClient({ endpoint });
    }
    return clientInstance;
}

export function getWalletContract(keyPair: KeyPair) {
    const workchain = 0;
    return WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
let _apiQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const result = _apiQueue.then(() => fn()).then(async (res) => {
        await sleep(1100);
        return res;
    });
    _apiQueue = result.catch(() => { });
    return result;
}

/** Сбрасывает кешированный клиент. Следующий вызов getTonClient() получит новый эндпоинт от Orbs. */
function invalidateClient(): void {
    clientInstance = null;
}

export async function fetchBalance(addressStr: string): Promise<string> {
    return enqueue(async () => {
        const client = await getTonClient();
        try {
            const address = Address.parse(addressStr);
            const balance = await client.getBalance(address);
            return fromNano(balance);
        } catch (e) {
            invalidateClient();
            console.error('Ошибка получения баланса', e);
            return '0';
        }
    });
}

export async function fetchTransactions(addressStr: string, limit: number = 20): Promise<Transaction[]> {
    return enqueue(async () => {
        const client = await getTonClient();
        try {
            const address = Address.parse(addressStr);
            const transactions = await client.getTransactions(address, { limit });
            return transactions;
        } catch (e) {
            invalidateClient();
            console.error('Ошибка получения транзакций', e);
            return [];
        }
    });
}

export interface FeeEstimate {
    /** Итоговая комиссия в TON (строка). Если запрос к ноде упал — fallback '~0.005'. */
    formatted: string;
    /** true — реальная оценка с ноды; false — статический fallback */
    isExact: boolean;
}

export async function estimateTransferFee(
    keyPair: KeyPair,
    toAddressStr: string,
    amountStr: string,
): Promise<FeeEstimate> {
    return enqueue(async () => {
        try {
            const client = await getTonClient();
            const wallet = getWalletContract(keyPair);
            const walletContract = client.open(wallet);

            const seqno = await walletContract.getSeqno();
            const toAddress = Address.parse(toAddressStr);
            const amount = toNano(amountStr);

            // Создаём transfer с dummy-ключом. ignoreSignature=true — нода не проверяет подпись.
            const dummySecretKey = Buffer.alloc(64);
            const transferCell = wallet.createTransfer({
                seqno,
                secretKey: dummySecretKey,
                messages: [internal({ to: toAddress, value: amount, bounce: false })],
                sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
            });

            const result = await client.estimateExternalMessageFee(wallet.address, {
                body: transferCell,
                initCode: null,
                initData: null,
                ignoreSignature: true,
            });

            const { in_fwd_fee, storage_fee, gas_fee, fwd_fee } = result.source_fees;
            const totalNano = in_fwd_fee + storage_fee + gas_fee + fwd_fee;
            return { formatted: fromNano(totalNano), isExact: true };
        } catch (e) {
            invalidateClient();
            console.warn('Не удалось получить оценку комиссии, используется fallback', e);
            return { formatted: '≈0.005', isExact: false };
        }
    });
}

export async function sendTon(keyPair: KeyPair, toAddressStr: string, amountStr: string): Promise<boolean> {
    try {
        const client = await getTonClient();
        const wallet = getWalletContract(keyPair);
        const walletContract = client.open(wallet);

        const seqno = await walletContract.getSeqno();

        const toAddress = Address.parse(toAddressStr);
        const amount = toNano(amountStr);

        await walletContract.sendTransfer({
            secretKey: keyPair.secretKey,
            seqno: seqno,
            messages: [
                internal({
                    to: toAddress,
                    value: amount,
                    body: 'Test transaction from Web Wallet',
                    bounce: false,
                })
            ],
            sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS
        });

        return true;
    } catch (e) {
        invalidateClient();
        console.error('Ошибка отправки TON', e);
        return false;
    }
}

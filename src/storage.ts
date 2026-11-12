import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeWallet, type Wallet } from './wallet';

const KEY = 'twist21.wallet.v1';

export async function loadWallet(): Promise<Wallet> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return normalizeWallet(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeWallet(null);
  }
}

/** Throws if the write fails, so callers never finish a consumable they could not record. */
export async function saveWallet(w: Wallet): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(w));
}

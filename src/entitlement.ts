import AsyncStorage from '@react-native-async-storage/async-storage';

import { PRODUCT_ID } from './config';

const KEY = '@twist21_premium_v1';

type Stored = {
  productId: string;
  updatedAt: number;
};

/** True after a verified StoreKit purchase or restore has been saved on this device. */
export async function loadOwned(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as Stored;
    return parsed.productId === PRODUCT_ID;
  } catch {
    return false;
  }
}

export async function saveOwned(): Promise<void> {
  const value: Stored = { productId: PRODUCT_ID, updatedAt: Date.now() };
  await AsyncStorage.setItem(KEY, JSON.stringify(value));
}

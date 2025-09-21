import * as SecureStore from 'expo-secure-store';

const MASTER_KEY_ID = 'flicksy.master_key_hex';

export async function getOrCreateMasterKey(getRandomKeyHex: () => Promise<string>): Promise<string> {
  const existing = await SecureStore.getItemAsync(MASTER_KEY_ID);
  if (existing) {
    return existing;
  }
  const newKey = await getRandomKeyHex();
  await SecureStore.setItemAsync(MASTER_KEY_ID, newKey, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return newKey;
}



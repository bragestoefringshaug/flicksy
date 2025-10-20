import { auth } from './firebase';
import { getApiKey, storeApiKey } from './firebaseDb';

/**
 * Store an API key for the current user
 */
export async function storeEncryptedApiKey(serviceName: string, apiKeyPlaintext: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to store API keys');
  }
  
  await storeApiKey(user.uid, serviceName, apiKeyPlaintext);
}

/**
 * Retrieve an API key for the current user
 */
export async function retrieveDecryptedApiKey(serviceName: string): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  
  return await getApiKey(user.uid, serviceName);
}



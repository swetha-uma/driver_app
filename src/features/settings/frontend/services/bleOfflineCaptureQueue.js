import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  BLE_MAX_OFFLINE_QUEUE,
  BLE_OFFLINE_QUEUE_STORAGE_KEY,
} from '../constants/bleGatewayDefaults';
import { postBleCaptureToSchoolServer, shouldEnqueueBleCaptureOffline } from './bleCaptureUploadApi';

/** Read the offline capture queue from AsyncStorage. */
async function readBleOfflineCaptureQueue() {
  try {
    const rawJson = await AsyncStorage.getItem(BLE_OFFLINE_QUEUE_STORAGE_KEY);
    if (!rawJson) return [];
    const parsedItems = JSON.parse(rawJson);
    return Array.isArray(parsedItems) ? parsedItems : [];
  } catch {
    // Why: corrupt queue should not block new captures — start empty.
    return [];
  }
}

/** Persist the offline capture queue. */
async function writeBleOfflineCaptureQueue(queueItems) {
  await AsyncStorage.setItem(BLE_OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(queueItems));
}

/** Add one failed capture for later retry (transport / 5xx only). */
export async function enqueueBleCaptureForOfflineRetry(capturePayload) {
  const existingItems = await readBleOfflineCaptureQueue();
  const queueItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    payload: capturePayload,
    attempts: 0,
  };
  // Why: newest first in storage, but flush processes oldest first.
  const nextItems = [queueItem, ...existingItems].slice(0, BLE_MAX_OFFLINE_QUEUE);
  await writeBleOfflineCaptureQueue(nextItems);
  return queueItem;
}

/** Return how many captures are waiting to flush. */
export async function getBleOfflineCaptureQueueSize() {
  return (await readBleOfflineCaptureQueue()).length;
}

/** Replay queued captures oldest-first; drop permanent 4xx mapping errors. */
export async function flushBleOfflineCaptureQueue(gatewaySettings) {
  const queuedItems = await readBleOfflineCaptureQueue();
  if (queuedItems.length === 0) return { sent: 0, remaining: 0 };

  const remainingItems = [];
  let sentCount = 0;

  // Why: reverse so oldest (end of newest-first array) is sent first.
  const oldestFirstItems = [...queuedItems].reverse();
  for (const queueItem of oldestFirstItems) {
    const uploadResult = await postBleCaptureToSchoolServer(gatewaySettings, queueItem.payload);
    if (uploadResult.ok) {
      sentCount += 1;
    } else if (shouldEnqueueBleCaptureOffline(uploadResult)) {
      remainingItems.push({ ...queueItem, attempts: queueItem.attempts + 1 });
    }
    // Why: drop 4xx — retrying bad GMAC / unmapped UUID will never succeed.
  }

  // Why: store remaining newest-first again for consistent read shape.
  await writeBleOfflineCaptureQueue(remainingItems.reverse());
  return { sent: sentCount, remaining: remainingItems.length };
}

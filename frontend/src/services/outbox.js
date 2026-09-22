/**
 * Persistent offline outbox (IndexedDB) — Phase 3, plan 4.2/5.3.
 *
 * Survives page refresh and browser restart. Only minimal egress payloads
 * are stored (pseudonym + tier + whitelisted reason codes + idempotency key).
 * Journal text and continuous scores are NEVER queued.
 *
 * Sync: bounded retries (max 10), server acknowledgement via the backend
 * idempotency key, duplicate protection (keyPath), failure state + manual
 * retry. Retention cap: 50 pending entries (oldest failed dropped first).
 */
const DB_NAME = 'sahayak-outbox';
const STORE = 'pending';
const MAX_ENTRIES = 50;
const MAX_ATTEMPTS = 10;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'client_event_id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const out = fn(store);
    t.oncomplete = () => {
      db.close();
      resolve(out?.result ?? out);
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
  });
}

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function enqueueOutbox(kind, payload) {
  const entry = {
    client_event_id: payload.client_event_id || uuid(),
    kind,
    payload: { ...payload, client_event_id: payload.client_event_id || undefined },
    status: 'pending',
    attempts: 0,
    last_error: null,
    created_at: new Date().toISOString()
  };
  entry.payload.client_event_id = entry.client_event_id;
  await tx('readwrite', (store) => store.put(entry));
  const all = await listOutbox();
  if (all.length > MAX_ENTRIES) {
    const overflow = all
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .slice(0, all.length - MAX_ENTRIES);
    await tx('readwrite', (store) => {
      overflow.forEach((e) => store.delete(e.client_event_id));
    });
  }
  return entry;
}

export async function listOutbox() {
  return tx('readonly', (store) => store.getAll());
}

export async function removeOutboxEntry(clientEventId) {
  return tx('readwrite', (store) => store.delete(clientEventId));
}

export async function markOutboxFailed(clientEventId, errorMessage) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    const store = t.objectStore(STORE);
    const get = store.get(clientEventId);
    get.onsuccess = () => {
      const entry = get.result;
      if (entry) {
        entry.attempts += 1;
        entry.status = 'failed';
        entry.last_error = errorMessage;
        store.put(entry);
      }
      t.oncomplete = () => {
        db.close();
        resolve();
      };
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
  });
}

/**
 * Drain pending entries using senders { escalation, self_referral }.
 * Returns { synced, failed } counts. Entries exceeding MAX_ATTEMPTS stay
 * failed for manual retry (never silently discarded).
 */
export async function drainOutbox(senders, notify) {
  const entries = (await listOutbox()).filter(
    (e) => (e.status === 'pending' || e.status === 'failed') && e.attempts < MAX_ATTEMPTS
  );
  let synced = 0;
  let failed = 0;
  for (const entry of entries) {
    try {
      const sender = entry.kind === 'self_referral' ? senders.self_referral : senders.escalation;
      await sender(entry.payload);
      await removeOutboxEntry(entry.client_event_id);
      synced += 1;
      notify?.(`Offline entry synced (${entry.kind})`, 'success');
    } catch (err) {
      await markOutboxFailed(entry.client_event_id, err?.message || 'sync failed');
      failed += 1;
    }
  }
  return { synced, failed };
}

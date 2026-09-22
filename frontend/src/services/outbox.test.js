/**
 * Phase 5 (6.2): persistent offline outbox — enqueue persistence, sync
 * success/ack, sync failure retention, retry ceiling, capacity cap.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  enqueueOutbox,
  listOutbox,
  drainOutbox,
  markOutboxFailed
} from './outbox.js';

function entry(id, kind = 'escalation') {
  return {
    client_event_id: id,
    pseudonym_id: 'pseudo-1',
    tier: 'elevated',
    reason_codes: ['RC_SUSTAINED_DEPLOYMENT'],
    detected_at: new Date().toISOString()
  };
}

beforeEach(async () => {
  await new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase('sahayak-outbox');
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
    req.onblocked = resolve;
  });
});

describe('offline outbox', () => {
  it('enqueued entries persist and list back', async () => {
    await enqueueOutbox('escalation', entry('e-1'));
    const all = await listOutbox();
    expect(all.map((e) => e.client_event_id)).toContain('e-1');
    expect(all[0].status).toBe('pending');
  });

  it('successful sync removes the entry (server ack)', async () => {
    await enqueueOutbox('escalation', entry('e-2'));
    const sender = vi.fn().mockResolvedValue({ status: 'accepted' });
    const res = await drainOutbox({ escalation: sender, self_referral: sender });
    expect(res.synced).toBe(1);
    expect(await listOutbox()).toHaveLength(0);
  });

  it('failed sync keeps the entry with attempts + error (never discarded)', async () => {
    await enqueueOutbox('escalation', entry('e-3'));
    const sender = vi.fn().mockRejectedValue(new Error('Backend unavailable'));
    const res = await drainOutbox({ escalation: sender, self_referral: sender });
    expect(res.failed).toBe(1);
    const all = await listOutbox();
    expect(all).toHaveLength(1);
    expect(all[0].attempts).toBe(1);
    expect(all[0].last_error).toMatch(/Backend unavailable/);
  });

  it('entries past the retry ceiling are left for manual retry, not deleted', async () => {
    await enqueueOutbox('escalation', entry('e-4'));
    for (let i = 0; i < 10; i++) await markOutboxFailed('e-4', 'down');
    const sender = vi.fn().mockResolvedValue({});
    const res = await drainOutbox({ escalation: sender, self_referral: sender });
    expect(res.synced).toBe(0);
    expect(sender).not.toHaveBeenCalled();
    expect(await listOutbox()).toHaveLength(1);
  });

  it('capacity cap bounds the store', async () => {
    for (let i = 0; i < 55; i++) await enqueueOutbox('escalation', entry(`cap-${i}`));
    expect((await listOutbox()).length).toBeLessThanOrEqual(50);
  });
});

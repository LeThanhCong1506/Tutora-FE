import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizePresenceUserId,
  needsDetailedPresence,
  parsePresenceListPayload,
  parsePresencePayload,
  shouldApplyRealtimePresence,
  shouldPollPresenceFallback,
} from '../src/utils/presence.ts';

test('parses camelCase API envelopes without truthy coercion', () => {
  const parsed = parsePresencePayload({
    content: {
      userId: 'User-A',
      isOnline: true,
      status: 'online',
      lastSeenAt: '2026-07-19T10:00:00Z',
      version: 4,
      epoch: 'abc123',
    },
  });

  assert.deepEqual(parsed, {
    userId: 'User-A',
    isOnline: true,
    status: 'online',
    lastSeenAt: null,
    version: 4,
    epoch: 'abc123',
  });
});

test('parses PascalCase offline payloads', () => {
  const parsed = parsePresencePayload({
    UserId: 'USER-B',
    IsOnline: false,
    Status: 'offline',
    LastSeenAt: '2026-07-19T10:00:00Z',
    Version: 5,
    Epoch: 'def456',
  });

  assert.equal(parsed.status, 'offline');
  assert.equal(parsed.isOnline, false);
  assert.equal(parsed.lastSeenAt, '2026-07-19T10:00:00Z');
  assert.equal(parsed.epoch, 'def456');
});

test('does not treat string booleans as valid presence', () => {
  const parsed = parsePresencePayload({ userId: 'user-c', isOnline: 'false' });
  assert.equal(parsed.status, 'unknown');
  assert.equal(parsed.isOnline, null);

  const contradictory = parsePresencePayload({
    userId: 'user-c',
    isOnline: 'true',
    status: 'online',
  });
  assert.equal(contradictory.status, 'unknown');
});

test('parses batch envelopes and normalizes IDs for matching', () => {
  const parsed = parsePresenceListPayload({
    Content: [
      { UserId: 'ABC', IsOnline: true, Status: 'online', Version: 1, Epoch: 'epoch' },
      { UserId: 'DEF', IsOnline: null, Status: 'unknown', Version: 0, Epoch: null },
    ],
  });

  assert.equal(parsed.length, 2);
  assert.equal(normalizePresenceUserId(`  ${parsed[0]?.userId} `), 'abc');
  assert.equal(parsed[1]?.status, 'unknown');
});

test('realtime version ordering is scoped to the same epoch', () => {
  const current = { epoch: 'epoch-a', version: 10 };

  assert.equal(shouldApplyRealtimePresence(current, { epoch: 'epoch-a', version: 10 }), false);
  assert.equal(shouldApplyRealtimePresence(current, { epoch: 'epoch-a', version: 11 }), true);
  assert.equal(shouldApplyRealtimePresence(current, { epoch: 'epoch-b', version: 1 }), true);
});

test('summary presence requests detail only when the selected status needs it', () => {
  assert.equal(needsDetailedPresence({ status: 'offline' }, false), true);
  assert.equal(needsDetailedPresence({ status: 'offline' }, true), false);
  assert.equal(needsDetailedPresence({ status: 'unknown' }, false), true);
  assert.equal(needsDetailedPresence({ status: 'online' }, false), false);
});

test('fallback polling only runs while notification realtime is unavailable and watched', () => {
  assert.equal(shouldPollPresenceFallback(false, 1), true);
  assert.equal(shouldPollPresenceFallback(false, 0), false);
  assert.equal(shouldPollPresenceFallback(true, 3), false);
});

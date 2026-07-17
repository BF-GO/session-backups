import { browser } from 'wxt/browser';

import { collectSessionInput } from '../lib/chrome/collect-session';
import { SessionRepository } from '../lib/storage/session-repository';
import type { SessionRequest, SessionResponse } from '../types/messages';
import type { SessionSource } from '../types/session';

export default defineBackground(() => {
  const repository = new SessionRepository();
  const debounceTimers = new Map<
    SessionSource,
    ReturnType<typeof setTimeout>
  >();

  async function createSnapshot(
    source: SessionSource,
    name: string | null,
    scope: 'current' | 'all' | 'selected',
  ) {
    const input = await collectSessionInput(source, name, scope);
    const result = await repository.createSession(input);

    if (result.created && source === 'automatic') {
      const settings = await repository.getSettings();
      if (settings.notificationsEnabled) {
        try {
          await browser.notifications.create({
            type: 'basic',
            iconUrl: browser.runtime.getURL('/icon48.png'),
            title: 'Session Saver',
            message: 'Automatic restore point saved.',
          });
        } catch (error) {
          console.warn(
            'Snapshot was stored, but its notification failed',
            error,
          );
        }
      }
    }

    return result;
  }

  function debounceSnapshot(
    source: Extract<SessionSource, 'change'>,
    delay = 1_000,
  ): void {
    const existing = debounceTimers.get(source);
    if (existing) clearTimeout(existing);

    debounceTimers.set(
      source,
      setTimeout(() => {
        debounceTimers.delete(source);
        void createSnapshot(source, null, 'all').catch((error: unknown) => {
          console.error(`Failed to create ${source} snapshot`, error);
        });
      }, delay),
    );
  }

  async function scheduleAutomaticBackups(): Promise<void> {
    const settings = await repository.getSettings();
    await browser.alarms.clear('automatic-snapshot');
    await browser.alarms.create('automatic-snapshot', {
      periodInMinutes: settings.autoBackupIntervalMinutes,
    });
  }

  async function handleMessage(
    request: SessionRequest,
  ): Promise<SessionResponse> {
    try {
      switch (request.type) {
        case 'sessions:list':
          return {
            ok: true,
            type: request.type,
            data: await repository.listSessions(),
          };
        case 'sessions:save':
          return {
            ok: true,
            type: request.type,
            data: await createSnapshot('manual', request.name, request.scope),
          };
        case 'sessions:update':
          return {
            ok: true,
            type: request.type,
            data: await repository.updateSession(request.id, request.patch),
          };
        case 'sessions:delete':
          return {
            ok: true,
            type: request.type,
            data: await repository.deleteSession(request.id),
          };
        case 'sessions:restore':
          return {
            ok: true,
            type: request.type,
            data: await repository.restoreSession(request.id, request.options),
          };
        case 'sessions:export':
          return {
            ok: true,
            type: request.type,
            data: await repository.exportSession(request.id),
          };
        case 'sessions:import':
          return {
            ok: true,
            type: request.type,
            data: await repository.importSessions(request.payload),
          };
        case 'settings:get':
          return {
            ok: true,
            type: request.type,
            data: await repository.getSettings(),
          };
        case 'settings:update': {
          const settings = await repository.updateSettings(request.patch);
          await scheduleAutomaticBackups();
          return { ok: true, type: request.type, data: settings };
        }
      }
    } catch (error) {
      console.error('Session Saver request failed', error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  void repository
    .initialize()
    .then(scheduleAutomaticBackups)
    .catch((error: unknown) =>
      console.error('Session Saver initialization failed', error),
    );

  browser.runtime.onInstalled.addListener(() => {
    void repository
      .initialize()
      .then(scheduleAutomaticBackups)
      .catch((error: unknown) =>
        console.error('Session Saver installation failed', error),
      );
  });

  browser.runtime.onStartup.addListener(() => {
    void repository
      .initialize()
      .then(scheduleAutomaticBackups)
      .catch((error: unknown) =>
        console.error('Session Saver startup failed', error),
      );
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== 'automatic-snapshot') return;
    void createSnapshot('automatic', null, 'all').catch((error: unknown) => {
      console.error('Automatic snapshot failed', error);
    });
  });

  const queueChangeSnapshot = () => debounceSnapshot('change');
  browser.tabs.onCreated.addListener(queueChangeSnapshot);
  browser.tabs.onRemoved.addListener(queueChangeSnapshot);
  browser.tabs.onMoved.addListener(queueChangeSnapshot);
  browser.tabs.onAttached.addListener(queueChangeSnapshot);
  browser.tabs.onDetached.addListener(queueChangeSnapshot);
  browser.tabs.onUpdated.addListener((_tabId, changeInfo) => {
    if (
      changeInfo.url !== undefined ||
      changeInfo.pinned !== undefined ||
      changeInfo.groupId !== undefined
    ) {
      queueChangeSnapshot();
    }
  });
  browser.windows.onCreated.addListener(queueChangeSnapshot);
  browser.windows.onRemoved.addListener(queueChangeSnapshot);

  browser.runtime.onMessage.addListener((message: unknown) => {
    if (!message || typeof message !== 'object' || !('type' in message))
      return undefined;
    return handleMessage(message as SessionRequest);
  });
});

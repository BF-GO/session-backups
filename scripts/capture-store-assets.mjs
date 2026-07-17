import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = process.cwd();
const extensionPath = path.join(root, '.output', 'chrome-mv3');
const outputDir = path.join(root, 'store-assets', 'screenshots', 'raw');
const chromePath = path.join(
  process.env.LOCALAPPDATA,
  'ms-playwright',
  'chromium-1228',
  'chrome-win64',
  'chrome.exe',
);
const debuggingPort = 9333;

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  call(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

function createTab(id, url, title, index, options = {}) {
  return {
    id: `${id}-tab-${index}`,
    url,
    title,
    favIconUrl: null,
    pinned: options.pinned ?? false,
    active: options.active ?? index === 0,
    index,
    groupId: options.groupId ?? null,
  };
}

function createWindow(id, tabs, options = {}) {
  return {
    id,
    focused: options.focused ?? true,
    state: options.state ?? 'normal',
    tabs,
    groups: options.groups ?? [],
  };
}

function createSession(id, name, source, createdAt, windows, options = {}) {
  return {
    id,
    name,
    createdAt,
    updatedAt: createdAt,
    source,
    pinned: options.pinned ?? false,
    hash: `demo-${id}`,
    windows,
  };
}

function demoState() {
  const now = Date.now();
  const workGroup = {
    id: 'group-work',
    title: 'Launch',
    color: 'blue',
    collapsed: false,
  };
  const researchGroup = {
    id: 'group-research',
    title: 'Research',
    color: 'purple',
    collapsed: false,
  };

  const sessions = [
    createSession(
      'launch-workspace',
      'Product launch workspace',
      'manual',
      now - 2 * 60_000,
      [
        createWindow(
          'launch-window-1',
          [
            createTab(
              'launch',
              'https://calendar.google.com/',
              'Launch calendar — July',
              0,
              {
                pinned: true,
                groupId: workGroup.id,
              },
            ),
            createTab(
              'launch',
              'https://www.figma.com/',
              'Session Saver — Store visuals',
              1,
              {
                active: true,
                groupId: workGroup.id,
              },
            ),
            createTab(
              'launch',
              'https://github.com/BF-GO/session-backups',
              'BF-GO / session-backups',
              2,
            ),
            createTab(
              'launch',
              'https://developer.chrome.com/docs/webstore/',
              'Chrome Web Store documentation',
              3,
            ),
          ],
          { groups: [workGroup] },
        ),
        createWindow(
          'launch-window-2',
          [
            createTab(
              'copy',
              'https://docs.google.com/',
              'Store listing copy',
              0,
              { pinned: true },
            ),
            createTab(
              'copy',
              'https://translate.google.com/',
              'Listing localization',
              1,
            ),
            createTab(
              'copy',
              'https://www.youtube.com/',
              'Promo video references',
              2,
            ),
          ],
          { focused: false },
        ),
      ],
      { pinned: true },
    ),
    createSession(
      'research-session',
      'Deep research — browser recovery',
      'manual',
      now - 18 * 60_000,
      [
        createWindow(
          'research-window',
          [
            createTab(
              'research',
              'https://www.notion.so/',
              'Research brief',
              0,
              {
                pinned: true,
                groupId: researchGroup.id,
              },
            ),
            createTab(
              'research',
              'https://arxiv.org/',
              'Browser state persistence papers',
              1,
              {
                groupId: researchGroup.id,
              },
            ),
            createTab(
              'research',
              'https://stackoverflow.com/',
              'Chrome tab group restoration',
              2,
            ),
            createTab(
              'research',
              'https://developer.mozilla.org/',
              'WebExtensions APIs',
              3,
            ),
          ],
          { groups: [researchGroup] },
        ),
      ],
    ),
    createSession('automatic-morning', null, 'automatic', now - 42 * 60_000, [
      createWindow('auto-window', [
        createTab('auto', 'https://mail.google.com/', 'Inbox', 0, {
          pinned: true,
        }),
        createTab('auto', 'https://github.com/', 'GitHub', 1),
        createTab('auto', 'https://news.ycombinator.com/', 'Hacker News', 2),
        createTab('auto', 'https://openai.com/', 'OpenAI', 3),
      ]),
    ]),
    createSession('recovery-point', null, 'change', now - 76 * 60_000, [
      createWindow('recovery-window', [
        createTab(
          'recovery',
          'https://github.com/BF-GO/session-backups/issues/1',
          'Session Saver v2 issue',
          0,
        ),
        createTab('recovery', 'https://wxt.dev/', 'WXT documentation', 1),
        createTab('recovery', 'https://tailwindcss.com/', 'Tailwind CSS', 2),
      ]),
    ]),
    createSession(
      'imported-design',
      'Design references from laptop',
      'import',
      now - 3 * 60 * 60_000,
      [
        createWindow('import-window', [
          createTab(
            'import',
            'https://dribbble.com/',
            'Dashboard inspiration',
            0,
          ),
          createTab(
            'import',
            'https://www.behance.net/',
            'Browser extension UI',
            1,
          ),
          createTab('import', 'https://coolors.co/', 'Color palette', 2),
        ]),
      ],
    ),
    createSession(
      'automatic-yesterday',
      null,
      'automatic',
      now - 22 * 60 * 60_000,
      [
        createWindow('auto-old-window', [
          createTab('old', 'https://example.com/', 'Previous workspace', 0),
        ]),
      ],
    ),
  ];

  return {
    schemaVersion: 2,
    sessions,
    settings: {
      autoBackupIntervalMinutes: 10,
      notificationsEnabled: true,
      theme: 'light',
      retention: { automatic: 100, change: 50 },
    },
    migration: { legacyV1Completed: true, completedAt: now - 24 * 60 * 60_000 },
  };
}

async function waitForJson(pathname, timeout = 20_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    try {
      const response = await fetch(
        `http://127.0.0.1:${debuggingPort}${pathname}`,
      );
      if (response.ok) return response.json();
    } catch {
      // Chrome is still starting.
    }
    await sleep(200);
  }
  throw new Error(`Timed out waiting for Chrome endpoint ${pathname}`);
}

async function findExtensionId() {
  const startedAt = Date.now();
  let lastTargets = [];
  while (Date.now() - startedAt < 20_000) {
    const targets = await waitForJson('/json/list');
    lastTargets = targets;
    const target = targets.find(
      (item) =>
        item.url?.startsWith('chrome-extension://') &&
        item.url.endsWith('/background.js'),
    );
    if (target) return new URL(target.url).host;
    await sleep(250);
  }
  throw new Error(
    `The unpacked extension did not expose a Chrome target. Targets: ${lastTargets
      .map((target) => `${target.type}:${target.url}`)
      .join(', ')}`,
  );
}

async function createPage(url, width, height) {
  const response = await fetch(
    `http://127.0.0.1:${debuggingPort}/json/new?${encodeURIComponent(url)}`,
    { method: 'PUT' },
  );
  if (!response.ok)
    throw new Error(`Could not create Chrome target: ${response.status}`);
  const target = await response.json();
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  await client.call('Page.enable');
  await client.call('Runtime.enable');
  await client.call('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await client.call('Page.navigate', { url });
  await sleep(1_200);
  return client;
}

async function evaluate(client, expression) {
  const result = await client.call('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result?.value;
}

async function screenshot(client, filename) {
  await sleep(500);
  const result = await client.call('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(
    path.join(outputDir, filename),
    Buffer.from(result.data, 'base64'),
  );
}

const profileDir = await mkdtemp(path.join(tmpdir(), 'session-saver-store-'));
await mkdir(outputDir, { recursive: true });

const chrome = spawn(
  chromePath,
  [
    `--remote-debugging-port=${debuggingPort}`,
    `--user-data-dir=${profileDir}`,
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-component-update',
    '--force-device-scale-factor=1',
    '--window-size=1280,800',
    '--window-position=-32000,-32000',
  ],
  { stdio: 'ignore', windowsHide: true },
);

const clients = [];
try {
  await waitForJson('/json/version');
  const extensionId = await findExtensionId();
  const libraryUrl = `chrome-extension://${extensionId}/library.html`;
  const library = await createPage(libraryUrl, 1280, 800);
  clients.push(library);

  const state = demoState();
  await evaluate(
    library,
    `new Promise((resolve, reject) => chrome.storage.local.set(${JSON.stringify(
      { sessionSaverState: state },
    )}, () => chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(true)))`,
  );
  await library.call('Page.reload', { ignoreCache: true });
  await sleep(1_400);

  await screenshot(library, '01-library-overview.png');

  await evaluate(
    library,
    `([...document.querySelectorAll('button')].find((button) => button.textContent?.includes('Pinned'))).click()`,
  );
  await screenshot(library, '02-pinned-sessions.png');

  await evaluate(
    library,
    `([...document.querySelectorAll('button')].find((button) => button.textContent?.includes('Automatic'))).click()`,
  );
  await screenshot(library, '03-automatic-recovery.png');

  await evaluate(
    library,
    `([...document.querySelectorAll('button')].find((button) => button.textContent?.includes('Settings'))).click()`,
  );
  await screenshot(library, '04-settings.png');

  const popup = await createPage(
    `chrome-extension://${extensionId}/popup.html`,
    380,
    600,
  );
  clients.push(popup);
  await screenshot(popup, 'popup-raw.png');
} finally {
  clients.forEach((client) => client.close());
  chrome.kill();
  await sleep(300);
  await rm(profileDir, { recursive: true, force: true });
}

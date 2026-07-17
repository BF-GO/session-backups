import { browser } from 'wxt/browser';

export interface StorageAdapter {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(values: Record<string, unknown>): Promise<void>;
  remove(keys: string[]): Promise<void>;
}

export class BrowserStorageAdapter implements StorageAdapter {
  async get(keys: string[]): Promise<Record<string, unknown>> {
    return browser.storage.local.get(keys);
  }

  async set(values: Record<string, unknown>): Promise<void> {
    await browser.storage.local.set(values);
  }

  async remove(keys: string[]): Promise<void> {
    await browser.storage.local.remove(keys);
  }
}

export class MemoryStorageAdapter implements StorageAdapter {
  readonly values: Record<string, unknown>;

  constructor(initialValues: Record<string, unknown> = {}) {
    this.values = structuredClone(initialValues);
  }

  get(keys: string[]): Promise<Record<string, unknown>> {
    return Promise.resolve(
      Object.fromEntries(
        keys
          .filter((key) => key in this.values)
          .map((key) => [key, structuredClone(this.values[key])]),
      ),
    );
  }

  set(values: Record<string, unknown>): Promise<void> {
    Object.assign(this.values, structuredClone(values));
    return Promise.resolve();
  }

  remove(keys: string[]): Promise<void> {
    keys.forEach((key) => delete this.values[key]);
    return Promise.resolve();
  }
}

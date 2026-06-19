import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";

function installLocalStorageMock() {
  const existing = globalThis.localStorage;
  if (existing && typeof existing.getItem === "function") {
    return existing;
  }

  const store = new Map<string, string>();
  const mock: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    }
  };

  Object.defineProperty(globalThis, "localStorage", {
    value: mock,
    writable: true,
    configurable: true
  });

  if (typeof window !== "undefined") {
    Object.defineProperty(window, "localStorage", {
      value: mock,
      writable: true,
      configurable: true
    });
  }

  return mock;
}

const localStorageMock = installLocalStorageMock();

afterEach(() => {
  cleanup();
  localStorageMock.clear();
});

if (!HTMLElement.prototype.hasPointerCapture) {
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
}

if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = () => {};
}

if (typeof ResizeObserver === "undefined") {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverMock;
}

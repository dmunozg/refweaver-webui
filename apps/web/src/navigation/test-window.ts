type PopStateListener = () => void;

export type MockWindow = {
  location: { pathname: string };
  history: {
    pushState(_state: unknown, _title: string, nextPathname?: string): void;
    replaceState(_state: unknown, _title: string, nextPathname?: string): void;
  };
  addEventListener(type: string, listener: PopStateListener): void;
  removeEventListener(type: string, listener: PopStateListener): void;
  dispatchEvent(event: { type: string }): boolean;
  dispatchPopState(): void;
};

export function createMockWindow(pathname: string): MockWindow {
  const listeners = new Set<PopStateListener>();
  const location = { pathname };

  return {
    location,
    history: {
      pushState: (_state, _title, nextPathname) => {
        if (nextPathname) {
          location.pathname = nextPathname;
        }
      },
      replaceState: (_state, _title, nextPathname) => {
        if (nextPathname) {
          location.pathname = nextPathname;
        }
      }
    },
    addEventListener: (type, listener) => {
      if (type === "popstate") {
        listeners.add(listener);
      }
    },
    removeEventListener: (type, listener) => {
      if (type === "popstate") {
        listeners.delete(listener);
      }
    },
    dispatchEvent: (event) => {
      if (event.type === "popstate") {
        listeners.forEach((listener) => listener());
      }

      return true;
    },
    dispatchPopState: () => {
      listeners.forEach((listener) => listener());
    }
  };
}

export function installMockWindow(pathname: string): MockWindow {
  const mockWindow = createMockWindow(pathname);
  Object.defineProperty(globalThis, "window", {
    value: mockWindow,
    configurable: true,
    writable: true
  });
  return mockWindow;
}

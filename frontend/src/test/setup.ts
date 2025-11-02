import '@testing-library/jest-dom';

class ResizeObserver {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(_callback: any) {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

// @ts-ignore - jsdom does not implement ResizeObserver
global.ResizeObserver = global.ResizeObserver ?? ResizeObserver;

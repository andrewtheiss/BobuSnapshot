declare module '@milkdown/crepe' {
  export class Crepe {
    static Feature: Record<string, unknown>;
    constructor(options: {
      root: HTMLElement | null;
      defaultValue?: string;
      features?: Record<string, unknown>;
    });
    create(): Promise<void>;
    destroy(): void;
    editor?: unknown;
  }
}



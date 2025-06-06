// Type definitions for electron-store
declare module 'electron-store' {
  interface Store<T = Record<string, any>> {
    store: T;
    size: number;
    path: string;
    
    get<K extends keyof T>(key: K): T[K];
    get<K extends keyof T>(key: K, defaultValue: T[K]): T[K];
    get(key: string): any;
    get(key: string, defaultValue: any): any;
    
    set<K extends keyof T>(key: K, value: T[K]): void;
    set(key: string, value: any): void;
    set(object: Partial<T>): void;
    
    has(key: keyof T): boolean;
    has(key: string): boolean;
    
    delete(key: keyof T): void;
    delete(key: string): void;
    
    clear(): void;
    
    onDidChange<K extends keyof T>(
      key: K,
      callback: (newValue?: T[K], oldValue?: T[K]) => void
    ): () => void;
    
    onDidAnyChange(
      callback: (newValue?: T, oldValue?: T) => void
    ): () => void;
    
    openInEditor(): void;
  }
  
  interface Options<T> {
    defaults?: T;
    name?: string;
    cwd?: string;
    encryptionKey?: string | Buffer;
    fileExtension?: string;
    clearInvalidConfig?: boolean;
    serialize?: (value: T) => string;
    deserialize?: (text: string) => T;
    projectSuffix?: string;
    schema?: any;
    migrations?: Record<string, (store: Store<T>) => void>;
    beforeEachMigration?: (store: Store<T>, context: {fromVersion: string, toVersion: string, finalVersion: string, versions: string[]}) => void;
    accessPropertiesByDotNotation?: boolean;
    watch?: boolean;
  }
  
  class Store<T = Record<string, any>> {
    constructor(options?: Options<T>);
    
    store: T;
    size: number;
    path: string;
    
    get<K extends keyof T>(key: K): T[K];
    get<K extends keyof T>(key: K, defaultValue: T[K]): T[K];
    get(key: string): any;
    get(key: string, defaultValue: any): any;
    
    set<K extends keyof T>(key: K, value: T[K]): void;
    set(key: string, value: any): void;
    set(object: Partial<T>): void;
    
    has(key: keyof T): boolean;
    has(key: string): boolean;
    
    delete(key: keyof T): void;
    delete(key: string): void;
    
    clear(): void;
    
    onDidChange<K extends keyof T>(
      key: K,
      callback: (newValue?: T[K], oldValue?: T[K]) => void
    ): () => void;
    
    onDidAnyChange(
      callback: (newValue?: T, oldValue?: T) => void
    ): () => void;
    
    openInEditor(): void;
  }
  
  export = Store;
}

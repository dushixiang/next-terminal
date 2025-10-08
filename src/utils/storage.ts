/**
 * 本地存储工具类
 */
export class LocalStorage {
  private static prefix = 'next-terminal-';

  /**
   * 设置存储值
   */
  static set(key: string, value: any): void {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(this.prefix + key, serializedValue);
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  /**
   * 获取存储值
   */
  static get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (item === null) {
        return defaultValue ?? null;
      }
      return JSON.parse(item);
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return defaultValue ?? null;
    }
  }

  /**
   * 删除存储值
   */
  static remove(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
    }
  }

  /**
   * 清空所有存储
   */
  static clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }
}

// 特定功能的存储键
export const STORAGE_KEYS = {
  TREE_EXPANDED_KEYS: 'tree-expanded-keys',
  PANEL_SIZES: 'panel-sizes',
  COLLAPSED_STATE: 'collapsed-state',
} as const;
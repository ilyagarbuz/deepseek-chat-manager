import type { Folder, Chat } from "@/shared/types";

export interface FolderUpdateEvent {
  type: "FOLDER_UPDATE";
  folders: Folder[];
}

export interface ChatUpdateEvent {
  type: "CHAT_UPDATE";
  chatId: string;
  chat: Chat;
}

export interface FoldersChangedEvent {
  type: "FOLDERS_CHANGED";
  folders: Folder[];
}

export type ExtensionEvent =
  | FolderUpdateEvent
  | ChatUpdateEvent
  | FoldersChangedEvent;

export class EventBus {
  private static instance: EventBus;
  private listeners: Map<string, Set<(event: ExtensionEvent) => void>> =
    new Map();

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Подписывается на событие
   */
  subscribe(
    eventType: string,
    callback: (event: ExtensionEvent) => void
  ): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
  }

  /**
   * Отписывается от события
   */
  unsubscribe(
    eventType: string,
    callback: (event: ExtensionEvent) => void
  ): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  /**
   * Отправляет событие
   */
  emit(event: ExtensionEvent): void {
    const eventListeners = this.listeners.get(event.type);
    if (eventListeners) {
      eventListeners.forEach((callback) => callback(event));
    }
  }

  /**
   * Очищает все подписки
   */
  clear(): void {
    this.listeners.clear();
  }
}

import type {
  Chat,
  Folder,
  ExtensionMessage,
  ExtensionResponse,
} from "@/shared/types";
import { DeepSeekApiService } from "../api/deepseekApi";
import {
  EventBus,
  FoldersChangedEvent,
  ChatUpdateEvent,
} from "../events/eventBus";

export class ContextMenuService {
  private folders: Folder[] = [];

  constructor(folders: Folder[]) {
    this.folders = folders;
    this.setupEventListeners();
  }

  /**
   * Настраивает слушатели событий
   */
  private setupEventListeners(): void {
    EventBus.getInstance().subscribe(
      "FOLDERS_CHANGED",
      (event: FoldersChangedEvent) => {
        this.folders = event.folders;
      }
    );

    EventBus.getInstance().subscribe(
      "CHAT_UPDATE",
      (event: ChatUpdateEvent) => {
        // При появлении нового чата обновляем контекстное меню
        // Это обеспечит, что новые чаты будут доступны в меню
        console.log("New chat detected:", event.chat.title);
      }
    );
  }

  /**
   * Обновляет список папок
   */
  updateFolders(folders: Folder[]) {
    this.folders = folders;
  }

  /**
   * Добавляет контекстное меню к элементу чата
   */
  addContextMenuToChat(element: HTMLElement, chatId: string) {
    console.log("adding context menu to chat", chatId, element);

    element.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      // получаем второй div и берем текст из него
      const chatName =
        element.querySelector("div:nth-child(2)")?.textContent?.trim() ||
        chatId;
      this.showContextMenu(e, chatId, chatName);
    });
  }

  /**
   * Показывает контекстное меню
   */
  private async showContextMenu(
    event: MouseEvent,
    chatId: string,
    chatName: string
  ) {
    // Удаляем существующее меню
    const existingMenu = document.querySelector(".dsm-context-menu");
    if (existingMenu) {
      existingMenu.remove();
    }

    const menu = document.createElement("div");
    menu.className = "dsm-context-menu";
    menu.style.cssText = `
      position: fixed;
      top: ${event.clientY}px;
      left: ${event.clientX}px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      min-width: 200px;
      padding: 8px 0;
    `;

    // Проверяем, что folders является массивом
    if (!Array.isArray(this.folders)) {
      return;
    }

    // Добавляем опции для каждой папки
    this.folders.forEach((folder) => {
      const isInFolder = folder.chats.some((c) => c.id === chatId);
      const item = document.createElement("div");
      item.className = "dsm-menu-item";
      item.textContent = isInFolder ? `✓ ${folder.name}` : folder.name;
      item.style.cssText = `
        padding: 8px 16px;
        cursor: pointer;
        font-size: 14px;
        color: ${isInFolder ? "var(--deepseek-primary-static)" : "#374151"};
        background: ${isInFolder ? "#eff6ff" : "transparent"};
      `;

      item.addEventListener("click", () => {
        this.toggleChatInFolder(chatId, chatName, folder.id);
        menu.remove();
      });

      item.addEventListener("mouseenter", () => {
        if (!isInFolder) {
          item.style.background = "#f3f4f6";
        }
      });

      item.addEventListener("mouseleave", () => {
        if (!isInFolder) {
          item.style.background = "transparent";
        }
      });

      menu.appendChild(item);
    });

    // Добавляем опцию "Create folder"
    const createItem = document.createElement("div");
    createItem.className = "dsm-menu-item";
    createItem.textContent = "+ Create folder";
    createItem.style.cssText = `
      padding: 8px 16px;
      cursor: pointer;
      font-size: 14px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
      margin-top: 4px;
    `;

    createItem.addEventListener("click", () => {
      this.createFolderForChat(chatId, chatName);
      menu.remove();
    });

    menu.appendChild(createItem);

    document.body.appendChild(menu);

    // Закрываем меню при клике вне его
    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener("click", closeMenu);
      }
    };

    setTimeout(() => {
      document.addEventListener("click", closeMenu);
    }, 100);
  }

  /**
   * Переключает чат в папке
   */
  private async toggleChatInFolder(
    chatId: string,
    chatName: string,
    folderId: string
  ) {
    console.log("Toggling chat in folder", chatId, chatName, folderId);
    // Проверяем, что folders является массивом
    if (!Array.isArray(this.folders)) {
      return;
    }

    const folder = this.folders.find((f) => f.id === folderId);
    if (!folder) return;

    const chatData = this.getOrCreateChatData(chatId, chatName);

    const existingChat = folder.chats.find((c) => c.id === chatId);
    const isInFolder = !!existingChat;

    try {
      if (isInFolder) {
        await DeepSeekApiService.sendMessage({
          type: "REMOVE_CHAT_FROM_FOLDER",
          chatId,
          folderId,
        });
        folder.chats = folder.chats.filter((chat) => chat.id !== chatId);
      } else {
        await DeepSeekApiService.sendMessage({
          type: "ADD_CHAT_TO_FOLDER",
          chat: chatData,
          folderId,
        });
        folder.chats.push(chatData);
      }

      folder.chatCount = folder.chats.length;
    } catch (error) {
      console.error("Error changing chat folder:", error);
    }
  }

  /**
   * Создает папку для чата
   */
  private async createFolderForChat(chatId: string, chatName: string) {
    const name = prompt("Enter folder name:");
    if (!name) return;

    try {
      // Убеждаемся, что folders является массивом
      if (!Array.isArray(this.folders)) {
        this.folders = [];
      }

      const response = await DeepSeekApiService.sendMessage<{ folder: Folder }>(
        {
          type: "CREATE_FOLDER",
          name: name.trim(),
        }
      );

      // Добавляем чат в новую папку
      const chatData = this.getOrCreateChatData(chatId, chatName);
      await DeepSeekApiService.sendMessage({
        type: "ADD_CHAT_TO_FOLDER",
        chat: chatData,
        folderId: response.folder.id,
      });
      response.folder.chats.push(chatData);
      response.folder.chatCount = 1;
    } catch (error) {
      console.error("Error creating folder:", error);
      alert("Failed to create folder");
    }
  }

  /**
   * Получает или создает данные чата
   */
  private getOrCreateChatData(chatId: string, chatName: string): Chat {
    // Находим чат в любой из папок
    for (const folder of this.folders) {
      const existing = folder.chats.find((c) => c.id === chatId);
      if (existing) return existing;
    }

    // Если не найден, создаем минимальный объект
    const minimal: Chat = {
      id: chatId,
      title: chatName,
      url: `https://chat.deepseek.com/a/chat/s/${chatId}`,
      createdAt: new Date(),
    };

    return minimal;
  }

  /**
   * Добавляет глобальное контекстное меню
   */
  addGlobalContextMenu() {
    document.addEventListener("contextmenu", (e) => {
      const target = e.target as HTMLElement;
      if (target.closest(".dsm-context-menu")) return;

      // Здесь можно добавить глобальные опции меню
    });
  }
}

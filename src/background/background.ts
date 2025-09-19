import type {
  Chat,
  Folder,
  ExtensionMessage,
  ExtensionResponse,
} from "@/shared/types";

// Background script для управления расширением
class BackgroundManager {
  private folders: Folder[] = [];

  constructor() {
    this.init();
  }

  private async init() {
    console.log("DeepSeek Chat Manager: Background script инициализирован");

    // Загружаем данные при запуске
    await this.loadData();

    // Настраиваем слушатели событий
    this.setupEventListeners();

    // Настраиваем периодическую синхронизацию
    this.setupPeriodicSync();
  }

  private async loadData() {
    try {
      const result = await chrome.storage.local.get(["folders"]);
      this.folders = result.folders || [];

      const totalChats = this.folders.reduce(
        (sum, folder) => sum + folder.chats.length,
        0
      );
      console.log(
        `Загружено ${this.folders.length} папок и ${totalChats} чатов`
      );
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
    }
  }

  private setupEventListeners() {
    // Слушаем сообщения от content script и popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Указываем, что ответ будет асинхронным
    });

    // Слушаем изменения в storage
    chrome.storage.onChanged.addListener((changes, namespace) => {
      this.handleStorageChange(changes, namespace);
    });

    // Слушаем установку/обновление расширения
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstall(details);
    });

    // Слушаем активацию вкладки
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleTabActivation(activeInfo);
    });

    // Слушаем обновление вкладки
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });
  }

  private async handleMessage(
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: ExtensionResponse) => void
  ) {
    try {
      switch (message.type) {
        case "GET_FOLDERS":
          sendResponse({ folders: this.folders });
          break;

        case "CREATE_FOLDER":
          const newFolder = await this.createFolder(message.name);
          sendResponse({ folder: newFolder });
          break;

        case "DELETE_FOLDER":
          await this.deleteFolder(message.folderId);
          sendResponse({ success: true });
          break;

        case "ADD_CHAT_TO_FOLDER":
          await this.addChatToFolder(message.chat, message.folderId);
          sendResponse({ success: true });
          break;

        case "REMOVE_CHAT_FROM_FOLDER":
          await this.removeChatFromFolder(message.chatId, message.folderId);
          sendResponse({ success: true });
          break;

        default:
          console.warn("Неизвестный тип сообщения:", (message as any).type);
          sendResponse({ error: "Unknown message type" });
      }
    } catch (error) {
      console.error("Ошибка обработки сообщения:", error);
      sendResponse({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private handleStorageChange(
    changes: { [key: string]: chrome.storage.StorageChange },
    namespace: string
  ) {
    if (namespace !== "local") return;

    if (changes.folders) {
      this.folders = changes.folders.newValue || [];
      const totalChats = this.folders.reduce(
        (sum, folder) => sum + folder.chats.length,
        0
      );
      console.log(
        "Папки обновлены:",
        this.folders.length,
        "чатов:",
        totalChats
      );
    }
  }

  private async handleInstall(details: chrome.runtime.InstalledDetails) {
    console.log("Расширение установлено/обновлено:", details.reason);

    if (details.reason === "install") {
      // Первоначальная настройка
      await this.initializeDefaultData();
    } else if (details.reason === "update") {
      // Обновление - можно добавить миграцию данных
      await this.migrateData();
    }
  }

  private async handleTabActivation(activeInfo: { tabId: number }) {
    // Получаем информацию о вкладке
    const tab = await chrome.tabs.get(activeInfo.tabId);

    if (this.isDeepSeekTab(tab)) {
      console.log("Активирована вкладка DeepSeek");
      // Можно добавить логику для синхронизации с активной вкладкой
    }
  }

  private async handleTabUpdate(
    tabId: number,
    changeInfo: { status?: string },
    tab: chrome.tabs.Tab
  ) {
    if (changeInfo.status === "complete" && this.isDeepSeekTab(tab)) {
      console.log("DeepSeek страница загружена");

      // Инжектируем content script если нужно
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ["dist/content.js"],
        });
      } catch (error) {
        // Content script уже загружен или ошибка инжекции
        console.log("Content script уже загружен или ошибка:", error);
      }
    }
  }

  private isDeepSeekTab(tab: chrome.tabs.Tab): boolean {
    return tab.url?.includes("chat.deepseek.com") || false;
  }

  private async initializeDefaultData() {
    // Создаем папку по умолчанию
    const defaultFolder: Folder = {
      id: "default",
      name: "Общие чаты",
      chats: [],
      chatCount: 0,
      createdAt: new Date(),
    };

    this.folders = [defaultFolder];
    await chrome.storage.local.set({
      folders: this.folders,
    });
  }

  private async migrateData() {
    // Логика миграции данных при обновлении
    console.log("Миграция данных...");
  }

  private async createFolder(name: string): Promise<Folder> {
    const newFolder: Folder = {
      id: Date.now().toString(),
      name: name.trim(),
      chats: [],
      chatCount: 0,
      createdAt: new Date(),
    };

    this.folders.push(newFolder);
    await chrome.storage.local.set({ folders: this.folders });

    return newFolder;
  }

  private async deleteFolder(folderId: string): Promise<void> {
    this.folders = this.folders.filter((f) => f.id !== folderId);
    await chrome.storage.local.set({ folders: this.folders });
  }

  private async addChatToFolder(chat: Chat, folderId: string): Promise<void> {
    const folder = this.folders.find((f) => f.id === folderId);
    if (!folder) return;

    // Проверяем, нет ли уже такого чата в папке
    const existingChat = folder.chats.find((c) => c.id === chat.id);
    if (!existingChat) {
      folder.chats.push(chat);
      folder.chatCount = folder.chats.length;
      await chrome.storage.local.set({ folders: this.folders });
    }
  }

  private async removeChatFromFolder(
    chatId: string,
    folderId: string
  ): Promise<void> {
    const folder = this.folders.find((f) => f.id === folderId);
    if (!folder) return;

    folder.chats = folder.chats.filter((chat) => chat.id !== chatId);
    folder.chatCount = folder.chats.length;
    await chrome.storage.local.set({ folders: this.folders });
  }

  private setupPeriodicSync() {
    // Синхронизация каждые 5 минут
    setInterval(async () => {
      await this.performPeriodicSync();
    }, 5 * 60 * 1000);
  }

  private async performPeriodicSync() {
    console.log("Выполняется периодическая синхронизация...");

    // Здесь можно добавить логику для синхронизации с внешними источниками
    // или очистки устаревших данных
  }
}

// Инициализируем background manager
new BackgroundManager();

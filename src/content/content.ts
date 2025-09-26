import type {
  Chat,
  Folder,
  Theme,
  ExtensionMessage,
  ExtensionResponse,
} from "@/shared/types";

// Инициализация расширения на странице DeepSeek
class DeepSeekChatManager {
  private isInitialized = false;
  private chatElements: Map<string, HTMLElement> = new Map();
  private folders: Folder[] = [];
  private chatData: Map<string, Chat> = new Map();
  private currentTheme: Theme = "system";

  // Возвращает данные чата из кэша, при отсутствии — создает минимальные из chatId
  private getOrCreateChatData(chatId: string): Chat {
    const existing = this.chatData.get(chatId);
    if (existing) return existing;

    const minimal: Chat = {
      id: chatId,
      title: `Чат ${chatId}`,
      url: `https://chat.deepseek.com/a/chat/s/${chatId}`,
      createdAt: new Date(),
    };
    this.chatData.set(chatId, minimal);
    return minimal;
  }

  constructor() {
    this.init();
  }

  private async init() {
    if (this.isInitialized) return;

    // Ждем загрузки DOM
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.setup());
    } else {
      // Если DOM уже загружен, ждем немного для SPA
      setTimeout(() => this.setup(), 100);
    }

    this.isInitialized = true;
  }

  private async setup() {
    await this.loadFolders();
    await this.loadTheme();

    // Проверяем наличие токена авторизации
    const token = this.getUserToken();
    if (token) {
      this.observeChatList();
    }

    this.addContextMenu();
    this.injectStyles();
    this.setupNavigationListener();
    this.setupStorageListener();
  }

  // Функция для отправки сообщений в background script
  private async sendMessage<T extends ExtensionResponse>(
    message: ExtensionMessage
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response: T) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  private async loadFolders() {
    try {
      const response = await this.sendMessage<{ folders: Folder[] }>({
        type: "GET_FOLDERS",
      });
      this.folders = Array.isArray(response.folders) ? response.folders : [];
    } catch (error) {
      console.error("Ошибка загрузки папок:", error);
      this.folders = [];
    }
  }

  private getUserToken(): string | null {
    try {
      // Получаем токен из localStorage
      const userTokenData = localStorage.getItem("userToken");

      if (!userTokenData) {
        return null;
      }

      // Парсим JSON данные
      const tokenObj = JSON.parse(userTokenData);

      if (!tokenObj || !tokenObj.value) {
        return null;
      }

      return tokenObj.value;
    } catch (error) {
      return null;
    }
  }

  private async fetchChatData() {
    try {
      // Получаем токен из localStorage
      const userToken = this.getUserToken();
      if (!userToken) {
        return;
      }

      const response = await fetch(
        "https://chat.deepseek.com/api/v0/chat_session/fetch_page",
        {
          method: "GET",
          headers: {
            accept: "*/*",
            "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
            authorization: `Bearer ${userToken}`,
            priority: "u=1, i",
            referer: "https://chat.deepseek.com/",
            "sec-ch-ua":
              '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
            "sec-ch-ua-arch": '"arm"',
            "sec-ch-ua-bitness": '"64"',
            "sec-ch-ua-full-version": '"140.0.7339.133"',
            "sec-ch-ua-full-version-list":
              '"Chromium";v="140.0.7339.133", "Not=A?Brand";v="24.0.0.0", "Google Chrome";v="140.0.7339.133"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-model": '""',
            "sec-ch-ua-platform": '"macOS"',
            "sec-ch-ua-platform-version": '"15.6.1"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
            "x-app-version": "20241129.1",
            "x-client-locale": "en_US",
            "x-client-platform": "web",
            "x-client-version": "1.4.0-fragments",
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Обрабатываем полученные данные
      if (
        data &&
        data.data &&
        data.data.biz_data &&
        data.data.biz_data.chat_sessions &&
        Array.isArray(data.data.biz_data.chat_sessions)
      ) {
        this.chatData.clear();

        data.data.biz_data.chat_sessions.forEach(async (chatItem: any) => {
          const chat: Chat = {
            id: chatItem.id,
            title: chatItem.title || "Без названия",
            url: `/a/chat/s/${chatItem.id}`,
            createdAt: new Date(chatItem.created_at || chatItem.create_time),
            lastMessageAt: chatItem.updated_at
              ? new Date(chatItem.updated_at)
              : new Date(),
          };

          this.chatData.set(chat.id, chat);

          // Данные чата теперь хранятся только в папках
        });

        // Теперь ищем элементы чатов по полученным данным
        this.findChatElementsByData();
      }
    } catch (error) {
      // Ошибка загрузки данных чатов
    }
  }

  private findChatElementsByData() {
    this.chatData.forEach((chat, chatId) => {
      // Ищем элемент по URL
      const elementByUrl = document.querySelector(
        `a[href*="/a/chat/s/${chatId}"]`
      ) as HTMLElement;

      if (elementByUrl) {
        console.log(`✅ Найден чат: "${chat.title}" (ID: ${chatId})`);
        this.processChatElement(elementByUrl, chat);
        return;
      }

      // Ищем элемент по заголовку
      const elementByTitle = this.findElementByTitle(chat.title);
      if (elementByTitle) {
        console.log(`✅ Найден чат: "${chat.title}" (ID: ${chatId})`);
        this.processChatElement(elementByTitle, chat);
        return;
      }
    });
  }

  private findElementByTitle(title: string): HTMLElement | null {
    // Ищем все ссылки на чаты
    const chatLinks = document.querySelectorAll('a[href*="/a/chat/s/"]');

    for (const link of chatLinks) {
      const element = link as HTMLElement;
      const elementTitle = this.getChatTitle(element);

      if (
        elementTitle &&
        elementTitle.toLowerCase().includes(title.toLowerCase())
      ) {
        return element;
      }
    }

    return null;
  }

  private processChatElement(element: HTMLElement, chat: Chat) {
    if (this.chatElements.has(chat.id)) {
      return;
    }

    this.chatElements.set(chat.id, element);
    this.addFolderIndicator(element, chat.id);
    this.addContextMenuToChat(element, chat.id);
  }

  private observeChatList() {
    // Сначала загружаем данные чатов через API
    this.fetchChatData();

    // Затем начинаем наблюдение за изменениями DOM
    const chatListObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          this.processNewChats(mutation.addedNodes);
        }
      });
    });

    // Наблюдаем за изменениями в document.body
    chatListObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Периодически обновляем данные чатов
    setInterval(() => {
      this.fetchChatData();
    }, 30000); // Обновляем каждые 30 секунд

    // Также слушаем изменения в localStorage для обновления токена
    this.setupTokenListener();
  }

  private processNewChats(nodes: NodeList) {
    nodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;

        // Проверяем, является ли элемент чатом
        if (this.isChatItem(element)) {
          this.processChatItemByElement(element);
        }

        // Проверяем дочерние элементы
        const chatItems = element.querySelectorAll(this.getChatItemSelector());
        chatItems.forEach((item) =>
          this.processChatItemByElement(item as HTMLElement)
        );
      }
    });
  }

  private processChatItemByElement(element: HTMLElement) {
    const chatId = this.extractChatId(element);
    if (!chatId) {
      return;
    }

    // Проверяем, есть ли данные чата в нашем кэше
    const chatData = this.chatData.get(chatId);
    if (chatData) {
      this.processChatElement(element, chatData);
    } else {
      // Если данных нет, создаем временный объект чата
      const tempChat: Chat = {
        id: chatId,
        title: this.getChatTitle(element),
        url: element.getAttribute("href") || "",
        createdAt: new Date(),
      };
      this.processChatElement(element, tempChat);
    }
  }

  private getChatItemSelector(): string {
    // Селекторы для элементов чата на DeepSeek
    return [
      'a[href*="/a/chat/s/"]', // Основной селектор для чатов DeepSeek
      '[data-testid="chat-item"]',
      ".chat-item",
      ".conversation-item",
      'li[role="listitem"]',
      ".chat-history-item",
      'a[href*="/chat/"]',
    ].join(", ");
  }

  private isChatItem(element: HTMLElement): boolean {
    const selectors = this.getChatItemSelector().split(", ");
    return selectors.some((selector) => element.matches(selector));
  }

  private extractChatId(element: HTMLElement): string | null {
    // Пытаемся извлечь ID чата из URL DeepSeek
    const href = element.getAttribute("href");
    if (href) {
      // Паттерн для URL DeepSeek: /a/chat/s/5fb41622-405b-4690-8474-5f4cacb1a242
      const deepSeekMatch = href.match(/\/a\/chat\/s\/([a-f0-9-]+)/);
      if (deepSeekMatch) {
        return deepSeekMatch[1]; // Возвращаем UUID чата
      }

      // Старый паттерн для совместимости
      const oldMatch = href.match(/\/chat\/([^\/\?]+)/);
      if (oldMatch) return oldMatch[1];
    }

    // Проверяем data-атрибуты
    const dataId =
      element.getAttribute("data-chat-id") ||
      element.getAttribute("data-id") ||
      element.getAttribute("id");

    if (dataId) return dataId;

    // Генерируем ID на основе содержимого (последний резерв)
    const title = this.getChatTitle(element);
    if (title) {
      return btoa(encodeURIComponent(title))
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 16);
    }

    return null;
  }

  private getChatTitle(element: HTMLElement): string {
    // Ищем заголовок чата в различных элементах
    const titleSelectors = [
      // Специфичные селекторы для DeepSeek
      '[data-testid="chat-title"]',
      ".chat-title",
      ".conversation-title",
      ".conversation-name",
      ".chat-name",
      // Общие селекторы
      "h3",
      "h4",
      ".title",
      "span[title]",
      // Ищем в дочерних элементах
      "div > span",
      "div > div",
      "li > span",
      "li > div",
    ];

    for (const selector of titleSelectors) {
      const titleElement = element.querySelector(selector);
      if (titleElement) {
        const title =
          titleElement.textContent?.trim() ||
          titleElement.getAttribute("title")?.trim();
        if (title && title.length > 0) {
          return title;
        }
      }
    }

    // Если не нашли, используем весь текст элемента, но ограничиваем длину
    const fullText = element.textContent?.trim() || "";
    return fullText.length > 50 ? fullText.substring(0, 50) + "..." : fullText;
  }

  private addFolderIndicator(element: HTMLElement, chatId: string) {
    // Проверяем, что folders является массивом
    if (!Array.isArray(this.folders)) {
      return;
    }

    // Проверяем, в какой папке находится чат
    const folder = this.folders.find((f) =>
      f.chats.some((c) => c.id === chatId)
    );
    if (!folder) return;

    // Добавляем индикатор папки
    const indicator = document.createElement("div");
    indicator.className = "dsm-folder-indicator";
    indicator.textContent = folder.name;
    indicator.style.cssText = `
      position: absolute;
      top: 4px;
      right: 4px;
      background: var(--deepseek-primary-static);
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 500;
      z-index: 1000;
    `;

    element.style.position = "relative";
    element.appendChild(indicator);
  }

  private addContextMenuToChat(element: HTMLElement, chatId: string) {
    element.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.showContextMenu(e, chatId);
    });
  }

  private async showContextMenu(event: MouseEvent, chatId: string) {
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
        this.toggleChatInFolder(chatId, folder.id);
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

    // Добавляем опцию "Создать папку"
    const createItem = document.createElement("div");
    createItem.className = "dsm-menu-item";
    createItem.textContent = "+ Создать папку";
    createItem.style.cssText = `
      padding: 8px 16px;
      cursor: pointer;
      font-size: 14px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
      margin-top: 4px;
    `;

    createItem.addEventListener("click", () => {
      this.createFolderForChat(chatId);
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

  private async toggleChatInFolder(chatId: string, folderId: string) {
    // Проверяем, что folders является массивом
    if (!Array.isArray(this.folders)) {
      return;
    }

    const folder = this.folders.find((f) => f.id === folderId);
    if (!folder) return;

    const chatData = this.getOrCreateChatData(chatId);

    const existingChat = folder.chats.find((c) => c.id === chatId);
    const isInFolder = !!existingChat;

    try {
      if (isInFolder) {
        await this.sendMessage({
          type: "REMOVE_CHAT_FROM_FOLDER",
          chatId,
          folderId,
        });
        folder.chats = folder.chats.filter((chat) => chat.id !== chatId);
      } else {
        await this.sendMessage({
          type: "ADD_CHAT_TO_FOLDER",
          chat: chatData,
          folderId,
        });
        folder.chats.push(chatData);
      }

      folder.chatCount = folder.chats.length;

      // Обновляем индикатор на странице
      this.updateChatIndicator(chatId);
    } catch (error) {
      console.error("Ошибка изменения папки чата:", error);
    }
  }

  private async createFolderForChat(chatId: string) {
    const name = prompt("Введите название папки:");
    if (!name) return;

    try {
      // Убеждаемся, что folders является массивом
      if (!Array.isArray(this.folders)) {
        this.folders = [];
      }

      const response = await this.sendMessage<{ folder: Folder }>({
        type: "CREATE_FOLDER",
        name: name.trim(),
      });

      // Добавляем чат в новую папку
      const chatData = this.getOrCreateChatData(chatId);
      await this.sendMessage({
        type: "ADD_CHAT_TO_FOLDER",
        chat: chatData,
        folderId: response.folder.id,
      });
      response.folder.chats.push(chatData);
      response.folder.chatCount = 1;

      // Не пушим локально, дождемся обновления из chrome.storage.onChanged

      // Обновляем индикатор на странице
      this.updateChatIndicator(chatId);
    } catch (error) {
      console.error("Ошибка создания папки:", error);
      alert("Не удалось создать папку");
    }
  }

  private updateChatIndicator(chatId: string) {
    const element = this.chatElements.get(chatId);
    if (!element) return;

    // Удаляем старый индикатор
    const oldIndicator = element.querySelector(".dsm-folder-indicator");
    if (oldIndicator) {
      oldIndicator.remove();
    }

    // Добавляем новый индикатор (только если folders является массивом)
    if (Array.isArray(this.folders)) {
      this.addFolderIndicator(element, chatId);
    }
  }

  private addContextMenu() {
    // Добавляем глобальное контекстное меню для создания папок
    document.addEventListener("contextmenu", (e) => {
      const target = e.target as HTMLElement;
      if (target.closest(".dsm-context-menu")) return;

      // Можно добавить глобальные опции меню здесь
    });
  }

  private setupTokenListener() {
    // Отслеживаем изменения в localStorage для токена
    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;

    localStorage.setItem = function (key, value) {
      originalSetItem.apply(this, [key, value]);
    };

    localStorage.removeItem = function (key) {
      originalRemoveItem.apply(this, [key]);
    };
  }

  private setupNavigationListener() {
    // Отслеживаем изменения URL для SPA навигации
    let currentUrl = window.location.href;

    const checkUrlChange = () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;

        // Очищаем старые элементы
        this.chatElements.clear();

        // Ждем немного и переинициализируем
        setTimeout(() => {
          this.observeChatList();
        }, 1000);
      }
    };

    // Проверяем изменения URL каждые 500мс
    setInterval(checkUrlChange, 500);

    // Также слушаем события popstate для навигации назад/вперед
    window.addEventListener("popstate", () => {
      setTimeout(() => {
        this.chatElements.clear();
        this.observeChatList();
      }, 500);
    });
  }

  private updateAllChatIndicators() {
    // Обновляем индикаторы для всех найденных чатов
    this.chatElements.forEach((_element, chatId) => {
      this.updateChatIndicator(chatId);
    });
  }

  private setupStorageListener() {
    // Chrome Storage Events
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== "local") return;

      if (changes.folders) {
        console.log("Storage: Обнаружено изменение папок");
        const newFolders = changes.folders.newValue || [];

        // Проверяем, действительно ли изменились папки
        if (JSON.stringify(this.folders) !== JSON.stringify(newFolders)) {
          this.folders = newFolders;
          this.updateAllChatIndicators();
          console.log("Storage: Папки обновлены");
        }
      }

      if (changes.theme) {
        console.log("Storage: Обнаружено изменение темы");
        const newTheme = changes.theme.newValue || "system";
        if (this.currentTheme !== newTheme) {
          this.currentTheme = newTheme;
          this.applyTheme(newTheme);
          console.log("Storage: Тема обновлена на:", newTheme);
        }
      }
    });

    // Слушаем сообщения от background script
    chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
      if (message.type === "THEME_CHANGED") {
        this.currentTheme = message.theme;
        this.applyTheme(message.theme);
        console.log("Получено сообщение об изменении темы:", message.theme);
      }
    });
  }

  private injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .dsm-folder-indicator {
        font-family: var(--font-family-primary);
      }
      
      .dsm-context-menu {
        font-family: var(--font-family-primary);
      }
      
      .dsm-menu-item:hover {
        background: #f3f4f6 !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Методы для работы с темами
  private async loadTheme(): Promise<void> {
    try {
      const response = await this.sendMessage<{ theme: Theme }>({
        type: "GET_THEME",
      });
      this.currentTheme = response.theme || "system";
      this.applyTheme(this.currentTheme);
    } catch (error) {
      console.error("Ошибка загрузки темы:", error);
      this.currentTheme = "system";
      this.applyTheme("system");
    }
  }

  private applyTheme(theme: Theme): void {
    const root = document.documentElement;

    if (theme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
  }
}

// Инициализируем менеджер чатов
new DeepSeekChatManager();

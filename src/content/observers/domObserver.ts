import type { Chat } from "@/shared/types";
import { ChatElementsService } from "../dom/chatElements";
import { DeepSeekApiService } from "../api/deepseekApi";
import { EventBus, ChatUpdateEvent } from "../events/eventBus";

export class DomObserver {
  private chatElementsService: ChatElementsService;
  private chatData: Map<string, Chat> = new Map();
  private chatListObserver: MutationObserver | null = null;
  private navigationInterval: number | null = null;
  private dataUpdateInterval: number | null = null;
  private contextMenuService: any = null;

  constructor(chatElementsService: ChatElementsService) {
    this.chatElementsService = chatElementsService;
  }

  /**
   * Устанавливает сервис контекстного меню
   */
  setContextMenuService(contextMenuService: any) {
    this.contextMenuService = contextMenuService;
  }

  /**
   * Начинает наблюдение за списком чатов
   */
  observeChatList() {
    // Сначала загружаем данные чатов через API
    this.fetchChatData();

    // Затем начинаем наблюдение за изменениями DOM
    this.chatListObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          this.processNewChats(mutation.addedNodes);
        }
      });
    });

    // Наблюдаем изменения в document.body
    this.chatListObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Периодически обновляем данные чатов
    this.dataUpdateInterval = window.setInterval(() => {
      this.fetchChatData();
    }, 30000); // Обновляем каждые 30 секунд

    // Также слушаем изменения localStorage для обновлений токена
    this.setupTokenListener();
  }

  /**
   * Останавливает наблюдение за списком чатов
   */
  stopObserving() {
    if (this.chatListObserver) {
      this.chatListObserver.disconnect();
      this.chatListObserver = null;
    }

    if (this.navigationInterval) {
      clearInterval(this.navigationInterval);
      this.navigationInterval = null;
    }

    if (this.dataUpdateInterval) {
      clearInterval(this.dataUpdateInterval);
      this.dataUpdateInterval = null;
    }
  }

  /**
   * Загружает данные чатов через API
   */
  private async fetchChatData() {
    try {
      const newChatData = await DeepSeekApiService.fetchChatData();

      // Обновляем кэш данных чатов
      this.chatData.clear();
      newChatData.forEach((chat, chatId) => {
        this.chatData.set(chatId, chat);
      });

      // Теперь ищем элементы чатов по полученным данным
      this.findChatElementsByData();
    } catch (error) {
      console.error("Error fetching chat data:", error);
    }
  }

  /**
   * Ищет элементы чатов по данным
   */
  private findChatElementsByData() {
    this.chatData.forEach((chat, chatId) => {
      // Поиск элемента по URL
      const elementByUrl = document.querySelector(
        `a[href*="/a/chat/s/${chatId}"]`
      ) as HTMLElement;

      if (elementByUrl) {
        console.log(`✅ Found chat: "${chat.title}" (ID: ${chatId})`);
        this.processChatElement(elementByUrl, chat);
        return;
      }

      // Поиск элемента по заголовку
      const elementByTitle = this.findElementByTitle(chat.title);
      if (elementByTitle) {
        console.log(`✅ Found chat: "${chat.title}" (ID: ${chatId})`);
        this.processChatElement(elementByTitle, chat);
        return;
      }
    });
  }

  /**
   * Ищет элемент по заголовку
   */
  private findElementByTitle(title: string): HTMLElement | null {
    // Поиск всех ссылок чатов
    const chatLinks = document.querySelectorAll('a[href*="/a/chat/s/"]');

    for (const link of chatLinks) {
      const element = link as HTMLElement;
      const elementTitle = this.chatElementsService.getChatTitle(element);

      if (
        elementTitle &&
        elementTitle.toLowerCase().includes(title.toLowerCase())
      ) {
        return element;
      }
    }

    return null;
  }

  /**
   * Обрабатывает элемент чата
   */
  private processChatElement(element: HTMLElement, chat: Chat) {
    this.chatElementsService.processChatElement(
      element,
      chat,
      this.contextMenuService
    );

    // Отправляем событие о новом чате
    EventBus.getInstance().emit({
      type: "CHAT_UPDATE",
      chatId: chat.id,
      chat: chat,
    });
  }

  /**
   * Обрабатывает новые чаты
   */
  private processNewChats(nodes: NodeList) {
    nodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;

        // Проверяем, является ли элемент чатом
        if (this.chatElementsService.isChatItem(element)) {
          this.processChatItemByElement(element);
        }

        // Проверяем дочерние элементы
        const chatItems = element.querySelectorAll(
          'a[href*="/a/chat/s/"], [data-testid="chat-item"], .chat-item, .conversation-item, li[role="listitem"], .chat-history-item, a[href*="/chat/"]'
        );
        chatItems.forEach((item) =>
          this.processChatItemByElement(item as HTMLElement)
        );
      }
    });
  }

  /**
   * Обрабатывает элемент чата по элементу
   */
  private processChatItemByElement(element: HTMLElement) {
    const chatId = this.chatElementsService.extractChatId(element);
    if (!chatId) {
      return;
    }

    // Проверяем, существуют ли данные чата в нашем кэше
    const chatData = this.chatData.get(chatId);
    if (chatData) {
      this.processChatElement(element, chatData);
    } else {
      // Если данных нет, создаем временный объект чата
      const tempChat: Chat = {
        id: chatId,
        title: this.chatElementsService.getChatTitle(element),
        url: element.getAttribute("href") || "",
        createdAt: new Date(),
      };
      this.processChatElement(element, tempChat);
    }
  }

  /**
   * Настраивает слушатель токена
   */
  private setupTokenListener() {
    // Отслеживаем изменения localStorage для токена
    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;

    localStorage.setItem = function (key, value) {
      originalSetItem.apply(this, [key, value]);
    };

    localStorage.removeItem = function (key) {
      originalRemoveItem.apply(this, [key]);
    };
  }

  /**
   * Настраивает слушатель навигации
   */
  setupNavigationListener() {
    // Отслеживаем изменения URL для SPA навигации
    let currentUrl = window.location.href;

    const checkUrlChange = () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;

        // Очищаем старые элементы
        this.chatElementsService.clearChatElements();

        // Ждем немного и переинициализируем
        setTimeout(() => {
          this.observeChatList();
        }, 1000);
      }
    };

    // Проверяем изменения URL каждые 500мс
    this.navigationInterval = window.setInterval(checkUrlChange, 500);

    // Также слушаем события popstate для навигации назад/вперед
    window.addEventListener("popstate", () => {
      setTimeout(() => {
        this.chatElementsService.clearChatElements();
        this.observeChatList();
      }, 500);
    });
  }

  /**
   * Получает данные чата по ID
   */
  getChatData(chatId: string): Chat | undefined {
    return this.chatData.get(chatId);
  }

  /**
   * Получает или создает данные чата
   */
  getOrCreateChatData(chatId: string): Chat {
    const existing = this.chatData.get(chatId);
    if (existing) return existing;

    const minimal: Chat = {
      id: chatId,
      title: `Chat ${chatId}`,
      url: `https://chat.deepseek.com/a/chat/s/${chatId}`,
      createdAt: new Date(),
    };
    this.chatData.set(chatId, minimal);
    return minimal;
  }
}

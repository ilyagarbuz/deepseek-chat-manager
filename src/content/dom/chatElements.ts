import type { Chat, Folder } from "@/shared/types";
import { EventBus, FoldersChangedEvent } from "../events/eventBus";

export class ChatElementsService {
  private chatElements: Map<string, HTMLElement> = new Map();
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
        // Обновляем индикаторы для всех чатов при изменении папок
        this.updateAllChatIndicators();
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
   * Получает селекторы для элементов чатов
   */
  private getChatItemSelector(): string {
    return [
      'a[href*="/a/chat/s/"]', // Основной селектор для DeepSeek чатов
      '[data-testid="chat-item"]',
      ".chat-item",
      ".conversation-item",
      'li[role="listitem"]',
      ".chat-history-item",
      'a[href*="/chat/"]',
    ].join(", ");
  }

  /**
   * Проверяет, является ли элемент чатом
   */
  isChatItem(element: HTMLElement): boolean {
    const selectors = this.getChatItemSelector().split(", ");
    return selectors.some((selector) => element.matches(selector));
  }

  /**
   * Извлекает ID чата из элемента
   */
  extractChatId(element: HTMLElement): string | null {
    // Попытка извлечь ID чата из URL DeepSeek
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

    // Проверка data атрибутов
    const dataId =
      element.getAttribute("data-chat-id") ||
      element.getAttribute("data-id") ||
      element.getAttribute("id");

    if (dataId) return dataId;

    // Генерация ID на основе содержимого (последний шанс)
    const title = this.getChatTitle(element);
    if (title) {
      return btoa(encodeURIComponent(title))
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 16);
    }

    return null;
  }

  /**
   * Получает заголовок чата из элемента
   */
  getChatTitle(element: HTMLElement): string {
    // Поиск заголовка чата в различных элементах
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
      // Поиск в дочерних элементах
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

    // Если не найден, используем полный текст элемента, но ограничиваем длину
    const fullText = element.textContent?.trim() || "";
    return fullText.length > 50 ? fullText.substring(0, 50) + "..." : fullText;
  }

  /**
   * Обрабатывает элемент чата
   */
  processChatElement(
    element: HTMLElement,
    chat: Chat,
    contextMenuService?: any
  ) {
    if (this.chatElements.has(chat.id)) {
      return;
    }

    this.chatElements.set(chat.id, element);
    this.addFolderIndicator(element, chat.id);

    // Добавляем контекстное меню если передан сервис
    if (contextMenuService) {
      contextMenuService.addContextMenuToChat(element, chat.id);
    }
  }

  /**
   * Добавляет индикатор папки к элементу чата
   */
  addFolderIndicator(element: HTMLElement, chatId: string) {
    // Проверяем, что folders является массивом
    if (!Array.isArray(this.folders)) {
      return;
    }

    // Находим все папки, которые содержат этот чат
    const chatFolders = this.folders.filter((f) =>
      f.chats.some((c) => c.id === chatId)
    );

    if (chatFolders.length === 0) return;

    // Создаем контейнер для индикаторов папок
    const container = document.createElement("div");
    container.className = "dsm-folder-indicators";
    container.style.cssText = `
      position: absolute;
      top: 4px;
      right: 4px;
      display: flex;
      gap: 4px;
      z-index: 1000;
    `;

    // Добавляем цветной круг для каждой папки
    chatFolders.forEach((folder) => {
      const indicator = document.createElement("div");
      indicator.className = "dsm-folder-indicator";
      indicator.style.cssText = `
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${folder.color || "#6b7280"};
      `;
      container.appendChild(indicator);
    });

    element.style.position = "relative";
    element.appendChild(container);
  }

  /**
   * Обновляет индикатор чата
   */
  updateChatIndicator(chatId: string) {
    const element = this.chatElements.get(chatId);
    if (!element) return;

    // Удаляем старые индикаторы
    const oldIndicators = element.querySelector(".dsm-folder-indicators");
    if (oldIndicators) {
      oldIndicators.remove();
    }

    // Добавляем новые индикаторы (только если folders является массивом)
    if (Array.isArray(this.folders)) {
      this.addFolderIndicator(element, chatId);
    }
  }

  /**
   * Обновляет индикаторы для всех найденных чатов
   */
  updateAllChatIndicators() {
    this.chatElements.forEach((_element, chatId) => {
      this.updateChatIndicator(chatId);
    });
  }

  /**
   * Очищает кэш элементов чатов
   */
  clearChatElements() {
    this.chatElements.clear();
  }

  /**
   * Получает элемент чата по ID
   */
  getChatElement(chatId: string): HTMLElement | undefined {
    return this.chatElements.get(chatId);
  }

  /**
   * Проверяет, есть ли элемент чата в кэше
   */
  hasChatElement(chatId: string): boolean {
    return this.chatElements.has(chatId);
  }

  /**
   * Получает все элементы чатов
   */
  getAllChatElements(): Map<string, HTMLElement> {
    return new Map(this.chatElements);
  }
}

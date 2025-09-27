// Основной класс для управления расширением DeepSeek
import { DeepSeekApiService } from "./api/deepseekApi";
import { ChatElementsService } from "./dom/chatElements";
import { ContextMenuService } from "./ui/contextMenu";
import { ThemeManager } from "./ui/themeManager";
import { DomObserver } from "./observers/domObserver";
import { StyleInjector } from "./ui/styleInjector";
import { FolderManager } from "./storage/folderManager";

// Extension initialization on DeepSeek page
class DeepSeekChatManager {
  private isInitialized = false;
  private folderManager: FolderManager;
  private chatElementsService: ChatElementsService;
  private contextMenuService: ContextMenuService;
  private themeManager: ThemeManager;
  private domObserver: DomObserver;

  constructor() {
    // Инициализируем сервисы
    this.folderManager = new FolderManager();
    this.chatElementsService = new ChatElementsService([]);
    this.contextMenuService = new ContextMenuService([]);
    this.themeManager = new ThemeManager();
    this.domObserver = new DomObserver(this.chatElementsService);

    this.init();
  }

  private async init() {
    if (this.isInitialized) return;

    // Wait for DOM to load
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.setup());
    } else {
      // If DOM already loaded, wait a bit for SPA
      setTimeout(() => this.setup(), 100);
    }

    this.isInitialized = true;
  }

  private async setup() {
    await this.folderManager.loadFolders();
    await this.themeManager.loadTheme();

    // Обновляем сервисы с загруженными данными (события будут отправлены автоматически)
    this.chatElementsService.updateFolders(this.folderManager.getFolders());
    this.contextMenuService.updateFolders(this.folderManager.getFolders());

    // Устанавливаем контекстное меню в наблюдатель
    this.domObserver.setContextMenuService(this.contextMenuService);

    // Check for authorization token
    const token = DeepSeekApiService.getUserToken();
    if (token) {
      this.domObserver.observeChatList();
    }

    this.contextMenuService.addGlobalContextMenu();
    StyleInjector.injectStyles();
    this.domObserver.setupNavigationListener();
    this.folderManager.setupStorageListener();
    this.themeManager.setupThemeListener();
  }
}

// Initialize chat manager
new DeepSeekChatManager();

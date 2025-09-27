import type {
  Chat,
  Folder,
  Theme,
  ExtensionMessage,
  ExtensionResponse,
} from "@/shared/types";

// Extension initialization on DeepSeek page
class DeepSeekChatManager {
  private isInitialized = false;
  private chatElements: Map<string, HTMLElement> = new Map();
  private folders: Folder[] = [];
  private chatData: Map<string, Chat> = new Map();
  private currentTheme: Theme = "system";

  // Returns chat data from cache, creates minimal from chatId if missing
  private getOrCreateChatData(chatId: string): Chat {
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

  constructor() {
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
    await this.loadFolders();
    await this.loadTheme();

    // Check for authorization token
    const token = this.getUserToken();
    if (token) {
      this.observeChatList();
    }

    this.addContextMenu();
    this.injectStyles();
    this.setupNavigationListener();
    this.setupStorageListener();
  }

  // Function for sending messages to background script
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
      console.error("Error loading folders:", error);
      this.folders = [];
    }
  }

  private getUserToken(): string | null {
    try {
      // Get token from localStorage
      const userTokenData = localStorage.getItem("userToken");

      if (!userTokenData) {
        return null;
      }

      // Parse JSON data
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
      // Get token from localStorage
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
            "accept-language": "en-US,en;q=0.9,ru-RU;q=0.8,ru;q=0.7",
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

      // Process received data
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
            title: chatItem.title || "Untitled",
            url: `/a/chat/s/${chatItem.id}`,
            createdAt: new Date(chatItem.created_at || chatItem.create_time),
            lastMessageAt: chatItem.updated_at
              ? new Date(chatItem.updated_at)
              : new Date(),
          };

          this.chatData.set(chat.id, chat);

          // Chat data now stored only in folders
        });

        // Now search for chat elements by received data
        this.findChatElementsByData();
      }
    } catch (error) {
      // Error loading chat data
    }
  }

  private findChatElementsByData() {
    this.chatData.forEach((chat, chatId) => {
      // Search element by URL
      const elementByUrl = document.querySelector(
        `a[href*="/a/chat/s/${chatId}"]`
      ) as HTMLElement;

      if (elementByUrl) {
        console.log(`✅ Found chat: "${chat.title}" (ID: ${chatId})`);
        this.processChatElement(elementByUrl, chat);
        return;
      }

      // Search element by title
      const elementByTitle = this.findElementByTitle(chat.title);
      if (elementByTitle) {
        console.log(`✅ Found chat: "${chat.title}" (ID: ${chatId})`);
        this.processChatElement(elementByTitle, chat);
        return;
      }
    });
  }

  private findElementByTitle(title: string): HTMLElement | null {
    // Search for all chat links
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
    // First load chat data via API
    this.fetchChatData();

    // Then start observing DOM changes
    const chatListObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          this.processNewChats(mutation.addedNodes);
        }
      });
    });

    // Observe changes in document.body
    chatListObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Periodically update chat data
    setInterval(() => {
      this.fetchChatData();
    }, 30000); // Update every 30 seconds

    // Also listen for localStorage changes for token updates
    this.setupTokenListener();
  }

  private processNewChats(nodes: NodeList) {
    nodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;

        // Check if element is a chat
        if (this.isChatItem(element)) {
          this.processChatItemByElement(element);
        }

        // Check child elements
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

    // Check if chat data exists in our cache
    const chatData = this.chatData.get(chatId);
    if (chatData) {
      this.processChatElement(element, chatData);
    } else {
      // If no data, create temporary chat object
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
    // Selectors for chat elements on DeepSeek
    return [
      'a[href*="/a/chat/s/"]', // Main selector for DeepSeek chats
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
    // Try to extract chat ID from DeepSeek URL
    const href = element.getAttribute("href");
    if (href) {
      // Pattern for DeepSeek URL: /a/chat/s/5fb41622-405b-4690-8474-5f4cacb1a242
      const deepSeekMatch = href.match(/\/a\/chat\/s\/([a-f0-9-]+)/);
      if (deepSeekMatch) {
        return deepSeekMatch[1]; // Return chat UUID
      }

      // Old pattern for compatibility
      const oldMatch = href.match(/\/chat\/([^\/\?]+)/);
      if (oldMatch) return oldMatch[1];
    }

    // Check data attributes
    const dataId =
      element.getAttribute("data-chat-id") ||
      element.getAttribute("data-id") ||
      element.getAttribute("id");

    if (dataId) return dataId;

    // Generate ID based on content (last resort)
    const title = this.getChatTitle(element);
    if (title) {
      return btoa(encodeURIComponent(title))
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 16);
    }

    return null;
  }

  private getChatTitle(element: HTMLElement): string {
    // Search for chat title in various elements
    const titleSelectors = [
      // Specific selectors for DeepSeek
      '[data-testid="chat-title"]',
      ".chat-title",
      ".conversation-title",
      ".conversation-name",
      ".chat-name",
      // General selectors
      "h3",
      "h4",
      ".title",
      "span[title]",
      // Search in child elements
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

    // If not found, use full element text but limit length
    const fullText = element.textContent?.trim() || "";
    return fullText.length > 50 ? fullText.substring(0, 50) + "..." : fullText;
  }

  private addFolderIndicator(element: HTMLElement, chatId: string) {
    // Check if folders is an array
    if (!Array.isArray(this.folders)) {
      return;
    }

    // Find all folders that contain this chat
    const chatFolders = this.folders.filter((f) =>
      f.chats.some((c) => c.id === chatId)
    );

    if (chatFolders.length === 0) return;

    // Create container for folder indicators
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

    // Add a colored circle for each folder
    chatFolders.forEach((folder) => {
      const indicator = document.createElement("div");
      indicator.className = "dsm-folder-indicator";
      indicator.style.cssText = `
        background: ${folder.color || "#6b7280"};
      `;
      container.appendChild(indicator);
    });

    element.style.position = "relative";
    element.appendChild(container);
  }

  private addContextMenuToChat(element: HTMLElement, chatId: string) {
    element.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.showContextMenu(e, chatId);
    });
  }

  private async showContextMenu(event: MouseEvent, chatId: string) {
    // Remove existing menu
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

    // Check if folders is an array
    if (!Array.isArray(this.folders)) {
      return;
    }

    // Add options for each folder
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

    // Add "Create folder" option
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
      this.createFolderForChat(chatId);
      menu.remove();
    });

    menu.appendChild(createItem);

    document.body.appendChild(menu);

    // Close menu when clicking outside
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
    // Check if folders is an array
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

      // Update indicator on page
      this.updateChatIndicator(chatId);
    } catch (error) {
      console.error("Error changing chat folder:", error);
    }
  }

  private async createFolderForChat(chatId: string) {
    const name = prompt("Enter folder name:");
    if (!name) return;

    try {
      // Ensure folders is an array
      if (!Array.isArray(this.folders)) {
        this.folders = [];
      }

      const response = await this.sendMessage<{ folder: Folder }>({
        type: "CREATE_FOLDER",
        name: name.trim(),
      });

      // Add chat to new folder
      const chatData = this.getOrCreateChatData(chatId);
      await this.sendMessage({
        type: "ADD_CHAT_TO_FOLDER",
        chat: chatData,
        folderId: response.folder.id,
      });
      response.folder.chats.push(chatData);
      response.folder.chatCount = 1;

      // Don't push locally, wait for update from chrome.storage.onChanged

      // Update indicator on page
      this.updateChatIndicator(chatId);
    } catch (error) {
      console.error("Error creating folder:", error);
      alert("Failed to create folder");
    }
  }

  private updateChatIndicator(chatId: string) {
    const element = this.chatElements.get(chatId);
    if (!element) return;

    // Remove old indicators
    const oldIndicators = element.querySelector(".dsm-folder-indicators");
    if (oldIndicators) {
      oldIndicators.remove();
    }

    // Add new indicators (only if folders is an array)
    if (Array.isArray(this.folders)) {
      this.addFolderIndicator(element, chatId);
    }
  }

  private addContextMenu() {
    // Add global context menu for creating folders
    document.addEventListener("contextmenu", (e) => {
      const target = e.target as HTMLElement;
      if (target.closest(".dsm-context-menu")) return;

      // Can add global menu options here
    });
  }

  private setupTokenListener() {
    // Track localStorage changes for token
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
    // Track URL changes for SPA navigation
    let currentUrl = window.location.href;

    const checkUrlChange = () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;

        // Clear old elements
        this.chatElements.clear();

        // Wait a bit and reinitialize
        setTimeout(() => {
          this.observeChatList();
        }, 1000);
      }
    };

    // Check URL changes every 500ms
    setInterval(checkUrlChange, 500);

    // Also listen for popstate events for back/forward navigation
    window.addEventListener("popstate", () => {
      setTimeout(() => {
        this.chatElements.clear();
        this.observeChatList();
      }, 500);
    });
  }

  private updateAllChatIndicators() {
    // Update indicators for all found chats
    this.chatElements.forEach((_element, chatId) => {
      this.updateChatIndicator(chatId);
    });
  }

  private setupStorageListener() {
    // Chrome Storage Events
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== "local") return;

      if (changes.folders) {
        console.log("Storage: Detected folder changes");
        const newFolders = changes.folders.newValue || [];

        // Check if folders really changed
        if (JSON.stringify(this.folders) !== JSON.stringify(newFolders)) {
          this.folders = newFolders;
          this.updateAllChatIndicators();
          console.log("Storage: Folders updated");
        }
      }

      if (changes.theme) {
        console.log("Storage: Detected theme change");
        const newTheme = changes.theme.newValue || "system";
        if (this.currentTheme !== newTheme) {
          this.currentTheme = newTheme;
          this.applyTheme(newTheme);
          console.log("Storage: Theme updated to:", newTheme);
        }
      }
    });

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
      if (message.type === "THEME_CHANGED") {
        this.currentTheme = message.theme;
        this.applyTheme(message.theme);
        console.log("Received theme change message:", message.theme);
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

  // Methods for working with themes
  private async loadTheme(): Promise<void> {
    try {
      const response = await this.sendMessage<{ theme: Theme }>({
        type: "GET_THEME",
      });
      this.currentTheme = response.theme || "system";
      this.applyTheme(this.currentTheme);
    } catch (error) {
      console.error("Error loading theme:", error);
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

// Initialize chat manager
new DeepSeekChatManager();

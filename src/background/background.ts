import type {
  Chat,
  Folder,
  Theme,
  ExtensionMessage,
  ExtensionResponse,
} from "@/shared/types";
import { generateRandomColor } from "@/shared/utils";

// Background script for extension management
class BackgroundManager {
  private folders: Folder[] = [];
  private theme: Theme = "system";

  constructor() {
    this.init();
  }

  private async init() {
    console.log("DeepSeek Chat Manager: Background script initialized");

    // Load data on startup
    await this.loadData();

    // Setup event listeners
    this.setupEventListeners();

    // Setup periodic synchronization
    this.setupPeriodicSync();
  }

  private async loadData() {
    try {
      const result = await chrome.storage.local.get(["folders", "theme"]);
      this.folders = result.folders || [];
      this.theme = result.theme || "system";

      const totalChats = this.folders.reduce(
        (sum, folder) => sum + folder.chats.length,
        0
      );
      console.log(
        `Loaded ${this.folders.length} folders and ${totalChats} chats, theme: ${this.theme}`
      );
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

  private setupEventListeners() {
    // Listen for messages from content script and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Indicate that response will be asynchronous
    });

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      this.handleStorageChange(changes, namespace);
    });

    // Listen for extension installation/update
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstall(details);
    });

    // Listen for tab activation
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleTabActivation(activeInfo);
    });

    // Listen for tab updates
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

        case "GET_THEME":
          sendResponse({ theme: this.theme });
          break;

        case "SET_THEME":
          await this.setTheme(message.theme);
          sendResponse({ success: true });
          break;

        default:
          console.warn("Unknown message type:", (message as any).type);
          sendResponse({ error: "Unknown message type" });
      }
    } catch (error) {
      console.error("Error processing message:", error);
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
        "Folders updated:",
        this.folders.length,
        "chats:",
        totalChats
      );
    }

    if (changes.theme) {
      this.theme = changes.theme.newValue || "system";
      console.log("Theme changed to:", this.theme);

      // Notify all tabs about theme change
      this.notifyTabsAboutThemeChange();
    }
  }

  private async handleInstall(details: chrome.runtime.InstalledDetails) {
    console.log("Extension installed/updated:", details.reason);

    if (details.reason === "install") {
      // Initial setup
      await this.initializeDefaultData();
    } else if (details.reason === "update") {
      // Update - can add data migration
      await this.migrateData();
    }
  }

  private async handleTabActivation(activeInfo: { tabId: number }) {
    // Get tab information
    const tab = await chrome.tabs.get(activeInfo.tabId);

    if (this.isDeepSeekTab(tab)) {
      console.log("DeepSeek tab activated");
      // Can add logic for synchronization with active tab
    }
  }

  private async handleTabUpdate(
    tabId: number,
    changeInfo: { status?: string },
    tab: chrome.tabs.Tab
  ) {
    if (changeInfo.status === "complete" && this.isDeepSeekTab(tab)) {
      console.log("DeepSeek page loaded");

      // Inject content script if needed
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ["dist/content.js"],
        });
      } catch (error) {
        // Content script already loaded or injection error
        console.log("Content script already loaded or error:", error);
      }
    }
  }

  private isDeepSeekTab(tab: chrome.tabs.Tab): boolean {
    return tab.url?.includes("chat.deepseek.com") || false;
  }

  private async initializeDefaultData() {
    // Create default folder
    const defaultFolder: Folder = {
      id: "default",
      name: "General chats",
      chats: [],
      chatCount: 0,
      createdAt: new Date(),
      color: generateRandomColor(),
    };

    this.folders = [defaultFolder];
    await chrome.storage.local.set({
      folders: this.folders,
      theme: "system",
    });
  }

  private async migrateData() {
    // Data migration logic on update
    console.log("Migrating data...");
  }

  private async createFolder(name: string): Promise<Folder> {
    const newFolder: Folder = {
      id: Date.now().toString(),
      name: name.trim(),
      chats: [],
      chatCount: 0,
      createdAt: new Date(),
      color: generateRandomColor(),
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

    // Check if chat already exists in folder
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
    // Synchronization every 5 minutes
    setInterval(async () => {
      await this.performPeriodicSync();
    }, 5 * 60 * 1000);
  }

  private async performPeriodicSync() {
    console.log("Performing periodic sync...");

    // Here you can add logic for synchronization with external sources
    // or cleanup of outdated data
  }

  private async setTheme(theme: Theme): Promise<void> {
    this.theme = theme;
    await chrome.storage.local.set({ theme: this.theme });

    // Notify all tabs about theme change
    this.notifyTabsAboutThemeChange();
  }

  private async notifyTabsAboutThemeChange(): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({ url: "*://chat.deepseek.com/*" });

      for (const tab of tabs) {
        if (tab.id) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: "THEME_CHANGED",
              theme: this.theme,
            });
          } catch (error) {
            // Content script may not be loaded
            console.log("Failed to send message to tab", tab.id);
          }
        }
      }
    } catch (error) {
      console.error("Error notifying tabs about theme change:", error);
    }
  }
}

// Initialize background manager
new BackgroundManager();

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
      // Try to load from sync storage first, fallback to local
      let result = await chrome.storage.sync.get(["folders", "theme"]);

      // If no data in sync storage, try local storage and migrate
      if (!result.folders && !result.theme) {
        const localResult = await chrome.storage.local.get([
          "folders",
          "theme",
        ]);
        if (localResult.folders || localResult.theme) {
          console.log("Migrating data from local to sync storage");
          await chrome.storage.sync.set({
            folders: localResult.folders || [],
            theme: localResult.theme || "system",
          });
          // Clear local storage after migration
          await chrome.storage.local.remove(["folders", "theme"]);
          result = localResult;
        }
      }

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
      // Fallback to local storage if sync fails
      try {
        const localResult = await chrome.storage.local.get([
          "folders",
          "theme",
        ]);
        this.folders = localResult.folders || [];
        this.theme = localResult.theme || "system";
        console.log("Fallback to local storage successful");
      } catch (localError) {
        console.error("Error loading from local storage:", localError);
      }
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

        case "RENAME_FOLDER":
          await this.renameFolder(message.folderId, message.newName);
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

        case "GET_SYNC_STATUS":
          const syncStatus = await this.getSyncStatus();
          sendResponse(syncStatus);
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
    // Handle both sync and local storage changes
    if (namespace !== "sync" && namespace !== "local") return;

    if (changes.folders) {
      this.folders = changes.folders.newValue || [];
      const totalChats = this.folders.reduce(
        (sum, folder) => sum + folder.chats.length,
        0
      );
      console.log(
        `Folders updated from ${namespace}:`,
        this.folders.length,
        "chats:",
        totalChats
      );
    }

    if (changes.theme) {
      this.theme = changes.theme.newValue || "system";
      console.log(`Theme changed to: ${this.theme} (from ${namespace})`);

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
    await this.saveToSyncStorage({
      folders: this.folders,
      theme: "system",
    });
  }

  private async migrateData() {
    // Data migration logic on update
    console.log("Migrating data...");

    // Check if we need to migrate from local to sync storage
    try {
      const syncData = await chrome.storage.sync.get(["folders", "theme"]);
      const localData = await chrome.storage.local.get(["folders", "theme"]);

      // If sync storage is empty but local has data, migrate
      if (
        !syncData.folders &&
        !syncData.theme &&
        (localData.folders || localData.theme)
      ) {
        console.log("Migrating data from local to sync storage during update");
        await chrome.storage.sync.set({
          folders: localData.folders || [],
          theme: localData.theme || "system",
        });
        // Clear local storage after migration
        await chrome.storage.local.remove(["folders", "theme"]);
        console.log("Migration completed");
      }
    } catch (error) {
      console.error("Error during data migration:", error);
    }
  }

  /**
   * Saves data to sync storage with fallback to local storage
   */
  private async saveToSyncStorage(data: {
    folders?: Folder[];
    theme?: Theme;
  }): Promise<void> {
    try {
      await chrome.storage.sync.set(data);
      console.log("Data saved to sync storage");
    } catch (error) {
      console.error("Error saving to sync storage:", error);
      // Fallback to local storage if sync fails
      try {
        await chrome.storage.local.set(data);
        console.log("Data saved to local storage as fallback");
      } catch (localError) {
        console.error("Error saving to local storage:", localError);
        throw localError;
      }
    }
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
    await this.saveToSyncStorage({ folders: this.folders });

    return newFolder;
  }

  private async deleteFolder(folderId: string): Promise<void> {
    this.folders = this.folders.filter((f) => f.id !== folderId);
    await this.saveToSyncStorage({ folders: this.folders });
  }

  private async renameFolder(folderId: string, newName: string): Promise<void> {
    const folder = this.folders.find((f) => f.id === folderId);
    if (!folder) {
      throw new Error("Folder not found");
    }

    folder.name = newName.trim();
    await this.saveToSyncStorage({ folders: this.folders });
  }

  private async addChatToFolder(chat: Chat, folderId: string): Promise<void> {
    const folder = this.folders.find((f) => f.id === folderId);
    if (!folder) return;

    // Check if chat already exists in folder
    const existingChat = folder.chats.find((c) => c.id === chat.id);
    if (!existingChat) {
      folder.chats.push(chat);
      folder.chatCount = folder.chats.length;
      await this.saveToSyncStorage({ folders: this.folders });
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
    await this.saveToSyncStorage({ folders: this.folders });
  }

  private setupPeriodicSync() {
    // Synchronization every 5 minutes
    setInterval(async () => {
      await this.performPeriodicSync();
    }, 5 * 60 * 1000);
  }

  private async performPeriodicSync() {
    console.log("Performing periodic sync...");

    try {
      // Check sync storage quota and status
      const syncQuota = await chrome.storage.sync.getBytesInUse();
      const maxQuota = chrome.storage.sync.QUOTA_BYTES;

      console.log(`Sync storage usage: ${syncQuota}/${maxQuota} bytes`);

      if (syncQuota > maxQuota * 0.9) {
        console.warn("Sync storage is nearly full, consider cleanup");
      }

      // Verify data integrity
      const syncData = await chrome.storage.sync.get(["folders", "theme"]);
      if (syncData.folders && Array.isArray(syncData.folders)) {
        console.log(
          `Sync verification: ${syncData.folders.length} folders in sync storage`
        );
      }
    } catch (error) {
      console.error("Error during periodic sync:", error);
    }
  }

  private async setTheme(theme: Theme): Promise<void> {
    this.theme = theme;
    await this.saveToSyncStorage({ theme: this.theme });

    // Notify all tabs about theme change
    this.notifyTabsAboutThemeChange();
  }

  private async getSyncStatus() {
    try {
      const quotaUsed = await chrome.storage.sync.getBytesInUse();
      const quotaMax = chrome.storage.sync.QUOTA_BYTES;

      return {
        syncEnabled: true,
        quotaUsed,
        quotaMax,
        lastSyncTime: new Date(),
      };
    } catch (error) {
      console.error("Error getting sync status:", error);
      return {
        syncEnabled: false,
        quotaUsed: 0,
        quotaMax: 0,
        error: "Failed to get sync status",
      };
    }
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

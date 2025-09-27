import { ref } from "vue";
import type {
  Folder,
  Chat,
  Theme,
  ExtensionMessage,
  ExtensionResponse,
} from "@/shared/types";

// Function for sending messages to background script
const sendMessage = async <T extends ExtensionResponse>(
  message: ExtensionMessage
): Promise<T> => {
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
};

export const useFolders = () => {
  const folders = ref<Folder[]>([]);
  const selectedFolder = ref<string | null>(null);

  const loadFolders = async () => {
    try {
      const response = await sendMessage<{ folders: Folder[] }>({
        type: "GET_FOLDERS",
      });
      folders.value = response.folders || [];
    } catch (error) {
      console.error("Error loading folders:", error);
      folders.value = [];
    }
  };

  const createFolder = async () => {
    const name = prompt("Enter folder name:");
    if (!name) return;

    try {
      const response = await sendMessage<{ folder: Folder }>({
        type: "CREATE_FOLDER",
        name: name.trim(),
      });
      folders.value.push(response.folder);
    } catch (error) {
      console.error("Error creating folder:", error);
      alert("Failed to create folder");
    }
  };

  const deleteFolder = async (folderId: string) => {
    if (!confirm("Delete folder? All chats will be removed from it.")) return;

    try {
      await sendMessage({
        type: "DELETE_FOLDER",
        folderId,
      });
      folders.value = folders.value.filter((f) => f.id !== folderId);
      if (selectedFolder.value === folderId) {
        selectedFolder.value = null;
      }
    } catch (error) {
      console.error("Error deleting folder:", error);
      alert("Failed to delete folder");
    }
  };

  const selectFolder = (folderId: string) => {
    selectedFolder.value = selectedFolder.value === folderId ? null : folderId;
  };

  const getFolderName = (folderId: string) => {
    const folder = folders.value.find((f: Folder) => f.id === folderId);
    return folder?.name || "";
  };

  const getFolderChats = (folderId: string): Chat[] => {
    const folder = folders.value.find((f: Folder) => f.id === folderId);
    if (!folder) return [];

    // Return chats directly from folder
    return folder.chats;
  };

  const removeChatFromFolder = async (chatId: string, folderId: string) => {
    try {
      await sendMessage({
        type: "REMOVE_CHAT_FROM_FOLDER",
        chatId,
        folderId,
      });

      const folder = folders.value.find((f: Folder) => f.id === folderId);
      if (folder) {
        folder.chats = folder.chats.filter((chat: Chat) => chat.id !== chatId);
        folder.chatCount = folder.chats.length;
      }
    } catch (error) {
      console.error("Error removing chat from folder:", error);
      alert("Failed to remove chat from folder");
    }
  };

  return {
    folders,
    selectedFolder,
    loadFolders,
    createFolder,
    deleteFolder,
    selectFolder,
    getFolderName,
    getFolderChats,
    removeChatFromFolder,
  };
};

export const useChats = () => {
  const openChat = (chat: Chat) => {
    if (chat.url) {
      chrome.tabs.create({ url: chat.url });
    }
  };

  return {
    openChat,
  };
};

export const useTheme = () => {
  const currentTheme = ref<Theme>("system");

  const loadTheme = async () => {
    try {
      const response = await sendMessage<{ theme: Theme }>({
        type: "GET_THEME",
      });
      currentTheme.value = response.theme || "system";
      applyTheme(currentTheme.value);
    } catch (error) {
      console.error("Error loading theme:", error);
      currentTheme.value = "system";
      applyTheme("system");
    }
  };

  const toggleTheme = async () => {
    const themes: Theme[] = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(currentTheme.value);
    const nextTheme = themes[(currentIndex + 1) % themes.length];

    try {
      await sendMessage({
        type: "SET_THEME",
        theme: nextTheme,
      });
      currentTheme.value = nextTheme;
      applyTheme(nextTheme);
    } catch (error) {
      console.error("Error setting theme:", error);
    }
  };

  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;

    if (theme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
  };

  const getThemeIcon = (): string => {
    switch (currentTheme.value) {
      case "light":
        return "☀️";
      case "dark":
        return "🌙";
      case "system":
        return "💻";
      default:
        return "💻";
    }
  };

  const getThemeTitle = (): string => {
    switch (currentTheme.value) {
      case "light":
        return "Light theme";
      case "dark":
        return "Dark theme";
      case "system":
        return "System theme";
      default:
        return "System theme";
    }
  };

  return {
    currentTheme,
    loadTheme,
    toggleTheme,
    applyTheme,
    getThemeIcon,
    getThemeTitle,
  };
};

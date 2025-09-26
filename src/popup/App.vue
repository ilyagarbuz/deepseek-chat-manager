<template>
  <div class="app">
    <header class="header">
      <div class="header-content">
        <div class="header-text">
          <h1>DeepSeek Chat Manager</h1>
          <p class="subtitle">Управление папками чатов</p>
        </div>
        <div class="theme-toggle">
          <button
            @click="toggleTheme"
            class="theme-btn"
            :title="getThemeTitle()"
          >
            {{ getThemeIcon() }}
          </button>
        </div>
      </div>
    </header>

    <main class="main">
      <div class="folders-section">
        <div class="section-header">
          <h2>Папки</h2>
          <button @click="createFolder" class="btn btn-primary">
            + Создать папку
          </button>
        </div>

        <div class="folders-list">
          <div
            v-for="folder in folders"
            :key="folder.id"
            class="folder-item"
            :class="{ active: selectedFolder === folder.id }"
            @click="selectFolder(folder.id)"
          >
            <span class="folder-name">{{ folder.name }}</span>
            <span class="folder-count">({{ folder.chatCount }})</span>
            <button
              @click.stop="deleteFolder(folder.id)"
              class="btn-delete"
              title="Удалить папку"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <div class="chats-section" v-if="selectedFolder">
        <div class="section-header">
          <h3>Чаты в папке "{{ getFolderName(selectedFolder) }}"</h3>
        </div>

        <div class="chats-list">
          <div
            v-for="chat in getFolderChats(selectedFolder)"
            :key="chat.id"
            class="chat-item"
          >
            <div class="chat-content" @click="openChat(chat)">
              <span class="chat-title">{{ chat.title }}</span>
            </div>
            <div class="chat-actions">
              <button
                @click.stop="removeChatFromFolder(chat.id)"
                class="btn-remove"
                title="Убрать из папки"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer class="footer">
      <p class="help-text">
        Откройте чат на DeepSeek и используйте контекстное меню для добавления в
        папку
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import type {
  Folder,
  Chat,
  Theme,
  ExtensionMessage,
  ExtensionResponse,
} from "@/shared/types";

const folders = ref<Folder[]>([]);
const selectedFolder = ref<string | null>(null);
const currentTheme = ref<Theme>("system");

// Функция для отправки сообщений в background script
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

onMounted(async () => {
  await loadFolders();
  await loadTheme();
});

const loadFolders = async () => {
  try {
    const response = await sendMessage<{ folders: Folder[] }>({
      type: "GET_FOLDERS",
    });
    folders.value = response.folders || [];
  } catch (error) {
    console.error("Ошибка загрузки папок:", error);
    folders.value = [];
  }
};

const createFolder = async () => {
  const name = prompt("Введите название папки:");
  if (!name) return;

  try {
    const response = await sendMessage<{ folder: Folder }>({
      type: "CREATE_FOLDER",
      name: name.trim(),
    });
    folders.value.push(response.folder);
  } catch (error) {
    console.error("Ошибка создания папки:", error);
    alert("Не удалось создать папку");
  }
};

const deleteFolder = async (folderId: string) => {
  if (!confirm("Удалить папку? Все чаты будут убраны из неё.")) return;

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
    console.error("Ошибка удаления папки:", error);
    alert("Не удалось удалить папку");
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

  // Возвращаем чаты напрямую из папки
  return folder.chats;
};

const removeChatFromFolder = async (chatId: string) => {
  if (!selectedFolder.value) return;

  try {
    await sendMessage({
      type: "REMOVE_CHAT_FROM_FOLDER",
      chatId,
      folderId: selectedFolder.value,
    });

    const folder = folders.value.find(
      (f: Folder) => f.id === selectedFolder.value
    );
    if (folder) {
      folder.chats = folder.chats.filter((chat: Chat) => chat.id !== chatId);
      folder.chatCount = folder.chats.length;
    }
  } catch (error) {
    console.error("Ошибка удаления чата из папки:", error);
    alert("Не удалось убрать чат из папки");
  }
};

const openChat = (chat: Chat) => {
  if (chat.url) {
    const url = `https://chat.deepseek.com${chat.url}`;
    chrome.tabs.create({ url: url });
  }
};

// Функции для работы с темами
const loadTheme = async () => {
  try {
    const response = await sendMessage<{ theme: Theme }>({
      type: "GET_THEME",
    });
    currentTheme.value = response.theme || "system";
    applyTheme(currentTheme.value);
  } catch (error) {
    console.error("Ошибка загрузки темы:", error);
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
    console.error("Ошибка установки темы:", error);
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
      return "Светлая тема";
    case "dark":
      return "Темная тема";
    case "system":
      return "Системная тема";
    default:
      return "Системная тема";
  }
};
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-primary);
  font-family: var(--font-family-primary);
  transition: background-color 0.3s ease;
}

.header {
  background: var(--deepseek-primary-static);
  color: white;
  padding: 16px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-text {
  flex: 1;
}

.header h1 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
}

.subtitle {
  margin: 0;
  font-size: 12px;
  opacity: 0.9;
}

.theme-toggle {
  margin-left: 12px;
}

.theme-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: white;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.theme-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

.main {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h2,
.section-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.folders-section {
  margin-bottom: 24px;
}

.folders-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.folder-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.folder-item:hover {
  border-color: var(--deepseek-primary-static);
  box-shadow: 0 2px 4px var(--shadow-color);
}

.folder-item.active {
  border-color: var(--deepseek-primary-static);
}

.folder-name {
  flex: 1;
  font-weight: 500;
  color: var(--text-primary);
}

.folder-count {
  color: var(--text-secondary);
  font-size: 12px;
  margin-right: 8px;
}

.chats-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chat-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  transition: all 0.2s;
}

.chat-item:hover {
  border-color: var(--deepseek-primary-static);
  box-shadow: 0 2px 4px var(--shadow-color);
}

.chat-content {
  flex: 1;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chat-title {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}

.chat-url {
  font-size: 11px;
  color: var(--text-secondary);
  font-family: monospace;
}

.chat-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  font-family: var(--font-family-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--deepseek-primary-static);
  color: white;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-delete,
.btn-remove {
  background: #ef4444;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  font-family: var(--font-family-primary);
  cursor: pointer;
  border: none;
}

.btn-delete:hover,
.btn-remove:hover {
  background: #dc2626;
}

.btn-open {
  background: #10b981;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  font-family: var(--font-family-primary);
  cursor: pointer;
  border: none;
}

.btn-open:hover {
  background: #059669;
}

.footer {
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-top: 1px solid var(--border-color);
}

.help-text {
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.4;
}
</style>

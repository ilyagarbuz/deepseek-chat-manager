<template>
  <div class="app">
    <header class="header">
      <h1>DeepSeek Chat Manager</h1>
      <p class="subtitle">Управление папками чатов</p>
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
  ExtensionMessage,
  ExtensionResponse,
} from "@/shared/types";

const folders = ref<Folder[]>([]);
const selectedFolder = ref<string | null>(null);

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
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f8f9fa;
  font-family: var(--font-family-primary);
}

.header {
  background: var(--deepseek-primary-static);
  color: white;
  padding: 16px;
  text-align: center;
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
  color: #374151;
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
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.folder-item:hover {
  border-color: var(--deepseek-primary-static);
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.1);
}

.folder-item.active {
  border-color: var(--deepseek-primary-static);
  background: #eff6ff;
}

.folder-name {
  flex: 1;
  font-weight: 500;
  color: #374151;
}

.folder-count {
  color: #6b7280;
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
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  transition: all 0.2s;
}

.chat-item:hover {
  border-color: var(--deepseek-primary-static);
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.1);
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
  color: #374151;
  font-weight: 500;
}

.chat-url {
  font-size: 11px;
  color: #6b7280;
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
  background: #f3f4f6;
  border-top: 1px solid #e5e7eb;
}

.help-text {
  margin: 0;
  font-size: 11px;
  color: #6b7280;
  text-align: center;
  line-height: 1.4;
}
</style>

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
            <span class="chat-title">{{ chat.title }}</span>
            <button
              @click="removeChatFromFolder(chat.id)"
              class="btn-remove"
              title="Убрать из папки"
            >
              ×
            </button>
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
import type { Folder, Chat } from "@/shared/types";

const folders = ref<Folder[]>([]);
const selectedFolder = ref<string | null>(null);

onMounted(async () => {
  await loadFolders();
});

const loadFolders = async () => {
  const result = await chrome.storage.local.get(["folders"]);
  folders.value = result.folders || [];
};

const createFolder = async () => {
  const name = prompt("Введите название папки:");
  if (!name) return;

  const newFolder: Folder = {
    id: Date.now().toString(),
    name: name.trim(),
    chatIds: [],
    chatCount: 0,
  };

  folders.value.push(newFolder);
  await saveFolders();
};

const deleteFolder = async (folderId: string) => {
  if (!confirm("Удалить папку? Все чаты будут убраны из неё.")) return;

  folders.value = folders.value.filter((f) => f.id !== folderId);
  if (selectedFolder.value === folderId) {
    selectedFolder.value = null;
  }
  await saveFolders();
};

const selectFolder = (folderId: string) => {
  selectedFolder.value = selectedFolder.value === folderId ? null : folderId;
};

const getFolderName = (folderId: string) => {
  const folder = folders.value.find((f) => f.id === folderId);
  return folder?.name || "";
};

const getFolderChats = (folderId: string): Chat[] => {
  const folder = folders.value.find((f) => f.id === folderId);
  if (!folder) return [];

  // Здесь нужно будет получать данные чатов из storage
  return folder.chatIds.map((id) => ({
    id,
    title: `Чат ${id}`, // Временное название
    url: "",
    createdAt: new Date(),
  }));
};

const removeChatFromFolder = async (chatId: string) => {
  if (!selectedFolder.value) return;

  const folder = folders.value.find((f) => f.id === selectedFolder.value);
  if (folder) {
    folder.chatIds = folder.chatIds.filter((id) => id !== chatId);
    folder.chatCount = folder.chatIds.length;
    await saveFolders();
  }
};

const saveFolders = async () => {
  await chrome.storage.local.set({ folders: folders.value });
};
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f8f9fa;
}

.header {
  background: #2563eb;
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
  border-color: #2563eb;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.1);
}

.folder-item.active {
  border-color: #2563eb;
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
}

.chat-title {
  flex: 1;
  font-size: 13px;
  color: #374151;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #2563eb;
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
  cursor: pointer;
  border: none;
}

.btn-delete:hover,
.btn-remove:hover {
  background: #dc2626;
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

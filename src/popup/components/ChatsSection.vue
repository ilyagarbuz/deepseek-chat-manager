<template>
  <div class="chats-section" v-if="selectedFolder">
    <div class="section-header">
      <h3>Chats in folder "{{ getFolderName(selectedFolder) }}"</h3>
    </div>

    <div class="chats-list">
      <div
        v-for="chat in getFolderChats(selectedFolder)"
        :key="chat.id"
        class="chat-item"
      >
        <div class="chat-content" @click="$emit('open-chat', chat)">
          <span class="chat-title">{{ chat.title }}</span>
        </div>
        <div class="chat-actions">
          <button
            @click.stop="$emit('remove-chat', chat.id)"
            class="btn-remove"
            title="Remove from folder"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Folder, Chat } from "@/shared/types";

const props = defineProps<{
  folders: Folder[];
  selectedFolder: string | null;
}>();

defineEmits<{
  "open-chat": [chat: Chat];
  "remove-chat": [chatId: string];
}>();

const getFolderName = (folderId: string) => {
  const folder = props.folders.find((f: Folder) => f.id === folderId);
  return folder?.name || "";
};

const getFolderChats = (folderId: string): Chat[] => {
  const folder = props.folders.find((f: Folder) => f.id === folderId);
  if (!folder) return [];

  // Return chats directly from folder
  return folder.chats;
};
</script>

<style scoped>
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
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

.btn-remove:hover {
  background: #dc2626;
}
</style>

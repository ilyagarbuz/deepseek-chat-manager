<template>
  <div class="folders-section">
    <div class="folders-list">
      <div
        v-for="folder in folders"
        :key="folder.id"
        class="folder-container"
        :class="{ active: selectedFolder === folder.id }"
      >
        <!-- Folder Header -->
        <div
          class="folder-item"
          :style="{ backgroundColor: folder.color || '#f3f4f6' }"
          @click="toggleFolder(folder.id)"
        >
          <div class="folder-header">
            <IconButton
              :icon="isExpanded(folder.id) ? FolderOpen : FolderClosed"
              :size="16"
              variant="default"
              circular
              title="Toggle folder"
              @click.stop="toggleFolder(folder.id)"
            />
            <span class="folder-name">{{ folder.name }}</span>
          </div>
          <IconButton
            :icon="Trash"
            :size="14"
            variant="danger"
            circular
            title="Delete folder"
            @click.stop="$emit('delete-folder', folder.id)"
          />
        </div>

        <!-- Folder Chats -->
        <div v-if="isExpanded(folder.id)" class="folder-chats">
          <div v-for="chat in folder.chats" :key="chat.id" class="chat-item">
            <div class="chat-content" @click="$emit('open-chat', chat)">
              <span class="chat-title">{{ chat.title }}</span>
            </div>
            <div class="chat-actions">
              <IconButton
                :icon="Trash"
                :size="14"
                variant="danger"
                circular
                title="Remove from folder"
                @click="$emit('remove-chat', chat.id, folder.id)"
              />
            </div>
          </div>

          <div v-if="folder.chats.length === 0" class="empty-folder">
            <span>No chats in this folder</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Trash, FolderOpen, FolderClosed } from "lucide-vue-next";
import type { Folder, Chat } from "@/shared/types";
import IconButton from "./ui/IconButton.vue";

defineProps<{
  folders: Folder[];
  selectedFolder: string | null;
}>();

defineEmits<{
  "select-folder": [folderId: string];
  "delete-folder": [folderId: string];
  "open-chat": [chat: Chat];
  "remove-chat": [chatId: string, folderId: string];
}>();

// Track expanded folders
const expandedFolders = ref<Set<string>>(new Set());

const toggleFolder = (folderId: string) => {
  if (expandedFolders.value.has(folderId)) {
    expandedFolders.value.delete(folderId);
  } else {
    expandedFolders.value.add(folderId);
  }
};

const isExpanded = (folderId: string) => {
  return expandedFolders.value.has(folderId);
};
</script>

<style scoped>
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h2 {
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

.folder-container {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
}

.folder-container:hover {
  border-color: var(--deepseek-primary-static);
  box-shadow: 0 2px 4px var(--shadow-color);
}

.folder-container.active {
  border-color: var(--deepseek-primary-static);
}

.folder-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--bg-tertiary);
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.8;
}

.folder-item:hover {
  opacity: 1;
}

.folder-header {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 3px;
}

.folder-name {
  font-weight: 500;
  color: var(--text-primary);
}

.folder-count {
  color: var(--text-secondary);
  font-size: 12px;
}

.folder-chats {
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  padding: 8px;
}

.chat-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  margin-bottom: 4px;
  transition: all 0.2s;
}

.chat-item:last-child {
  margin-bottom: 0;
}

.chat-item:hover {
  border-color: var(--deepseek-primary-static);
  box-shadow: 0 1px 3px var(--shadow-color);
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

.chat-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.empty-folder {
  padding: 12px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 12px;
  font-style: italic;
}
</style>

<template>
  <div class="folders-section">
    <div class="section-header">
      <h2>Folders</h2>
      <button @click="$emit('create-folder')" class="btn btn-primary">
        + Create folder
      </button>
    </div>

    <div class="folders-list">
      <div
        v-for="folder in folders"
        :key="folder.id"
        class="folder-item"
        :class="{ active: selectedFolder === folder.id }"
        @click="$emit('select-folder', folder.id)"
      >
        <span class="folder-name">{{ folder.name }}</span>
        <span class="folder-count">({{ folder.chatCount }})</span>
        <button
          @click.stop="$emit('delete-folder', folder.id)"
          class="btn-delete"
          title="Delete folder"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Folder } from "@/shared/types";

defineProps<{
  folders: Folder[];
  selectedFolder: string | null;
}>();

defineEmits<{
  "create-folder": [];
  "select-folder": [folderId: string];
  "delete-folder": [folderId: string];
}>();
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

.btn-delete {
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

.btn-delete:hover {
  background: #dc2626;
}
</style>

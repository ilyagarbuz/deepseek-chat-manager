<template>
  <div class="folders-section">
    <div class="section-header">
      <h2>Folders</h2>
      <Button
        :icon="Plus"
        :icon-size="14"
        variant="primary"
        size="md"
        @click="$emit('create-folder')"
      >
        Create folder
      </Button>
    </div>

    <div class="folders-list">
      <div
        v-for="folder in folders"
        :key="folder.id"
        class="folder-item"
        :class="{ active: selectedFolder === folder.id }"
        :style="{ backgroundColor: folder.color || '#f3f4f6' }"
        @click="$emit('select-folder', folder.id)"
      >
        <span class="folder-name">{{ folder.name }}</span>
        <!-- <span class="folder-count">({{ folder.chatCount }})</span> -->
        <IconButton
          :icon="Trash"
          :size="14"
          variant="danger"
          circular
          title="Delete folder"
          @click="$emit('delete-folder', folder.id)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Trash } from "lucide-vue-next";
import type { Folder } from "@/shared/types";
import IconButton from "./ui/IconButton.vue";
import Button from "./ui/Button.vue";

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
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.8;
}

.folder-item:hover {
  opacity: 1;
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
</style>

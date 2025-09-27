<template>
  <div class="app">
    <AppHeader
      :current-theme="currentTheme"
      @toggle-theme="toggleTheme"
      @create-folder="createFolder"
    />

    <main class="main custom-scrollbar">
      <FoldersSection
        v-if="folders.length > 0"
        :folders="folders"
        :selected-folder="selectedFolder"
        @select-folder="selectFolder"
        @delete-folder="deleteFolder"
        @open-chat="openChat"
        @remove-chat="removeChatFromFolder"
      />
      <div v-else class="empty-state">
        <p>No folders found</p>
      </div>
    </main>

    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import AppHeader from "./components/AppHeader.vue";
import FoldersSection from "./components/FoldersSection.vue";
import AppFooter from "./components/AppFooter.vue";
import { useFolders, useChats, useTheme } from "./composables/useAppLogic";

// Use composables for logic
const {
  folders,
  selectedFolder,
  loadFolders,
  createFolder,
  deleteFolder,
  selectFolder,
  removeChatFromFolder,
} = useFolders();

const { openChat } = useChats();

const { currentTheme, loadTheme, toggleTheme } = useTheme();

onMounted(async () => {
  await loadFolders();
  await loadTheme();
});
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

.main {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.empty-state p {
  font-size: 14px;
  color: var(--text-secondary);
}
</style>

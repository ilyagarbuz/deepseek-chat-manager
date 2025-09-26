<template>
  <div class="app">
    <AppHeader :current-theme="currentTheme" @toggle-theme="toggleTheme" />

    <main class="main">
      <FoldersSection
        :folders="folders"
        :selected-folder="selectedFolder"
        @create-folder="createFolder"
        @select-folder="selectFolder"
        @delete-folder="deleteFolder"
      />

      <ChatsSection
        :folders="folders"
        :selected-folder="selectedFolder"
        @open-chat="openChat"
        @remove-chat="removeChatFromFolder"
      />
    </main>

    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import AppHeader from "./components/AppHeader.vue";
import FoldersSection from "./components/FoldersSection.vue";
import ChatsSection from "./components/ChatsSection.vue";
import AppFooter from "./components/AppFooter.vue";
import { useFolders, useChats, useTheme } from "./composables/useAppLogic";

// Используем composables для логики
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
</style>

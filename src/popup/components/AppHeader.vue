<template>
  <header class="header">
    <div class="header-content">
      <div class="header-text">
        <h1>DeepSeek Chat Manager</h1>
      </div>
      <div class="header-actions">
        <IconButton
          :icon="FolderPlus"
          :size="18"
          variant="default"
          circular
          style="color: #f9fafb"
          @click="$emit('create-folder')"
        />
        <IconButton
          :icon="themeIcon"
          :size="18"
          variant="default"
          circular
          style="color: #f9fafb"
          @click="$emit('toggle-theme')"
        />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Sun, Moon, Monitor, FolderPlus } from "lucide-vue-next";
import IconButton from "./ui/IconButton.vue";

import type { Theme } from "@/shared/types";

const props = defineProps<{
  currentTheme: Theme;
}>();

defineEmits<{
  "toggle-theme": [];
  "create-folder": null;
}>();

const themeIcon = computed(() => {
  switch (props.currentTheme) {
    case "light":
      return Sun;
    case "dark":
      return Moon;
    default:
      return Monitor;
  }
});
</script>

<style scoped>
.header {
  background: var(--deepseek-primary-static);
  color: white;
  padding: 10px 16px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.header-text {
  flex: 1;
}

.header h1 {
  margin: 0;
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
</style>

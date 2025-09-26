<template>
  <header class="header">
    <div class="header-content">
      <div class="header-text">
        <h1>DeepSeek Chat Manager</h1>
        <p class="subtitle">Управление папками чатов</p>
      </div>
      <div class="theme-toggle">
        <button
          @click="$emit('toggle-theme')"
          class="theme-btn"
          :title="getThemeTitle()"
        >
          {{ getThemeIcon() }}
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { Theme } from "@/shared/types";

const props = defineProps<{
  currentTheme: Theme;
}>();

defineEmits<{
  "toggle-theme": [];
}>();

const getThemeIcon = (): string => {
  switch (props.currentTheme) {
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
  switch (props.currentTheme) {
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
</style>

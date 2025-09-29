<template>
  <footer class="footer">
    <IconButton
      class="close-button"
      :icon="X"
      :size="12"
      variant="default"
      circular
      @click="$emit('toggle-footer')"
    />
    <div class="footer-content">
      <p class="help-text">
        Open a chat on DeepSeek and use the context menu to add it to a folder
      </p>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { X } from "lucide-vue-next";
import IconButton from "./ui/IconButton.vue";
import { useSync } from "../composables/useAppLogic";

defineEmits<{
  "toggle-footer": [];
}>();

const { loadSyncStatus, getSyncStatusText, getSyncStatusIcon } = useSync();

const syncText = computed(() => getSyncStatusText());
const syncIcon = computed(() => getSyncStatusIcon());

onMounted(() => {
  loadSyncStatus();
});
</script>

<style scoped>
.footer {
  position: relative;
  padding-top: 16px;
  padding-bottom: 12px;
  padding-left: 16px;
  padding-right: 16px;
  background: var(--bg-tertiary);
  border-top: 1px solid var(--border-color);
}

.close-button {
  position: absolute;
  right: 0;
  top: 0;
}

.footer-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.help-text {
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.4;
}

.sync-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 10px;
  color: var(--text-tertiary);
}

.sync-icon {
  font-size: 12px;
}

.sync-text {
  font-weight: 500;
}
</style>

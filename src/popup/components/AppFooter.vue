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
    <p class="help-text">
      Open a chat on DeepSeek and use the context menu to add it to a folder
    </p>
  </footer>
</template>

<script setup lang="ts">
import { X } from "lucide-vue-next";
import IconButton from "./ui/IconButton.vue";

defineEmits<{
  "toggle-footer": null;
}>();
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

.help-text {
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.4;
}
</style>

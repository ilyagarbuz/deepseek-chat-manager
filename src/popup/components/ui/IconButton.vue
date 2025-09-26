<template>
  <button
    :class="buttonClasses"
    :title="title"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <component :is="icon" :size="size" />
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Component } from "vue";

interface Props {
  icon: Component;
  size?: number;
  variant?: "default" | "danger" | "primary" | "secondary";
  title?: string;
  disabled?: boolean;
  circular?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 14,
  variant: "default",
  disabled: false,
  circular: false,
});

defineEmits<{
  click: [event: MouseEvent];
}>();

const buttonClasses = computed(() => {
  const classes = ["icon-button"];

  if (props.circular) {
    classes.push("circular");
  }

  classes.push(`variant-${props.variant}`);

  return classes.join(" ");
});
</script>

<style scoped>
.icon-button {
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  padding: 4px;
}

.icon-button.circular {
  border-radius: 50%;
  width: 24px;
  height: 24px;
}

.icon-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Variants */
.icon-button.variant-default {
  color: var(--text-primary);
}

.icon-button.variant-default:hover {
  background: var(--bg-secondary);
}

.icon-button.variant-danger {
  color: var(--text-primary);
}

.icon-button.variant-danger:hover {
  color: #dc2626;
}

.icon-button.variant-danger:hover .lucide {
  color: #dc2626;
}

.icon-button.variant-primary {
  color: var(--deepseek-primary-static);
}

.icon-button.variant-primary:hover {
  background: var(--deepseek-primary-static);
  color: white;
}

.icon-button.variant-secondary {
  color: var(--text-secondary);
}

.icon-button.variant-secondary:hover {
  color: var(--text-primary);
  background: var(--bg-secondary);
}
</style>

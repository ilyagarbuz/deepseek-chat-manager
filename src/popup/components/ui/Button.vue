<template>
  <button
    :class="buttonClasses"
    :disabled="disabled"
    :type="type"
    @click="$emit('click', $event)"
  >
    <component
      v-if="icon"
      :is="icon"
      :size="iconSize"
      :class="{
        'button-icon': true,
        'icon-left': iconPosition === 'left',
        'icon-right': iconPosition === 'right',
      }"
    />
    <span v-if="$slots.default" class="button-text">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Component } from "vue";

interface Props {
  icon?: Component;
  iconSize?: number;
  iconPosition?: "left" | "right";
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  fullWidth?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  iconSize: 14,
  iconPosition: "left",
  variant: "primary",
  size: "md",
  disabled: false,
  type: "button",
  fullWidth: false,
});

defineEmits<{
  click: [event: MouseEvent];
}>();

const buttonClasses = computed(() => {
  const classes = ["button"];

  classes.push(`button-${props.variant}`);
  classes.push(`button-${props.size}`);

  if (props.fullWidth) {
    classes.push("button-full-width");
  }

  if (props.disabled) {
    classes.push("button-disabled");
  }

  return classes.join(" ");
});
</script>

<style scoped>
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  border-radius: 6px;
  font-family: var(--font-family-primary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  white-space: nowrap;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Sizes */
.button-sm {
  padding: 4px 8px;
  font-size: 11px;
  gap: 4px;
}

.button-md {
  padding: 6px 12px;
  font-size: 12px;
  gap: 6px;
}

.button-lg {
  padding: 8px 16px;
  font-size: 14px;
  gap: 8px;
}

/* Variants */
.button-primary {
  background: var(--deepseek-primary-static);
  color: white;
}

.button-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.button-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.button-secondary:hover:not(:disabled) {
  background: var(--bg-tertiary);
  border-color: var(--deepseek-primary-static);
}

.button-danger {
  background: #dc2626;
  color: white;
}

.button-danger:hover:not(:disabled) {
  background: #b91c1c;
}

.button-ghost {
  background: transparent;
  color: var(--text-primary);
}

.button-ghost:hover:not(:disabled) {
  background: var(--bg-secondary);
}

/* Full width */
.button-full-width {
  width: 100%;
}

/* Icon positioning */
.button-icon {
  flex-shrink: 0;
}

.icon-left {
  order: -1;
}

.icon-right {
  order: 1;
}

.button-text {
  flex: 1;
}
</style>

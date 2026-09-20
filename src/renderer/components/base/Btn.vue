<template>
  <button
    :class="[$style.btn, {[$style.min]: min}, {[$style.outline]: outline}]"
    tabindex="0"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<script>
export default {
  props: {
    min: {
      type: Boolean,
    },
    outline: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.btn {
  display: inline-block;
  border: none;
  border-radius: @radius-sm;
  cursor: pointer;
  padding: 8px 16px;
  color: var(--color-button-font);
  outline: none;
  transition: background-color @transition-fast, color @transition-fast, transform @transition-fast, box-shadow @transition-fast;
  background-color: var(--color-button-background);
  font-size: 13px;
  font-weight: 500;
  &[disabled] {
    opacity: .4;
    cursor: not-allowed;
  }

  &.outline {
    background-color: transparent;
    border: 1px solid var(--color-border);
  }

  &:hover:not([disabled]) {
    background-color: var(--color-button-background-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-1);
  }
  &:active:not([disabled]) {
    background-color: var(--color-button-background-active);
    transform: translateY(0) scale(0.98);
    box-shadow: none;
  }
}

.min {
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 6px;
}

</style>

<template>
  <div :class="$style.page" class="scroll">
    <div :class="$style.placeholder">
      <div :class="$style.icon">
        <svg viewBox="0 0 24 24" width="42" height="42" aria-hidden="true">
          <path d="M12 6v6l4 2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5" />
        </svg>
      </div>
      <h2 :class="$style.title">{{ $t('recent_play') ?? '最近播放' }}</h2>
      <p :class="$style.desc">{{ $t('home__placeholder_desc') ?? '即将上线' }}</p>
    </div>
  </div>
</template>

<style lang="less" module>
@import '@renderer/assets/styles/home-tokens.less';

.page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--qm-sp-10, 32px);
  box-sizing: border-box;
  background: var(--qm-surface, var(--color-content-background));
}

.placeholder {
  text-align: center;
  color: var(--color-font);
  padding: 32px 48px;
  border-radius: @radius-lg;
  background: var(--color-surface-raised);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--color-border-subtle);
}
.icon {
  width: 72px; height: 72px; border-radius: var(--qm-radius-modal, 18px);
  background: var(--color-accent-soft);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--color-accent); margin-bottom: 14px;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.4);
}
.title { margin: 0; font-size: var(--qm-fs-3xl, 20px); font-weight: var(--qm-fw-bold, 700); letter-spacing: 0.2px; }
.desc { margin: 6px 0 0; font-size: var(--qm-fs-sm, 13px); color: var(--color-font-label); }
</style>

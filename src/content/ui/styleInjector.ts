export class StyleInjector {
  private static injected = false;

  /**
   * Внедряет стили в документ
   */
  static injectStyles(): void {
    if (this.injected) return;

    const style = document.createElement("style");
    style.textContent = `
      .dsm-folder-indicator {
        font-family: var(--font-family-primary);
      }
      
      .dsm-context-menu {
        font-family: var(--font-family-primary);
      }
      
      .dsm-menu-item:hover {
        background: #f3f4f6 !important;
      }
    `;
    document.head.appendChild(style);
    this.injected = true;
  }

  /**
   * Удаляет внедренные стили
   */
  static removeStyles(): void {
    const existingStyle = document.querySelector("style[data-dsm-styles]");
    if (existingStyle) {
      existingStyle.remove();
      this.injected = false;
    }
  }
}

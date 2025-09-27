import type {
  Theme,
  ExtensionMessage,
  ExtensionResponse,
} from "@/shared/types";
import { DeepSeekApiService } from "../api/deepseekApi";

export class ThemeManager {
  private currentTheme: Theme = "system";

  /**
   * Загружает тему из storage
   */
  async loadTheme(): Promise<void> {
    try {
      const response = await DeepSeekApiService.sendMessage<{ theme: Theme }>({
        type: "GET_THEME",
      });
      this.currentTheme = response.theme || "system";
      this.applyTheme(this.currentTheme);
    } catch (error) {
      console.error("Error loading theme:", error);
      this.currentTheme = "system";
      this.applyTheme("system");
    }
  }

  /**
   * Применяет тему к документу
   */
  applyTheme(theme: Theme): void {
    const root = document.documentElement;

    if (theme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }

    this.currentTheme = theme;
  }

  /**
   * Получает текущую тему
   */
  getCurrentTheme(): Theme {
    return this.currentTheme;
  }

  /**
   * Устанавливает тему
   */
  setTheme(theme: Theme): void {
    this.applyTheme(theme);
  }

  /**
   * Настраивает слушатель изменений темы
   */
  setupThemeListener(): void {
    // Chrome Storage Events
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== "local") return;

      if (changes.theme) {
        console.log("Storage: Detected theme change");
        const newTheme = changes.theme.newValue || "system";
        if (this.currentTheme !== newTheme) {
          this.currentTheme = newTheme;
          this.applyTheme(newTheme);
          console.log("Storage: Theme updated to:", newTheme);
        }
      }
    });

    // Слушаем сообщения от background script
    chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
      if (message.type === "THEME_CHANGED") {
        this.currentTheme = message.theme;
        this.applyTheme(message.theme);
        console.log("Received theme change message:", message.theme);
      }
    });
  }
}

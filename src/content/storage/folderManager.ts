import type {
  Folder,
  ExtensionMessage,
  ExtensionResponse,
} from "@/shared/types";
import { DeepSeekApiService } from "../api/deepseekApi";
import { EventBus, FoldersChangedEvent } from "../events/eventBus";

export class FolderManager {
  private folders: Folder[] = [];

  constructor(folders: Folder[] = []) {
    this.folders = folders;
  }

  /**
   * Загружает папки из storage
   */
  async loadFolders(): Promise<void> {
    try {
      const response = await DeepSeekApiService.sendMessage<{
        folders: Folder[];
      }>({
        type: "GET_FOLDERS",
      });
      this.folders = Array.isArray(response.folders) ? response.folders : [];
    } catch (error) {
      console.error("Error loading folders:", error);
      this.folders = [];
    }
  }

  /**
   * Получает список папок
   */
  getFolders(): Folder[] {
    return this.folders;
  }

  /**
   * Обновляет список папок
   */
  updateFolders(folders: Folder[]): void {
    this.folders = folders;
    // Отправляем событие об изменении папок
    EventBus.getInstance().emit({
      type: "FOLDERS_CHANGED",
      folders: this.folders,
    });
  }

  /**
   * Настраивает слушатель изменений папок в storage
   */
  setupStorageListener(): void {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      // Listen to both sync and local storage changes
      if (namespace !== "sync" && namespace !== "local") return;

      if (changes.folders) {
        console.log(`Storage: Detected folder changes from ${namespace}`);
        const newFolders = changes.folders.newValue || [];

        // Проверяем, действительно ли папки изменились
        if (JSON.stringify(this.folders) !== JSON.stringify(newFolders)) {
          this.folders = newFolders;
          // Отправляем событие об изменении папок
          EventBus.getInstance().emit({
            type: "FOLDERS_CHANGED",
            folders: this.folders,
          });
          console.log(`Storage: Folders updated from ${namespace}`);
        }
      }
    });
  }
}

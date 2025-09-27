import type { Chat, ExtensionMessage, ExtensionResponse } from "@/shared/types";

export class DeepSeekApiService {
  /**
   * Получает токен пользователя из localStorage
   */
  static getUserToken(): string | null {
    try {
      const userTokenData = localStorage.getItem("userToken");
      if (!userTokenData) {
        return null;
      }

      const tokenObj = JSON.parse(userTokenData);
      if (!tokenObj || !tokenObj.value) {
        return null;
      }

      return tokenObj.value;
    } catch (error) {
      return null;
    }
  }

  /**
   * Отправляет сообщение в background script
   */
  static async sendMessage<T extends ExtensionResponse>(
    message: ExtensionMessage
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response: T) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Загружает данные чатов через API DeepSeek
   */
  static async fetchChatData(): Promise<Map<string, Chat>> {
    try {
      const userToken = this.getUserToken();
      if (!userToken) {
        return new Map();
      }

      const response = await fetch(
        "https://chat.deepseek.com/api/v0/chat_session/fetch_page",
        {
          method: "GET",
          headers: {
            accept: "*/*",
            "accept-language": "en-US,en;q=0.9,ru-RU;q=0.8,ru;q=0.7",
            authorization: `Bearer ${userToken}`,
            priority: "u=1, i",
            referer: "https://chat.deepseek.com/",
            "sec-ch-ua":
              '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
            "sec-ch-ua-arch": '"arm"',
            "sec-ch-ua-bitness": '"64"',
            "sec-ch-ua-full-version": '"140.0.7339.133"',
            "sec-ch-ua-full-version-list":
              '"Chromium";v="140.0.7339.133", "Not=A?Brand";v="24.0.0.0", "Google Chrome";v="140.0.7339.133"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-model": '""',
            "sec-ch-ua-platform": '"macOS"',
            "sec-ch-ua-platform-version": '"15.6.1"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
            "x-app-version": "20241129.1",
            "x-client-locale": "en_US",
            "x-client-platform": "web",
            "x-client-version": "1.4.0-fragments",
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const chatData = new Map<string, Chat>();

      // Обработка полученных данных
      if (
        data &&
        data.data &&
        data.data.biz_data &&
        data.data.biz_data.chat_sessions &&
        Array.isArray(data.data.biz_data.chat_sessions)
      ) {
        data.data.biz_data.chat_sessions.forEach((chatItem: any) => {
          const chat: Chat = {
            id: chatItem.id,
            title: chatItem.title || "Untitled",
            url: `/a/chat/s/${chatItem.id}`,
            createdAt: new Date(chatItem.created_at || chatItem.create_time),
            lastMessageAt: chatItem.updated_at
              ? new Date(chatItem.updated_at)
              : new Date(),
          };

          chatData.set(chat.id, chat);
        });
      }

      return chatData;
    } catch (error) {
      console.error("Error fetching chat data:", error);
      return new Map();
    }
  }
}

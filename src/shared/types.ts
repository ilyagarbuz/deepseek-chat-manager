export interface Chat {
  id: string;
  title: string;
  url: string;
  createdAt: Date;
  lastMessageAt?: Date;
}

export interface Folder {
  id: string;
  name: string;
  chatIds: string[];
  chatCount: number;
  createdAt: Date;
  color?: string;
}

export interface ChatFolderMapping {
  [chatId: string]: string; // chatId -> folderId
}

export interface ExtensionStorage {
  folders: Folder[];
  chatFolderMapping: ChatFolderMapping;
  chats: Chat[];
}

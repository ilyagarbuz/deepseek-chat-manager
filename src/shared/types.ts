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
  chats: Chat[];
  chatCount: number;
  createdAt: Date;
  color?: string;
}

export interface ExtensionStorage {
  folders: Folder[];
}

// Типы сообщений для общения между компонентами расширения
export interface BaseMessage {
  type: string;
}

export interface GetFoldersMessage extends BaseMessage {
  type: "GET_FOLDERS";
}

export interface CreateFolderMessage extends BaseMessage {
  type: "CREATE_FOLDER";
  name: string;
}

export interface DeleteFolderMessage extends BaseMessage {
  type: "DELETE_FOLDER";
  folderId: string;
}

export interface AddChatToFolderMessage extends BaseMessage {
  type: "ADD_CHAT_TO_FOLDER";
  chat: Chat;
  folderId: string;
}

export interface RemoveChatFromFolderMessage extends BaseMessage {
  type: "REMOVE_CHAT_FROM_FOLDER";
  chatId: string;
  folderId: string;
}

export type ExtensionMessage =
  | GetFoldersMessage
  | CreateFolderMessage
  | DeleteFolderMessage
  | AddChatToFolderMessage
  | RemoveChatFromFolderMessage;

// Типы ответов от background script
export interface BaseResponse {
  success?: boolean;
  error?: string;
}

export interface FoldersResponse extends BaseResponse {
  folders: Folder[];
}

export interface FolderResponse extends BaseResponse {
  folder: Folder;
}

export type ExtensionResponse = FoldersResponse | FolderResponse | BaseResponse;

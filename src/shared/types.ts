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

// Типы сообщений для общения между компонентами расширения
export interface BaseMessage {
  type: string;
}

export interface GetFoldersMessage extends BaseMessage {
  type: "GET_FOLDERS";
}

export interface GetChatsMessage extends BaseMessage {
  type: "GET_CHATS";
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
  chatId: string;
  folderId: string;
}

export interface RemoveChatFromFolderMessage extends BaseMessage {
  type: "REMOVE_CHAT_FROM_FOLDER";
  chatId: string;
  folderId: string;
}

export interface SyncChatMessage extends BaseMessage {
  type: "SYNC_CHAT";
  chat: Chat;
}

export interface GetChatDataMessage extends BaseMessage {
  type: "GET_CHAT_DATA";
  chatId: string;
}

export type ExtensionMessage =
  | GetFoldersMessage
  | GetChatsMessage
  | CreateFolderMessage
  | DeleteFolderMessage
  | AddChatToFolderMessage
  | RemoveChatFromFolderMessage
  | SyncChatMessage
  | GetChatDataMessage;

// Типы ответов от background script
export interface BaseResponse {
  success?: boolean;
  error?: string;
}

export interface FoldersResponse extends BaseResponse {
  folders: Folder[];
}

export interface ChatsResponse extends BaseResponse {
  chats: Chat[];
}

export interface FolderResponse extends BaseResponse {
  folder: Folder;
}

export interface ChatResponse extends BaseResponse {
  chat: Chat | null;
}

export type ExtensionResponse =
  | FoldersResponse
  | ChatsResponse
  | FolderResponse
  | ChatResponse
  | BaseResponse;

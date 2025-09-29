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

export type Theme = "light" | "dark" | "system";

export interface ExtensionStorage {
  folders: Folder[];
  theme: Theme;
}

// Message types for communication between extension components
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

export interface RenameFolderMessage extends BaseMessage {
  type: "RENAME_FOLDER";
  folderId: string;
  newName: string;
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

export interface GetThemeMessage extends BaseMessage {
  type: "GET_THEME";
}

export interface SetThemeMessage extends BaseMessage {
  type: "SET_THEME";
  theme: Theme;
}

export interface GetSyncStatusMessage extends BaseMessage {
  type: "GET_SYNC_STATUS";
}

export type ExtensionMessage =
  | GetFoldersMessage
  | CreateFolderMessage
  | DeleteFolderMessage
  | RenameFolderMessage
  | AddChatToFolderMessage
  | RemoveChatFromFolderMessage
  | GetThemeMessage
  | SetThemeMessage
  | GetSyncStatusMessage;

// Response types from background script
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

export interface ThemeResponse extends BaseResponse {
  theme: Theme;
}

export interface SyncStatusResponse extends BaseResponse {
  syncEnabled: boolean;
  quotaUsed: number;
  quotaMax: number;
  lastSyncTime?: Date;
}

export type ExtensionResponse =
  | FoldersResponse
  | FolderResponse
  | ThemeResponse
  | SyncStatusResponse
  | BaseResponse;

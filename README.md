# DeepSeek Chat Manager

A Google Chrome browser extension that adds the ability to organize DeepSeek chats into folders.

## Features

- 📁 Create and manage chat folders
- 🏷️ Group chats by topics and projects
- 🖱️ Easy chat addition to folders via context menu
- 💾 Automatic settings persistence
- 🎨 Modern Vue.js interface
- 🔗 DeepSeek API integration for reliable chat detection
- 🔐 Automatic authorization via Bearer token
- ⚡ SPA navigation and asynchronous content loading support

## Installation

### For Development

1. Clone the repository:

```bash
git clone <repository-url>
cd deepseek_manager_extension
```

2. Install dependencies:

```bash
npm install
```

3. Build the extension:

```bash
npm run build
```

4. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked extension"
   - Select the `dist` folder

### For Production

1. Build the extension:

```bash
npm run build
```

2. Create archive:

```bash
npm run package
```

3. Upload the `deepseek-manager-extension.zip` file to Chrome Web Store

## Usage

1. Open [DeepSeek Chat](https://chat.deepseek.com/) and log in
2. Click the extension icon in the toolbar
3. Create folders to organize chats
4. Right-click on a chat → select folder to add it to
5. Chats with folders will be marked with colored indicators

### Requirements

- DeepSeek authorization (extension automatically gets token)
- Chrome browser with Manifest V3 support

## Project Structure

```
src/
├── popup/           # Extension interface (Vue.js)
│   ├── App.vue
│   ├── main.ts
│   └── style.css
├── content/         # Content script for website interaction
│   ├── content.ts
│   └── content.css
├── background/      # Background script
│   └── background.ts
└── shared/          # Common types and utilities
    └── types.ts
```

## Technologies

- **Vue.js 3** - for popup interface
- **TypeScript** - for type safety
- **Vite** - for building
- **Chrome Extensions API** - for browser integration

## Development

### Available Commands

- `npm run dev` - build in development mode with file watching
- `npm run build` - build for production
- `npm run clean` - clean dist folder
- `npm run package` - create archive for publishing

### Architecture

The extension consists of three main parts:

1. **Popup** - folder management interface (Vue.js)
2. **Content Script** - DeepSeek website integration via API
3. **Background Script** - data management and synchronization

### Implementation Details

- **API Integration**: Chat data retrieval via `https://chat.deepseek.com/api/v0/chat_session/fetch_page`
- **Authorization**: Automatic Bearer token extraction from localStorage
- **SPA Support**: URL change tracking and asynchronous content loading
- **Reliability**: Chat element search by ID and title from API

### Adding New Features

1. Update types in `src/shared/types.ts`
2. Add logic to the appropriate script
3. Update interface in `src/popup/App.vue`
4. Test on DeepSeek website

## License

MIT License

## Support

If you have questions or suggestions, create an issue in the repository.

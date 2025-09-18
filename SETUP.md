# Настройка удаленного репозитория

## Создание репозитория на GitHub

1. Перейдите на [GitHub](https://github.com) и войдите в свой аккаунт
2. Нажмите кнопку "New repository" или перейдите по ссылке: https://github.com/new
3. Заполните форму:
   - **Repository name**: `deepseek-chat-manager`
   - **Description**: `Browser extension for organizing DeepSeek chats into folders`
   - **Visibility**: Public или Private (на ваш выбор)
   - **НЕ** добавляйте README, .gitignore или лицензию (они уже есть)
4. Нажмите "Create repository"

## Подключение локального репозитория к GitHub

После создания репозитория на GitHub выполните следующие команды:

```bash
# Добавьте удаленный репозиторий (замените YOUR_USERNAME на ваш GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/deepseek-chat-manager.git

# Переименуйте основную ветку в main (если нужно)
git branch -M main

# Отправьте код в удаленный репозиторий
git push -u origin main
```

## Альтернативный способ через SSH

Если у вас настроен SSH ключ:

```bash
git remote add origin git@github.com:YOUR_USERNAME/deepseek-chat-manager.git
git branch -M main
git push -u origin main
```

## Проверка

После выполнения команд ваш код будет доступен по адресу:
`https://github.com/YOUR_USERNAME/deepseek-chat-manager`

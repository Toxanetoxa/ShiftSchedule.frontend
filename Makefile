.DEFAULT_GOAL := help

COMPOSE ?= docker compose
ARGS ?=
SERVICE ?=

.PHONY: help up down restart ps logs shell npm test typecheck lint lint-fix format format-check check build storybook-build

help: ## Показать доступные команды
	@awk 'BEGIN { FS = ":.*## "; print "Команды фронтенда (Docker Compose):\n" } /^[a-zA-Z0-9_-]+:.*## / { printf "  %-18s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

up: ## Запустить Vite и Storybook, дождаться готовности
	$(COMPOSE) up -d --build --wait --remove-orphans

down: ## Остановить контейнеры, сохранив том зависимостей
	$(COMPOSE) down --remove-orphans

restart: ## Пересоздать контейнеры, сохранив том зависимостей
	$(COMPOSE) down --remove-orphans
	$(COMPOSE) up -d --wait --remove-orphans

ps: ## Показать состояние контейнеров
	$(COMPOSE) ps

logs: ## Смотреть логи; необязательно SERVICE=storybook
	$(COMPOSE) logs --follow --tail=100 $(SERVICE)

shell: ## Открыть shell; по умолчанию app, можно SERVICE=storybook
	$(COMPOSE) exec $(if $(SERVICE),$(SERVICE),app) sh

npm: ## Выполнить npm: make npm ARGS="install package"
	$(COMPOSE) exec -T app npm $(ARGS)

typecheck: ## Проверить типы TypeScript и Vue
	$(COMPOSE) exec -T app npm run typecheck

test: ## Проверить поведение компонентов
	$(COMPOSE) exec -T app npm test

lint: ## Проверить код правилами Antfu ESLint
	$(COMPOSE) exec -T app npm run lint

lint-fix: ## Автоматически исправить ошибки ESLint
	$(COMPOSE) exec -T app npm run lint:fix

format: ## Отформатировать файлы через Prettier
	$(COMPOSE) exec -T app npm run format

format-check: ## Проверить форматирование без изменений
	$(COMPOSE) exec -T app npm run format:check

check: ## Выполнить линтер, проверку форматирования, типов и тесты
	$(COMPOSE) exec -T app npm run check

build: ## Собрать приложение для публикации
	$(COMPOSE) exec -T app npm run build

storybook-build: ## Собрать статический Storybook
	$(COMPOSE) exec -T app npm run build-storybook

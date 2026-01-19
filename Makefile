PROJECT_NAME = "claim-submission-app"

# Docker commands (not handled by TurboRepo)
up/build:
	@docker compose \
		-p ${PROJECT_NAME} \
		up --build -w --remove-orphans

up:
	@docker compose \
		-p ${PROJECT_NAME} \
		up -w

down:
	@docker compose \
		-p ${PROJECT_NAME} \
		down && \
		$(MAKE) clean/image

down/clean:
	@$(MAKE) down && \
		$(MAKE) clean && \
		$(MAKE) clean/image

clean:
	@rm -rf ./backend/temp
	@rm -rf postgres-data

clean/image:
	@docker image prune -f

clean/dist:
	@rm -rf **/dist **/**/dist

clean/turbo:
	@rm -rf ./.turbo **/.turbo **/**/.turbo 

clean/pnpm-store:
	@pnpm store prune

# TurboRepo delegated commands
build:
	@pnpm run build

build/backend:
	@cd backend && \
		pnpm run build

build/frontend:
	@cd frontend && \
		pnpm run build

format:
	@pnpm run format

lint:
	@pnpm run lint

lint/fix:
	@pnpm run lint:fix

install:
	@chmod +x ./scripts/reinstall.sh && \
		./scripts/reinstall.sh

install/resolve:
	@$(MAKE) clean/pnpm-store clean/turbo clean/dist && \
		echo "Removing all node_modules" && \
		rm -rf node_modules **/node_modules **/**/node_modules && \
		pnpm install

test/unit:
	@cd backend && \
		pnpm run test

test/api:
	@cd api-test && \
		pnpm run test

test/ui:
	@cd frontend && \
		pnpm run test

# Database commands using TurboRepo
db/data/up:
	@cd backend && \
		pnpm run build && \
		pnpm run seed:run

db/data/down:
	@cd backend && \
		pnpm run build && \
		DOTENV_CONFIG_PATH=../.env pnpx node -r dotenv/config ./dist/backend/config/db-scripts/data-down.js

db/data/reset:
	@cd backend && \
		pnpm run build && \
		DOTENV_CONFIG_PATH=../.env pnpx node -r dotenv/config ./dist/backend/config/db-scripts/data-down.js && \
		pnpm run seed:run

db/migration/generate:
	@cd backend && \
		chmod +x ./scripts/generate-migration.sh && \
		./scripts/generate-migration.sh ${name}

db/migration/revert:
	@cd backend && \
		chmod +x ./scripts/revert-migration.sh && \
		./scripts/revert-migration.sh

check-implementation/frontend:
	@$(MAKE) format lint build/frontend test/ui

check-implementation/backend:
	@$(MAKE) format lint build/backend test/unit

check-implementation:
	@$(MAKE) format lint
	@$(MAKE) build
	@$(MAKE) test/unit test/ui

check-implementation/backend/with-api-test:
	@$(MAKE) format lint build/backend test/unit test/api

up/spec-workflow-dashboard:
	@pnpx @pimzino/spec-workflow-mcp@latest --dashboard --port 9000 ./
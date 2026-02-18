# The help target prints out all targets with their descriptions organized
# beneath their categories. The categories are represented by '##@' and the
# target descriptions by '##'. The awk commands is responsible for reading the
# entire set of makefiles included in this invocation, looking for lines of the
# file as xyz: ## something, and then pretty-format the target and help. Then,
# if there's a line with ##@ something, that gets pretty-printed as a category.
# More info on the usage of ANSI catalog characters for terminal formatting:
# https://en.wikipedia.org/wiki/ANSI_escape_code#SGR_parameters
# More info on the awk command:
# http://linuxcommand.org/lc3_adv_awk.php

## HELP
help: ## Display this concise help, ie only the porcelain target.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

help-all: ## Display all help items, ie including plumbing targets.
	@awk 'BEGIN {FS = ":.*#"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?#/ { printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

maintain:  ## Performs regular updates that may be required
	@yes | npx update-browserslist-db@latest
	@npm run lint

check-version:  ## Check node version is satisfactory
	@bash -c '[ "$$(printf "%s\n" 21.0.0 "$$(node -v | sed "s/^v//")" | sort -V | head -n1)" = "21.0.0" ] || (echo "Node.js too old" >&2; exit 1)'

install:  ## Install node packages what's required
	@npm i

build:  ## Build
	@npm run build

unit-test:   ## Run unit tests
	@npm run test:unit

e2e-test: build    ## Run end-to-end tests
	@npm run test:e2e

dev: check-version install   ## Run development environment
	@./hack/local-shared/do start_docker
	@npm run dev

typecheck: ## Run typecheck
	@npm run type-check

lint: ## Run lint
	@npm run lint

reviewable: typecheck lint unit-test
	@echo "All checks passed, ready for review"
PACKAGES := $(patsubst %/,%,$(wildcard */))

stow:
	@stow -t ~ $(PACKAGES)

.PHONY: stow

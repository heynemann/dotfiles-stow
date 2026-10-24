# zsh-only file. On Omarchy, terminals launch $SHELL, which stays /usr/bin/bash
# until you log out and back in after `chsh`; bail out instead of spewing errors.
if [ -z "$ZSH_VERSION" ]; then
  echo "~/.zshrc is zsh-only; run 'exec zsh' (or re-login after chsh) instead of sourcing it from $0." >&2
  return 0
fi

bindkey -v

# Omarchy environment (OMARCHY_PATH + PATH), needed even for non-interactive shells
[[ -r /usr/share/omarchy/default/bash/env-bootstrap ]] && source /usr/share/omarchy/default/bash/env-bootstrap

# If not running interactively, don't do anything else (leave this above the rc source)
[[ $- != *i* ]] && return

export ZSH_CFG="$HOME/.config/zsh"

zstyle :compinstall filename '/home/heynemann/.zshrc'

export PATH="$ZSH_CFG/bin:$PATH"
export PATH="$HOME/.bin:$PATH"
export PATH="$HOME/.local/bin:$PATH"

if [ -f "/home/linuxbrew/.linuxbrew/bin/brew" ]; then
  export PATH="/home/linuxbrew/.linuxbrew/bin:$PATH"
  export PATH="/home/linuxbrew/.linuxbrew/sbin:$PATH"
  eval $(/home/linuxbrew/.linuxbrew/bin/brew shellenv)
fi

if [ -f "$HOME/.local.zsh" ]; then
  source "$HOME/.local.zsh"
fi

# Plugins, then the completion system: compinit only sees fpath as it is when it runs
source "$ZSH_CFG/includes/mise.zsh"
source "$ZSH_CFG/includes/plugins.zsh"
source "$ZSH_CFG/includes/completion.zsh"

# Omarchy's default aliases, functions and tool init (no-op elsewhere); everything below overrides them
source "$ZSH_CFG/includes/omarchy.zsh"

if [ -f "$HOME/.alias.zsh" ]; then
  source "$HOME/.alias.zsh"
fi

# General configs
source "$ZSH_CFG/includes/general.zsh"

source "$ZSH_CFG/includes/starship.zsh"

# >>> railway initialize >>>
[[ -f "$HOME/.railway/env" ]] && source "$HOME/.railway/env"
# <<< railway initialize <<<

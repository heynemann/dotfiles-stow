bindkey -v

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
  source "$HOME/.local.zsh" ]
fi

if [ -f "$HOME/.alias.zsh" ]; then
  source "$HOME/.alias.zsh" ]
fi

# General configs
source "$ZSH_CFG/includes/general.zsh"

# Plugins
source "$ZSH_CFG/includes/mise.zsh"
source "$ZSH_CFG/includes/plugins.zsh"
source "$ZSH_CFG/includes/starship.zsh"



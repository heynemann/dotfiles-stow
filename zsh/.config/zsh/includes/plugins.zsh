# source antidote
source $(brew --prefix)/opt/antidote/share/antidote/antidote.zsh

# initialize plugins statically with ${ZDOTDIR:-$HOME}/.zsh_plugins.txt
export ZDOTDIR="$ZSH_CFG/includes"
antidote load

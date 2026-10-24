# Locate antidote: Homebrew/Linuxbrew, Arch AUR package (zsh-antidote), or a git clone
for _antidote in \
  ${HOMEBREW_PREFIX:+$HOMEBREW_PREFIX/opt/antidote/share/antidote/antidote.zsh} \
  /usr/share/zsh-antidote/antidote.zsh \
  $HOME/.antidote/antidote.zsh; do
  if [[ -r $_antidote ]]; then
    source $_antidote
    break
  fi
done
unset _antidote

# Pass the bundle/static files explicitly instead of exporting ZDOTDIR:
# an exported ZDOTDIR makes every child zsh look for its .zshrc in this directory.
if (( $+functions[antidote] )); then
  antidote load "$ZSH_CFG/includes/.zsh_plugins.txt" "$ZSH_CFG/includes/.zsh_plugins.zsh"
else
  print -u2 "antidote not found; zsh plugins not loaded"
fi

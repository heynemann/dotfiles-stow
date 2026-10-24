# Completion system. compinit indexes the directories on fpath once, so this
# runs after every fpath addition (Homebrew shellenv, antidote plugins).

# A Homebrew/Linuxbrew zsh only searches its own prefix. Append the OS package
# managers' completion dirs so system tools complete too (Arch/macOS:
# site-functions, Debian/Ubuntu on WSL: vendor-completions). Appending keeps
# Homebrew's and the plugins' copies first.
for _dir in /usr/share/zsh/site-functions /usr/share/zsh/vendor-completions; do
  [[ -d $_dir ]] && (( ! ${fpath[(Ie)$_dir]} )) && fpath+=($_dir)
done
unset _dir

autoload -Uz compinit
compinit -d ~/.cache/zcompdump

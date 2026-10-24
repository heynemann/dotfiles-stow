# Omarchy integration. Omarchy ships its interactive shell setup as bash
# ($OMARCHY_PATH/default/bash/rc); load what applies to zsh straight from there
# so `omarchy update` keeps it current. No-op off Omarchy (macOS, WSL).
# Sourced after compinit (zoxide, fzf and _omarchy register completions) and
# before the personal aliases, which override these defaults.
[[ -n $OMARCHY_PATH && -d $OMARCHY_PATH/default/bash/fns ]] || return 0

source "$OMARCHY_PATH/default/bash/envs"

# aliases and fns/* are bash. Define them under sticky ksh emulation so the
# functions run with bash semantics (0-based arrays, word splitting), and
# without alias expansion so aliases defined earlier can't mangle them.
# ssh-reconnect uses syntax zsh can't run (${var:i:1}); it is wrapped below.
emulate ksh -o no_aliases -c '
  source "$OMARCHY_PATH/default/bash/aliases"
  for _fn in "$OMARCHY_PATH"/default/bash/fns/*; do
    [[ ${_fn##*/} == ssh-reconnect ]] || source "$_fn"
  done
  unset _fn
'

# Run an Omarchy bash function in a bash child. Only for functions zsh can't
# run that don't need to change this shell's state.
_omarchy_bash() {
  bash -c 'source "$OMARCHY_PATH/default/bash/fns/$1"; shift; "$@"' omarchy "$@"
}
ssh() { _omarchy_bash ssh-reconnect ssh "$@"; }
format-drive() { _omarchy_bash drives format-drive "$@"; } # its `read -p` is a coprocess read in zsh

# Tool init from default/bash/init; mise and starship have their own includes.
(( $+commands[zoxide] )) && eval "$(zoxide init zsh)"
(( $+commands[fzf] )) && [[ -t 0 ]] && source <(fzf --zsh) # its widgets need a terminal
if (( $+commands[try] )); then
  # Deferred like Omarchy's: `try init` starts ruby.
  try() {
    unfunction try
    eval "$(command try init ~/Work/tries)"
    try "$@"
  }
fi

# Up/Down search history for what's typed so far, like Omarchy's inputrc.
# Explicit keymaps: .zshrc switches between vi and emacs mode during startup.
if (( $+widgets[history-substring-search-up] )); then
  for _keymap in emacs viins; do
    bindkey -M $_keymap '^[[A' history-substring-search-up
    bindkey -M $_keymap '^[OA' history-substring-search-up
    bindkey -M $_keymap '^[[B' history-substring-search-down
    bindkey -M $_keymap '^[OB' history-substring-search-down
  done
  unset _keymap
fi

# Hide the omarchy-* binaries from command-name completion; `omarchy` is the
# entry point.
zstyle ':completion:*:-command-:*:commands' ignored-patterns 'omarchy-*'

# zsh port of default/bash/completions: complete the next route word, then the
# choices listed in a command's `omarchy:args=` spec, else files. Routes
# (aliases included), summaries and args come from `omarchy commands --json`,
# read once per shell.
typeset -gA _omarchy_summaries _omarchy_args
_omarchy() {
  if (( ! ${#_omarchy_summaries} )); then
    local route summary args
    while IFS=$'\x1f' read -r route summary args; do
      _omarchy_summaries[$route]=$summary
      _omarchy_args[$route]=$args
    done < <(omarchy commands --json --all 2>/dev/null |
      jq -r '.commands[] | .routes[] as $r | [$r, .summary, .args] | join("\u001f")')
  fi

  # Route typed so far: every word before the cursor except options.
  local -a typed
  local word
  for word in "${(@)words[2,CURRENT-1]}"; do
    [[ -n $word && $word != -* ]] && typed+=("$word")
  done
  local prefix="omarchy${typed:+ ${(j: :)typed}}"

  local -A next_words
  local key rest next
  for key in "${(@k)_omarchy_summaries}"; do
    [[ $key == "$prefix "* ]] || continue
    rest=${key#"$prefix "}
    next_words[${rest%% *}]=1
  done

  local -a choices
  for next in "${(@k)next_words}"; do
    key="$prefix $next"
    if (( ${+_omarchy_summaries[$key]} )); then
      choices+=("${next//:/\\:}:${_omarchy_summaries[$key]}")
    else
      choices+=("${next//:/\\:}:$key commands")
    fi
  done
  (( CURRENT == 2 )) && choices+=("commands:List documented Omarchy commands")
  if [[ ${words[2]} == commands ]] && (( CURRENT >= 3 )); then
    choices+=(--all --json --markdown --check)
  fi
  if (( ${#choices} )); then
    _describe -t omarchy-commands 'omarchy command' choices
    return
  fi

  # Leaf command: find the longest route before the cursor and match its args
  # spec (alternatives split on " | ") against the words typed after it.
  local n first=0 j
  for (( n = CURRENT - 1; n >= 2; n-- )); do
    key=omarchy
    for word in "${(@)words[2,n]}"; do
      [[ -n $word && $word != -* ]] && key+=" $word"
    done
    if (( ${+_omarchy_args[$key]} )); then
      first=$(( n + 1 ))
      break
    fi
  done

  local -a alts spec values
  local alt token value matched
  local current=$(( CURRENT - first ))
  if (( first )); then
    alts=("${(@s: | :)_omarchy_args[$key]}")
    for alt in "${alts[@]}"; do
      spec=(${=alt})
      matched=1
      for (( j = 1; j <= current; j++ )); do
        token=${spec[j]}
        word=${words[first + j - 1]}
        if [[ -z $token ]]; then
          matched=0
        elif [[ $token == \<*\> || $token == \[*\] ]]; then
          value=${${token#[<\[]}%[>\]]}
          [[ $value == *\|* && ${${(s:|:)value}[(Ie)$word]} == 0 ]] && matched=0
        elif [[ $token != "$word" ]]; then
          matched=0
        fi
        (( matched )) || break
      done
      (( matched )) || continue

      token=${spec[current + 1]}
      [[ -n $token ]] || continue
      if [[ $token == \<*\> || $token == \[*\] ]]; then
        value=${${token#[<\[]}%[>\]]}
        [[ $value == *\|* ]] && values+=("${(@s:|:)value}")
      else
        values+=("$token")
      fi
    done
  fi

  if (( ${#values} )); then
    compadd -a values
  else
    _default
  fi
}
compdef _omarchy omarchy

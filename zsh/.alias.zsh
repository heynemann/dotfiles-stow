alias wslview='/mnt/c/Windows/explorer.exe'
export BROWSER='/mnt/c/Windows/explorer.exe'
alias open='wslview'
alias st="~/.zsh/bin/st"
alias ls="ls --color"

# Copy/paste
alias pbcopy='xclip -selection clipboard'
alias pbpaste='xclip -selection clipboard -o'

# Git
gmc() {
  MAIN=$(git remote show origin | grep 'HEAD branch' | cut -d' ' -f5)
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

  # If current branch is main branch, just rebase remote
  if [ "$CURRENT_BRANCH" = "$MAIN" ]; then
    # Is there an upstream?
    if git config remote.upstream.url > /dev/null; then
      git pull --rebase upstream $MAIN
      git push origin $MAIN
    else
      git pull --rebase origin $MAIN
    fi

    return
  fi

  # Otherwise, if there's upstream, fetch from upstream and sync origin
  if git config remote.upstream.url > /dev/null; then
    git fetch upstream $MAIN:$MAIN
    git push origin $MAIN:$MAIN

    return
  fi

  # If no upstream, just fetch from origin to local main
  git fetch origin $MAIN:$MAIN
}

gnew() {
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  if [ "$BRANCH" != "main" ]; then
    git checkout -b "$(whoami)/$1"

    return
  fi

  if git config remote.upstream.url > /dev/null; then
    git pull --rebase upstream main
  else
    git pull --rebase origin main
  fi

  git push
  git checkout -b "$(whoami)/$1"
}

alias gd='git diff $(git merge-base main HEAD)'
alias merge-base='git merge-base main HEAD'
alias gup='gmc'
alias gom='git pull --rebase origin main'

git-branch-fzf () {
  git --no-pager branch -vv --sort='-committerdate:iso8601' | fzf +m --preview="git --no-pager log --abbrev-commit -5 {1} | bat --color always --plain" | awk '{print $1}'
}

git-recent-branch-fzf() {
  git reflog show --pretty=format:'%gs ~ %gd' --date=relative | grep 'checkout:' | grep -oE '[^ ]+ ~ .*' | awk -F~ '!seen[$1]++' | head -n 10 | awk -F' ~ HEAD@{' '{printf("%-20s\t%s\n", substr($2, 1, length($2)-1), $1)}' | fzf +m --delimiter "\t" --nth 2 --preview="git --no-pager log --abbrev-commit -5 {2} | bat --color always --plain" | awk ' { print $NF } '
}

git-all-branches-fzf () {
  # git fetch -a
  git --no-pager branch -vv -a --sort='-committerdate:iso8601' | grep -v master | grep -v "origin/HEAD" | grep "remotes/" | fzf +m --preview="git --no-pager log --abbrev-commit -5 {1} | bat --color always --plain" | awk '{print $1}'
}

git-commit-fzf () {
   git log --format='%h %s' --max-count=100 | fzf +m --preview="git --no-pager log --abbrev-commit -5 {1} | bat --color always --plain" | awk '{print $1}'
}

greb() {
  branch=$(git-branch-fzf)
  if [ -z $branch ]; then
    return
  fi

  if ! git diff-index --quiet HEAD; then
    echo "👉 Stashing local changes before rebase 👈"
    echo

    git stash && git rebase $branch; git stash pop

    echo
    echo "🎉 Rebase done and changes unstashed! 🎉"

    return
  fi

  git rebase $branch
}

gc() {
  branch=$(git-branch-fzf)
  if [ -z $branch ]; then
    return
  fi

  if ! git diff-index --quiet HEAD; then
    echo "👉 Stashing local changes before checkout 👈"
    echo

    git stash && git checkout $branch; git stash pop

    echo
    echo "🎉 Checkout done and changes unstashed! 🎉"

    return
  fi

  git checkout $branch
}

# Docker
alias docker-stop="docker container ls -q | awk ' { print $1 } ' | xargs docker stop"
alias docker-rm='docker rm --force $(docker ps --all -q) && docker rmi --force $(docker images --all -q)'
alias docker-rm-volumes="docker volume ls | awk ' { print $2 } ' | grep -v VOLUME | xargs docker volume rm"
alias docker-nuke='docker system prune --all --force --volumes'
alias docker-prune='docker system prune --all --force --volumes'

docker-ps-fzf () {
  docker ps | fzf +m --layout=reverse --header-lines=1 --preview-window=right,50%,cycle --preview="docker inspect {1} | bat --color always -l json --plain" | awk '{print $1}'
}

docker-ps-a-fzf () {
  docker ps -a | fzf +m --layout=reverse --header-lines=1 --preview-window=right,50%,cycle --preview="docker inspect {1} | bat --color always -l json --plain" | awk '{print $1}'
}

alias ds='docker-ps-fzf | xargs docker stop'
alias dl='docker-ps-a-fzf | xargs docker logs'
alias de="docker-ps-fzf | xargs echo -n | awk '{ print \$1 \" /bin/bash\"}' | xargs -o docker exec -it"

# Processes
alias psc='ps aux | fzf'
alias psk="psc | awk ' { print \$2 } ' | xargs kill -9"

# Load Testing
alias hit='wrk -c 50 -t 10 -d 30s --latency '

# Go
alias gonuke="go clean -i -r -cache -modcache -testcache -fuzzcache"

# VIM
alias vim="nvim"

# Omp
export PATH="/home/heynemann/.bun/bin:$PATH"
alias ompu="brew update && brew upgrade omp && omp plugin marketplace update heynemann && omp plugin upgrade base@heynemann"

export OMP_PROFILES="doordash,unity,nubank,hep"

ompp() {
  local -a profiles
  profiles=(default ${(s:,:)OMP_PROFILES})          # split on commas, "default" first
  profiles=(${(u)profiles//[[:space:]]/})            # trim spaces, drop empties and duplicates

  local selected
  selected=$(print -rl -- $profiles | fzf --prompt='omp profile> ' --height=40% --reverse) || return

  if [[ $selected == default ]]; then
    omp "$@"
  else
    omp --profile "$selected" "$@"
  fi
}

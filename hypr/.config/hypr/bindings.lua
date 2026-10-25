-- Keep only your personal keybinding overrides here. Add new bindings or
-- unbind defaults before replacing them.

-- See current bindings and descriptions:
--   omarchy menu keybindings --print

-- To disable every Omarchy default binding, set this in
-- ~/.config/hypr/hyprland.lua before require("default.hypr.omarchy"), then add
-- only the bindings you want below:
--   omarchy_default_bindings = false

-- To disable all preinstalled app/webapp bindings, set:
--   omarchy_preinstalled_bindings = false

-- Add a new binding.
-- o.bind("SUPER + SHIFT + R", "SSH", "alacritty -e ssh your-server")

-- Change an existing binding by unbinding it first, then binding the key again.
-- This example changes SUPER+SPACE from the launcher to the Omarchy root menu.
-- hl.unbind("SUPER + SPACE")
-- o.bind("SUPER + SPACE", "Omarchy menu", "omarchy-menu toggle root")

-- Disable a default binding without replacing it.
-- hl.unbind("SUPER + SHIFT + B")

-- Logitech MX Keys examples:
-- o.bind("SUPER + SHIFT + S", nil, "omarchy-capture-screenshot")
-- o.bind("SUPER + H", nil, "voxtype record toggle")
-- o.bind("SUPER + PERIOD", nil, "omarchy-shell shell toggle omarchy.emojis")

-- Cycle the focused monitor's workspaces, wrapping at the ends. The cycle is
-- every id from 1 up to this monitor's last non-empty workspace (empty ones
-- included), plus one empty workspace after it. Ids currently shown on another
-- monitor are skipped.
local function cycle_monitor_workspace(step)
  local monitor = hl.get_active_monitor()
  local current = hl.get_active_workspace()
  if not monitor or not current then
    return
  end

  local other, last = {}, 0
  for _, ws in ipairs(hl.get_workspaces()) do
    if ws.id > 0 and ws.monitor then
      if ws.monitor.name ~= monitor.name then
        other[ws.id] = true
      elseif ws.windows > 0 and ws.id > last then
        last = ws.id
      end
    end
  end

  local ids = {}
  for id = 1, last do
    if not other[id] then
      table.insert(ids, id)
    end
  end

  local empty = last + 1
  while other[empty] do
    empty = empty + 1
  end
  table.insert(ids, empty)

  if current.id > empty then
    table.insert(ids, current.id)
  end

  for i, id in ipairs(ids) do
    if id == current.id then
      local target = ids[(i - 1 + step) % #ids + 1]
      hl.dispatch(hl.dsp.focus({ workspace = tostring(target) }))
      return
    end
  end
end

o.bind("CTRL + LEFT", "Previous workspace on monitor", function() cycle_monitor_workspace(-1) end)
o.bind("CTRL + RIGHT", "Next workspace on monitor", function() cycle_monitor_workspace(1) end)

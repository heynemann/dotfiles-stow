-- Learn how to configure Hyprland: https://wiki.hypr.land/Configuring/Start/

-- Omarchy's bootstrap keeps path setup out of this user config.
dofile((os.getenv("OMARCHY_PATH") or "/usr/share/omarchy") .. "/default/hypr/bootstrap.lua")

-- Disable all Omarchy default bindings. Add your own in hypr/bindings.lua.
-- omarchy_default_bindings = false
--
-- Or disable only bindings for Omarchy's preinstalled apps/web apps while
-- keeping core window-manager bindings:
-- omarchy_preinstalled_bindings = false

-- Load Omarchy defaults.
require("default.hypr.omarchy")

-- Put your personal overrides in these files. They're loaded after Omarchy's
-- defaults so package updates can improve the defaults without rewriting your
-- ~/.config/hypr files.
require("hypr.monitors")
require("hypr.input")
require("hypr.bindings")
require("hypr.looknfeel")
require("hypr.autostart")

-- Toggle config flags dynamically.
require("default.hypr.toggles")

-- Add any other personal Hyprland configuration below.
-- o.window("qemu", { workspace = "5" })

-- Open new browser windows on the right monitor (DP-1, positioned at 2560x0 in monitors.lua).
-- Tags come from Omarchy's default/hypr/apps/browser.lua; web apps (chrome-*) are not tagged.
o.window({ tag = "chromium-based-browser" }, { monitor = "DP-1" })
o.window({ tag = "firefox-based-browser" }, { monitor = "DP-1" })

-- Open Spotify on the left monitor (HDMI-A-1, positioned at -2560x0 in monitors.lua).
o.window("Spotify", { monitor = "HDMI-A-1" })

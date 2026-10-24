-- Rules for the heynemann-omarchy machine only (loaded by hyprland.lua by hostname).

-- Monitor layout: HDMI-A-1 left, DP-2 middle, DP-1 right.
hl.monitor({ output = "HDMI-A-1", mode = "3840x2160@60", position = "-2560x0", scale = 1.5 })
hl.monitor({ output = "DP-2", mode = "2560x1440@239.97", position = "0x0", scale = 1 })
hl.monitor({ output = "DP-1", mode = "3840x2160@59.997", position = "2560x0", scale = 1.5 })

-- Open new browser windows on the right monitor.
-- Tags come from Omarchy's default/hypr/apps/browser.lua; web apps (chrome-*) are not tagged.
o.window({ tag = "chromium-based-browser" }, { monitor = "DP-1" })
o.window({ tag = "firefox-based-browser" }, { monitor = "DP-1" })

-- Open Spotify on the left monitor.
o.window("Spotify", { monitor = "HDMI-A-1" })

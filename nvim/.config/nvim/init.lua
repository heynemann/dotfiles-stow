-- load general config for nvim
require("config.general")

-- load lazy plugins
require("config.lazy")

-- ---------- PLUGINS CONFIGURATION ----------

require("config.telescope")
require("config.lualine")
require("config.treesitter")
require("config.neotree")

-- ------ END OF PLUGINS CONFIGURATION -------

-- load key mappings
require("config.mappings")

-- programming languages
require("config.go")

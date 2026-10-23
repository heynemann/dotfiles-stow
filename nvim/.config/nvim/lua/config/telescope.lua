local actions = require("telescope.actions")

require("telescope").setup({
  defaults = {
    mappings = {
      i = {
	["<cr>"] = function(bufnr)
          require("telescope.actions.set").edit(bufnr, "tab drop")
        end
        -- ["<CR>"] = actions.select_tab, -- Opens in a new tab on Enter (insert mode)
      },
      n = {
        ["<CR>"] = actions.select_tab, -- Opens in a new tab on Enter (normal mode)
      },
    },
  },
})

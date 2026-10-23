return {
  -- Treesitter is a new parser generator tool that we can
  -- use in Neovim to power faster and more accurate
  -- syntax highlighting.

  {
    'nvim-treesitter/nvim-treesitter',
    lazy = false,
    build = ':TSUpdate'
  },

  {
    "wurli/contextindent.nvim",
    -- This is the only config option; you can use it to restrict the files
    -- which this plugin will affect (see :help autocommand-pattern).
    opts = { pattern = "*" },
    dependencies = { "nvim-treesitter/nvim-treesitter" },
  }
}

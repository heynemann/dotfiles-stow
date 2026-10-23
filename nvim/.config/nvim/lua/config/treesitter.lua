local treesitter = require("nvim-treesitter")
treesitter.setup({})
treesitter.install({ "c_sharp" })

vim.api.nvim_create_autocmd("FileType", {
  group = vim.api.nvim_create_augroup("TreesitterFiletype", { clear = true }),
  pattern = "*",
  callback = function()
    -- Check if a Tree-sitter parser is available for the current buffer's language
    local has_parser, parser = pcall(vim.treesitter.get_parser, 0)
    
    if has_parser and parser then
      vim.treesitter.start()
      -- Stop standard internal Neovim indent scripts from overriding this configuration
      vim.b.did_indent = 1 
      
      -- Apply Tree-sitter indentation
      vim.bo.indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
    end
  end,
})

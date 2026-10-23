-- Make sure to setup `mapleader` and `maplocalleader` before
-- loading lazy.nvim so that mappings are correct.
-- This is also a good place to setup other settings (vim.opt)
vim.g.mapleader = ","
vim.g.maplocalleader = "\\"

local is_wsl = os.getenv("WSL_DISTRO_NAME") ~= nil

if is_wsl then
  vim.api.nvim_set_option("clipboard","unnamedplus")
else
  vim.api.nvim_set_option("clipboard","unnamed")
end

vim.api.nvim_set_option("incsearch", true)
vim.api.nvim_set_option("hlsearch", true)
vim.schedule(function()
  if is_wsl then
    vim.opt.clipboard = 'unnamedplus'
  else
    vim.opt.clipboard = 'unnamed'
  end
end)

vim.opt.ignorecase = true
vim.opt.smartcase = true

-- tree-sitter needs a native C compiler, not a WSL executable.
if vim.fn.has("win32") == 1 and not vim.env.CC and vim.fn.executable("gcc") == 1 then
  vim.env.CC = "gcc"
end

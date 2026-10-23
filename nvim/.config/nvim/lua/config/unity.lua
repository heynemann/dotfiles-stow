local M = {}

function M.setup(adapter_dir)
  require("dap").adapters.unity = {
    type = "executable",
    command = vim.fs.joinpath(adapter_dir, "bin", "Release", "unity-debug-adapter.exe"),
    args = { "--log-level=warn" },
    options = { detached = false },
  }
  -- Unity is invoked directly with ,ua; leave every C#/.NET DAP configuration intact.
end

function M.attach()
  local dap = require("dap")
  local adapter = dap.adapters.unity
  if not adapter or vim.fn.filereadable(adapter.command) ~= 1 then
    vim.notify("Unity adapter is not built. Run :Lazy build unity-dap (native Windows .NET SDK required).", vim.log.levels.ERROR)
    return
  end

  -- Use the real Mono endpoint, NOT Neovim's RPC --listen port.
  -- Windows: %LOCALAPPDATA%/Unity/Editor/Editor.log, 'Using monoOptions ... address=IP:PORT'.
  -- Editor must be in Debug mode; Players need Mono + Development Build + Script Debugging.
  -- unity-dap parses address with IPAddress.Parse: enter a literal IP, not a hostname.
  vim.ui.input({ prompt = "Unity debugger IP address: ", default = "127.0.0.1" }, function(address)
    if not address or vim.trim(address) == "" then
      return
    end
    address = vim.trim(address)
    vim.ui.input({ prompt = "Unity debugger port (from Editor.log / Player debugger dialog): " }, function(value)
      if not value then
        return
      end
      local port = tonumber(value)
      if not port or port % 1 ~= 0 or port < 1 or port > 65535 then
        vim.notify("Enter the actual Unity Mono debugger port (1–65535).", vim.log.levels.ERROR)
        return
      end
      -- The adapter accepts address + port, but has no sourceRoot/sourceFileMap option.
      -- Native Neovim and Unity must use the same Windows source paths.
      dap.run({
        name = "Unity Editor / Mono Player",
        type = "unity",
        request = "attach",
        address = address,
        port = port,
      })
    end)
  end)
end

return M

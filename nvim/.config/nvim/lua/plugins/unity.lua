return {
  {
    "walcht/unity-dap",
    tag = "v0.1.0",
    -- This net472 executable runs under native Windows .NET Framework, not netcoredbg.
    -- Keep WSL's existing editor independent of Windows-only build/runtime prerequisites.
    enabled = vim.fn.has("win32") == 1,
    lazy = true,
    submodules = true,
    dependencies = { "mfussenegger/nvim-dap" },
    build = function(plugin)
      local function run(args)
        local result = vim.system(args, { cwd = plugin.dir, text = true }):wait()
        if result.code ~= 0 then
          error(table.concat(args, " ") .. "\n" .. (result.stdout or "") .. (result.stderr or ""))
        end
      end

      -- The debugger-libs submodule needs legacy SymbolStore/FileFormats packages.
      -- Sources apply only to this restore; never mutate the user's NuGet configuration.
      run({
        "dotnet", "restore", "unity-debug-adapter/unity-debug-adapter.csproj",
        "--source", "https://api.nuget.org/v3/index.json",
        "--source", "https://pkgs.dev.azure.com/dnceng/public/_packaging/dotnet-tools/nuget/v3/index.json",
      })
      run({
        "dotnet", "build", "unity-debug-adapter/unity-debug-adapter.csproj",
        "--configuration", "Release", "--no-restore",
      })
    end,
    config = function(plugin)
      require("config.unity").setup(plugin.dir)
    end,
    keys = {
      {
        "<leader>ua",
        function() require("config.unity").attach() end,
        desc = "Attach Unity Editor/Mono Player",
      },
    },
  },
}

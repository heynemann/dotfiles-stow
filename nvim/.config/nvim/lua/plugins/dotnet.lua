return {
  {
    "mason-org/mason.nvim",
    opts_extend = { "ensure_installed" },
    opts = {
      registries = {
        "github:mason-org/mason-registry",
        "github:Crashdummyy/mason-registry",
      },
      -- This registry supplies the recent Roslyn version required by roslyn.nvim.
      ensure_installed = { "roslyn" },
    },
  },
  {
    "seblyng/roslyn.nvim",
    -- Configure target selection before FileType starts the server.
    event = { "BufReadPre", "BufNewFile" },
    dependencies = { "mason-org/mason.nvim" },
    opts = {
      -- Discover above Assets without recursively scanning Library.
      broad_search = false,
      lock_target = false,
      choose_target = function(targets)
        for _, target in ipairs(targets) do
          local root = vim.fs.dirname(target)
          if vim.fs.basename(target) == vim.fs.basename(root) .. ".sln"
            and vim.fn.filereadable(vim.fs.joinpath(root, "ProjectSettings", "ProjectVersion.txt")) == 1
          then
            return target
          end
        end
      end,
    },
  },
  {
    "GustavEikaas/easy-dotnet.nvim",
    cmd = "Dotnet",
    dependencies = {
      "nvim-lua/plenary.nvim",
      "nvim-telescope/telescope.nvim",
      "mfussenegger/nvim-dap",
    },
    init = function()
      -- Global tools must be discoverable even when a GUI inherits an old PATH.
      -- Install beforehand with: dotnet tool install --global EasyDotnet
      local windows = vim.fn.has("win32") == 1
      local home = windows and vim.env.USERPROFILE or vim.uv.os_homedir()
      local tools = vim.fs.joinpath(home or vim.fn.expand("~"), ".dotnet", "tools")
      vim.env.PATH = tools .. (windows and ";" or ":") .. (vim.env.PATH or "")
    end,
    keys = {
      { "<leader>nb", function() require("easy-dotnet").build() end, desc = ".NET build project" },
      { "<leader>nr", function() require("easy-dotnet").run() end, desc = ".NET run project" },
      { "<leader>nt", function() require("easy-dotnet").test() end, desc = ".NET test project" },
      { "<leader>ns", function() require("easy-dotnet").restore() end, desc = ".NET restore solution" },
      { "<leader>nd", function() require("easy-dotnet").debug() end, desc = ".NET debug project" },
      { "<leader>na", function() require("easy-dotnet").debug_attach() end, desc = ".NET attach debugger" },
      { "<leader>nT", function() require("easy-dotnet").testrunner() end, desc = ".NET test runner" },
    },
    opts = {
      picker = "telescope",
      -- Roslyn is exclusively owned by roslyn.nvim, including preload paths.
      lsp = {
        enabled = false,
        preload_roslyn = false,
        roslynator_enabled = false,
        easy_dotnet_analyzer_enabled = false,
        easy_dotnet_extension_enabled = false,
        auto_refresh_codelens = false,
        suggest_updates = false,
        razor = { enabled = false },
      },
      projx_lsp = { enabled = false },
      debugger = {
        engine = "netcoredbg",
        auto_register_dap = true,
        console = "integratedTerminal",
        mem_cpu_usage = false,
        apply_value_converters = false,
      },
      -- Commands remain available, but opening Unity scripts must not bootstrap
      -- tests, insert namespaces/classes, inspect the clipboard or replace ,t.
      auto_bootstrap_namespace = {
        enabled = false,
        use_clipboard_json = { behavior = "never" },
      },
      csproj_mappings = false,
      fsproj_mappings = false,
      test_runner = {
        auto_start_testrunner = false,
        mappings = {
          run_test_from_buffer = { lhs = "<leader>ntc", desc = ".NET run test at cursor" },
          run_all_tests_from_buffer = { lhs = "<leader>ntf", desc = ".NET run tests in file" },
          debug_test_from_buffer = { lhs = "<leader>ndt", desc = ".NET debug test at cursor" },
          get_build_errors = { lhs = "<leader>ne", desc = ".NET build errors" },
          peek_stack_trace_from_buffer = { lhs = "<leader>np", desc = ".NET peek test output" },
          debug_test = { lhs = "<leader>nd", desc = ".NET debug test" },
          go_to_file = { lhs = "<leader>ng", desc = ".NET go to test" },
          run_all = { lhs = "<leader>nA", desc = ".NET run all tests" },
          run = { lhs = "<leader>nt", desc = ".NET run test" },
          peek_stacktrace = { lhs = "<leader>np", desc = ".NET peek test output" },
        },
      },
      notifications = { handler = false },
    },
  },
  {
    "stevearc/conform.nvim",
    opts = {
      -- Use Roslyn through the existing ,f / format-on-save workflow, without
      -- another formatter executable or changes to Go/Python defaults.
      formatters_by_ft = {
        cs = { lsp_format = "fallback" },
      },
    },
  },
}

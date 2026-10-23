return {
  {
    "mfussenegger/nvim-dap",
    lazy = true,
    -- Copied from LazyVim/lua/lazyvim/plugins/extras/dap/core.lua and
    -- modified.
    keys = {
      {
        "<leader>db",
        function() require("dap").toggle_breakpoint() end,
        desc = "Toggle Breakpoint"
      },

      {
        "<leader>dc",
        function() require("dap").continue() end,
        desc = "Continue"
      },

      {
        "<leader>dC",
        function() require("dap").run_to_cursor() end,
        desc = "Run to Cursor"
      },

      {
        "<leader>dT",
        function() require("dap").terminate() end,
        desc = "Terminate"
      },
    },
  },
  {
    "leoluz/nvim-dap-go",
    ft = "go",
    config = true,
    dependencies = {
      "mfussenegger/nvim-dap",
    },
    keys = {
      {
        "<leader>dt",
        function() require('dap-go').debug_test() end,
        desc = "Debug test"
      },
    },
  },
  {
    "mfussenegger/nvim-dap-python",
    lazy = true,
    ft = "python",
    config = function()
      local python = vim.fs.joinpath(
        vim.fn.stdpath("data"), "mason", "packages", "debugpy", "venv",
        vim.fn.has("win32") == 1 and "Scripts/python.exe" or "bin/python"
      )
      require("dap-python").setup(python)
    end,
    -- Consider the mappings at
    -- https://github.com/mfussenegger/nvim-dap-python?tab=readme-ov-file#mappings
    dependencies = {
      "mfussenegger/nvim-dap",
    },
  },
  {
    "jay-babu/mason-nvim-dap.nvim",
    ft = { "go", "python", "sh", "php", "c", "cpp", "rust" },
    ---@type MasonNvimDapSettings
    opts = {
      -- This line is essential to making automatic installation work
      -- :exploding-brain
      handlers = {},
      automatic_installation = {
        -- These will be configured by separate plugins.
        exclude = {
          "delve",
          "python",
        },
      },
      -- DAP servers: Mason will be invoked to install these if necessary.
      ensure_installed = {
        "bash",
        "codelldb",
        "php",
        "python",
      },
    },
    dependencies = {
      "mfussenegger/nvim-dap",
      "mason-org/mason.nvim",
    },
  },
  {
    "fredrikaverpil/neotest-golang",
  },
  {
    "mfussenegger/nvim-lint",
    event = {
      "BufReadPre",
      "BufNewFile",
    },
    dependencies = {
      {
        "mason-org/mason.nvim",
        opts = { ensure_installed = { "golangci-lint" } },
      },
    },
    config = function()
      local lint = require("lint")
      lint.linters_by_ft = {
        markdown = { "markdownlint" },
        quarto = { "markdownlint" },
        go = { "golangcilint" },
      }

      lint.linters.markdownlint.args = {
        "--fix",
        "--disable",
        "MD013",
        "--",
      }

      local lint_augroup = vim.api.nvim_create_augroup("lint", { clear = true })

      vim.api.nvim_create_autocmd({ "BufEnter", "BufWritePost", "TextChanged" }, {
        group = lint_augroup,
        callback = function()
          lint.try_lint()
        end,
      })
    end,
  },
  {
    "stevearc/conform.nvim",
    event = { "BufWritePre" },
    cmd = { "ConformInfo" },
    keys = {
      {
        -- Customize or remove this keymap to your liking
        "<leader>f",
        function()
          require("conform").format({ async = true })
        end,
        mode = "",
        desc = "Format buffer",
      },
    },
    -- This will provide type hinting with LuaLS
    ---@module "conform"
    ---@type conform.setupOpts
    opts = {
      -- Define your formatters
      formatters_by_ft = {
        lua = { "stylua" },
        python = { "isort", "black" },
        javascript = { "prettierd", "prettier", stop_after_first = true },
        go = { "goimports", "gofumpt" },
      },
      -- Set default options
      default_format_opts = {
        lsp_format = "fallback",
      },
      -- Set up format-on-save
      format_on_save = { timeout_ms = 500 },
      -- Customize formatters
      formatters = {
        shfmt = {
          append_args = { "-i", "2" },
        },
      },
    },
    init = function()
      -- If you want the formatexpr, here is the place to set it
      vim.o.formatexpr = "v:lua.require'conform'.formatexpr()"
    end,
  },
}

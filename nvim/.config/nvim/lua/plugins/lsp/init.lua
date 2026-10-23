return {
  -- lspconfig
  {
    "neovim/nvim-lspconfig",
    event = { "BufReadPre", "BufNewFile" },
    dependencies = {
      "mason.nvim",
      { "mason-org/mason-lspconfig.nvim", config = function() end },
    },
    opts_extend = { "servers.*.keys" },
    opts = function()
      ---@class PluginLspOpts
      local ret = {
        -- options for vim.diagnostic.config()
        ---@type vim.diagnostic.Opts
        diagnostics = {
          underline = true,
          update_in_insert = false,
          virtual_text = {
            spacing = 4,
            source = "if_many",
            prefix = "●",
          },
          severity_sort = true,
        },
        -- Inlay hints are enabled when the attached server supports them.
        inlay_hints = {
          enabled = true,
          exclude = { "vue" }, -- filetypes for which you don't want to enable inlay hints
        },
        servers = {
          -- configuration for all lsp servers
          ["*"] = {
            capabilities = {
              workspace = {
                fileOperations = {
                  didRename = true,
                  willRename = true,
                },
              },
            },
            -- stylua: ignore
            keys = {
              { "gd", vim.lsp.buf.definition, desc = "Goto Definition", has = "definition" },
              { "gr", vim.lsp.buf.references, desc = "References", nowait = true },
              { "gI", vim.lsp.buf.implementation, desc = "Goto Implementation" },
              { "gy", vim.lsp.buf.type_definition, desc = "Goto T[y]pe Definition" },
              { "gD", vim.lsp.buf.declaration, desc = "Goto Declaration" },
              { "K", function() return vim.lsp.buf.hover() end, desc = "Hover" },
              { "gK", function() return vim.lsp.buf.signature_help() end, desc = "Signature Help", has = "signatureHelp" },
              { "<c-k>", function() return vim.lsp.buf.signature_help() end, mode = "i", desc = "Signature Help", has = "signatureHelp" },
              { "<leader>ca", vim.lsp.buf.code_action, desc = "Code Action", mode = { "n", "x" }, has = "codeAction" },
              { "<leader>cL", vim.lsp.codelens.run, desc = "Run Codelens", has = "codeLens" },
              { "<leader>cC", vim.lsp.codelens.refresh, desc = "Refresh & Display Codelens", mode = { "n" }, has = "codeLens" },
              { "<leader>cr", vim.lsp.buf.rename, desc = "Rename", has = "rename" },
            },
          },
          gopls = {
            init_options = {
              semanticTokens = true,
            },
            settings = {
              gopls = {
                gofumpt = true,
                codelenses = {
                  gc_details = false,
                  generate = true,
                  regenerate_cgo = true,
                  run_govulncheck = true,
                  test = true,
                  tidy = true,
                  upgrade_dependency = true,
                  vendor = true,
                },
                hints = {
                  assignVariableTypes = true,
                  compositeLiteralFields = true,
                  compositeLiteralTypes = true,
                  constantValues = true,
                  functionTypeParameters = true,
                  parameterNames = true,
                  rangeVariableTypes = true,
                },
                analyses = {
                  nilness = true,
                  unusedparams = true,
                  unusedwrite = true,
                  useany = true,
                },
                usePlaceholders = true,
                completeUnimported = true,
                staticcheck = true,
                directoryFilters = { "-.git", "-.vscode", "-.idea", "-.vscode-test", "-node_modules" },
              },
            },
          },
          stylua = { enabled = false },
          lua_ls = {
            settings = {
              Lua = {
                workspace = {
                  checkThirdParty = false,
                },
                codeLens = {
                  enable = true,
                },
                completion = {
                  callSnippet = "Replace",
                },
                doc = {
                  privateName = { "^_" },
                },
                hint = {
                  enable = true,
                  setType = false,
                  paramType = true,
                  paramName = "Disable",
                  semicolon = "Disable",
                  arrayIndex = "Disable",
                },
              },
            },
          },
        },
        -- A setup callback may return true to take ownership of a server.
        setup = {
        },
      }
      return ret
    end,
    ---@param opts PluginLspOpts
    config = function(_, opts)
      vim.diagnostic.config(opts.diagnostics)

      local defaults = vim.deepcopy(opts.servers["*"] or {})
      defaults.keys = nil
      vim.lsp.config("*", defaults)

      vim.api.nvim_create_autocmd("LspAttach", {
        group = vim.api.nvim_create_augroup("LanguageServerAttach", { clear = true }),
        callback = function(event)
          local client = vim.lsp.get_client_by_id(event.data.client_id)
          if not client then
            return
          end

          local keys = vim.list_extend(
            vim.deepcopy((opts.servers["*"] or {}).keys or {}),
            (opts.servers[client.name] or {}).keys or {}
          )
          for _, key in ipairs(keys) do
            if not key.has or client:supports_method("textDocument/" .. key.has, event.buf) then
              vim.keymap.set(key.mode or "n", key[1], key[2], {
                buffer = event.buf,
                desc = key.desc,
                nowait = key.nowait,
              })
            end
          end

          if opts.inlay_hints.enabled
            and not vim.tbl_contains(opts.inlay_hints.exclude, vim.bo[event.buf].filetype)
            and client:supports_method("textDocument/inlayHint", event.buf)
          then
            vim.lsp.inlay_hint.enable(true, { bufnr = event.buf })
          end

          if vim.bo[event.buf].filetype == "cs"
            and client:supports_method("textDocument/completion", event.buf)
          then
            vim.lsp.completion.enable(true, client.id, event.buf, { autotrigger = true })
          end
        end,
      })

      -- get all the servers that are available through mason-lspconfig
      local mason_all = vim.tbl_keys(require("mason-lspconfig.mappings").get_mason_map().lspconfig_to_package)
        or {} --[[ @as string[] ]]
      -- Roslyn is enabled by roslyn.nvim, not Mason's generic LSP setup.
      local mason_exclude = { "roslyn", "omnisharp" }

      ---@return boolean? exclude automatic setup
      local function configure(server)
        if server == "*" then
          return false
        end
        local sopts = opts.servers[server]
        sopts = sopts == true and {} or (not sopts) and { enabled = false } or vim.deepcopy(sopts)

        sopts.keys = nil
        if sopts.enabled == false then
          mason_exclude[#mason_exclude + 1] = server
          return
        end

        local use_mason = sopts.mason ~= false and vim.tbl_contains(mason_all, server)
        local setup = opts.setup[server] or opts.setup["*"]
        if setup and setup(server, sopts) then
          mason_exclude[#mason_exclude + 1] = server
        else
          vim.lsp.config(server, sopts) -- configure the server
          if not use_mason then
            vim.lsp.enable(server)
          end
        end
        return use_mason
      end

      local install = vim.tbl_filter(configure, vim.tbl_keys(opts.servers))
      require("mason-lspconfig").setup({
        ensure_installed = install,
        automatic_enable = { exclude = mason_exclude },
      })
    end,
  },

  -- cmdline tools and lsp servers
  {

    "mason-org/mason.nvim",
    cmd = "Mason",
    keys = { { "<leader>cm", "<cmd>Mason<cr>", desc = "Mason" } },
    build = ":MasonUpdate",
    opts_extend = { "ensure_installed" },
    opts = {
      ensure_installed = {
        "stylua",
        "shfmt",
      },
    },
    ---@param opts MasonSettings | {ensure_installed: string[]}
    config = function(_, opts)
      require("mason").setup(opts)
      local mr = require("mason-registry")
      mr:on("package:install:success", function()
        vim.defer_fn(function()
          -- trigger FileType event to possibly load this newly installed LSP server
          require("lazy.core.handler.event").trigger({
            event = "FileType",
            buf = vim.api.nvim_get_current_buf(),
          })
        end, 100)
      end)

      mr.refresh(function()
        for _, tool in ipairs(opts.ensure_installed) do
          local p = mr.get_package(tool)
          if not p:is_installed() then
            p:install()
          end
        end
      end)
    end,
  },
}

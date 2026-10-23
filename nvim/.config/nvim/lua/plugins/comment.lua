return {
  'numToStr/Comment.nvim',
  opts = {
      -- add any options here
    toggler = {
      ---Line-comment toggle keymap
      line = '<leader>cc',
      ---Block-comment toggle keymap
      block = '<leader>cb',
    },
  },
  config = function()
    require('Comment').setup()
  end
}

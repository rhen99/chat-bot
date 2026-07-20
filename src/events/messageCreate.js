const { collectImageAttachment } = require('../tournament/service');

module.exports = {
  async execute(message) {
    if (message.author.bot) {
      return;
    }

    collectImageAttachment(message);
  },
};

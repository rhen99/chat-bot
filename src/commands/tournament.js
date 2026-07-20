const { SlashCommandBuilder } = require('discord.js');
const {
  cancelTournament,
  createTournament,
  getTournamentStatus,
  startTournament,
} = require('../tournament/service');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tournament')
    .setDescription('Manage image tournaments in this channel.')
    .addSubcommand((subcommand) => subcommand
      .setName('create')
      .setDescription('Create a tournament in this channel.'))
    .addSubcommand((subcommand) => subcommand
      .setName('status')
      .setDescription('Show the active tournament status.'))
    .addSubcommand((subcommand) => subcommand
      .setName('cancel')
      .setDescription('Cancel the active tournament.'))
    .addSubcommand((subcommand) => subcommand
      .setName('start')
      .setDescription('Start the active tournament.')),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const channelId = interaction.channelId;

    if (subcommand === 'create') {
      await interaction.reply(createTournament(channelId, interaction.user.id));
      return;
    }

    if (subcommand === 'status') {
      await interaction.reply(getTournamentStatus(channelId));
      return;
    }

    if (subcommand === 'cancel') {
      await interaction.reply(cancelTournament(channelId));
      return;
    }

    if (subcommand === 'start') {
      await interaction.reply(startTournament(channelId));
    }
  },
};

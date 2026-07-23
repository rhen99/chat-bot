const { SlashCommandBuilder } = require('discord.js');
const {
  cancelTournament,
  closeMatch,
  createTournament,
  getTournamentStatus,
  startTournament,
  tiebreakMatch,
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
      .setDescription('Start the active tournament.'))
    .addSubcommand((subcommand) => subcommand
      .setName('close-match')
      .setDescription('Close an active tournament match.')
      .addStringOption((option) => option
        .setName('match_id')
        .setDescription('The match ID to close.')
        .setRequired(true)))
    .addSubcommand((subcommand) => subcommand
      .setName('tiebreak')
      .setDescription('Resolve a tied match with a best-of-3 coinflip.')
      .addStringOption((option) => option
        .setName('match_id')
        .setDescription('The tied match ID to resolve.')
        .setRequired(true))),

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
      await interaction.deferReply();
      await interaction.editReply(await startTournament(channelId, interaction.channel));
      return;
    }

    if (subcommand === 'close-match') {
      const matchId = interaction.options.getString('match_id', true);

      await interaction.deferReply();
      await interaction.editReply(await closeMatch(channelId, matchId, interaction.channel));
    }

    if (subcommand === 'tiebreak') {
      const matchId = interaction.options.getString('match_id', true);

      await interaction.deferReply();
      await interaction.editReply(await tiebreakMatch(channelId, matchId, interaction.channel));
    }
  },
};

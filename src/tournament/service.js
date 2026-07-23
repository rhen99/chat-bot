const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const { activeTournaments } = require('./store');

const FIRST_VERSION_ENTRY_LIMIT = 4;
const VOTE_BUTTON_PREFIX = 'tournament:vote';

function createTournament(channelId, creatorId) {
  if (activeTournaments.has(channelId)) {
    return 'A tournament is already active in this channel.';
  }

  activeTournaments.set(channelId, {
    channelId,
    creatorId,
    status: 'collecting',
    entries: [],
    createdAt: Date.now(),
  });

  return 'Tournament created. Upload image attachments in this channel to enter.';
}

function getTournamentStatus(channelId) {
  const tournament = activeTournaments.get(channelId);

  if (!tournament) {
    return 'No active tournament in this channel.';
  }

  const matchSummary = tournament.matches
    ? ` Matches: ${tournament.matches.map((match) => `${match.id} ${match.status}`).join(', ')}.`
    : '';

  return `Tournament status: ${tournament.status}. Entries collected: ${tournament.entries.length}.${matchSummary}`;
}

function cancelTournament(channelId) {
  if (!activeTournaments.has(channelId)) {
    return 'No active tournament in this channel.';
  }

  activeTournaments.delete(channelId);
  return 'Tournament cancelled.';
}

async function startTournament(channelId, channel) {
  const tournament = activeTournaments.get(channelId);

  if (!tournament) {
    return 'No active tournament in this channel.';
  }

  if (tournament.status !== 'collecting') {
    return 'This tournament has already started.';
  }

  if (tournament.entries.length !== FIRST_VERSION_ENTRY_LIMIT) {
    return 'Exactly four image entries are required to start this tournament.';
  }

  if (!channel) {
    return 'Unable to post tournament polls in this channel.';
  }

  const entries = shuffleEntries(tournament.entries);
  tournament.matches = [
    createMatch(channelId, 'sf1', 'semifinal', entries[0], entries[1]),
    createMatch(channelId, 'sf2', 'semifinal', entries[2], entries[3]),
  ];
  tournament.status = 'started';

  for (const match of tournament.matches) {
    await postMatchPoll(channel, match);
  }

  return 'Tournament started. Semifinal polls posted.';
}

async function disablePollButtons(match) {
  if (!match.pollMessage) return;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${VOTE_BUTTON_PREFIX}:${match.channelId}:${match.id}:A`)
      .setLabel('Vote A')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`${VOTE_BUTTON_PREFIX}:${match.channelId}:${match.id}:B`)
      .setLabel('Vote B')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
  );

  const payload = buildMatchMessage(match);
  await match.pollMessage.edit({ ...payload, components: [row] }).catch(() => {});
}

async function closeMatch(channelId, matchId, channel) {
  const tournament = activeTournaments.get(channelId);

  if (!tournament) {
    return 'No active tournament in this channel.';
  }

  const match = tournament.matches?.find((candidate) => candidate.id === matchId);

  if (!match) {
    return 'No active match with that match_id exists in this channel.';
  }

  if (match.status === 'closed') {
    return 'That match is already closed.';
  }

  const totals = countVotes(match);

  if (totals.A === totals.B) {
    return `Match ${match.id} cannot close because it is tied (${totals.A}-${totals.B}).`;
  }

  const winningChoice = totals.A > totals.B ? 'A' : 'B';
  match.status = 'closed';
  match.winner = winningChoice === 'A' ? match.entryA : match.entryB;
  match.winningChoice = winningChoice;
  await disablePollButtons(match);

  if (match.round === 'final') {
    tournament.status = 'completed';
    activeTournaments.delete(channelId);
    return `Tournament complete. Champion: ${match.winner.url}`;
  }

  const semifinals = tournament.matches.filter((candidate) => candidate.round === 'semifinal');
  const allSemifinalsClosed = semifinals.every((candidate) => candidate.status === 'closed');

  if (allSemifinalsClosed && !tournament.matches.some((candidate) => candidate.round === 'final')) {
    const finalMatch = createMatch(channelId, 'final', 'final', semifinals[0].winner, semifinals[1].winner);
    tournament.matches.push(finalMatch);
    tournament.status = 'final';

    if (!channel) {
      return `Match ${match.id} closed. Final match is ready, but I could not post it in this channel.`;
    }

    await postMatchPoll(channel, finalMatch);
    return `Match ${match.id} closed. Final match poll posted with match_id final.`;
  }

  return `Match ${match.id} closed. Winner: ${match.winner.url}`;
}

async function handleVoteButton(interaction) {
  const parts = interaction.customId.split(':');

  if (parts.length !== 5 || parts[0] !== 'tournament' || parts[1] !== 'vote') {
    await interaction.reply({ content: 'Unknown tournament button.', ephemeral: true });
    return;
  }

  const [, , channelId, matchId, choice] = parts;

  if (channelId !== interaction.channelId || (choice !== 'A' && choice !== 'B')) {
    await interaction.reply({ content: 'This vote button is not valid for this channel.', ephemeral: true });
    return;
  }

  const tournament = activeTournaments.get(channelId);
  const match = tournament?.matches?.find((candidate) => candidate.id === matchId);

  if (!tournament || !match || match.status !== 'open') {
    await interaction.reply({ content: 'This match is not open for voting.', ephemeral: true });
    return;
  }

  match.votes.set(interaction.user.id, choice);

  await interaction.reply({
    content: `Vote recorded for ${choice} in match ${match.id}.`,
    ephemeral: true,
  });

  if (match.pollMessage) {
    const payload = buildMatchMessage(match);
    await match.pollMessage.edit(payload).catch(() => {});
  }
}

function collectImageAttachment(message) {
  const tournament = activeTournaments.get(message.channelId);

  if (!tournament || tournament.status !== 'collecting') {
    return;
  }

  const imageAttachments = message.attachments.filter((attachment) => {
    return attachment.contentType?.startsWith('image/');
  });

  for (const attachment of imageAttachments.values()) {
    if (tournament.entries.length >= FIRST_VERSION_ENTRY_LIMIT) {
      return;
    }

    tournament.entries.push({
      attachmentId: attachment.id,
      url: attachment.url,
      userId: message.author.id,
      messageId: message.id,
    });
  }
}

function createMatch(channelId, id, round, entryA, entryB) {
  return {
    id,
    round,
    channelId,
    status: 'open',
    entryA,
    entryB,
    votes: new Map(),
    winner: null,
  };
}

function shuffleEntries(entries) {
  const shuffled = [...entries];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function buildMatchMessage(match) {
  const totals = countVotes(match);
  const total = totals.A + totals.B;

  const embedA = new EmbedBuilder()
    .setTitle('A')
    .setImage(match.entryA.url)
    .setDescription(`Votes: ${totals.A}`)
    .setColor(0x5865f2);

  const embedB = new EmbedBuilder()
    .setTitle('B')
    .setImage(match.entryB.url)
    .setDescription(`Votes: ${totals.B}`)
    .setColor(0x5865f2);

  return {
    content: `Match ${match.id} (${match.round}) — Total: ${total} vote${total === 1 ? '' : 's'}`,
    embeds: [embedA, embedB],
  };
}

async function postMatchPoll(channel, match) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${VOTE_BUTTON_PREFIX}:${match.channelId}:${match.id}:A`)
      .setLabel('Vote A')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`${VOTE_BUTTON_PREFIX}:${match.channelId}:${match.id}:B`)
      .setLabel('Vote B')
      .setStyle(ButtonStyle.Secondary),
  );

  const payload = buildMatchMessage(match);
  const message = await channel.send({ ...payload, components: [row] });
  match.pollMessage = message;
}

function countVotes(match) {
  const totals = { A: 0, B: 0 };

  for (const vote of match.votes.values()) {
    totals[vote] += 1;
  }

  return totals;
}

async function tiebreakMatch(channelId, matchId, channel) {
  const tournament = activeTournaments.get(channelId);

  if (!tournament) {
    return 'No active tournament in this channel.';
  }

  const match = tournament.matches?.find((candidate) => candidate.id === matchId);

  if (!match) {
    return 'No active match with that match_id exists in this channel.';
  }

  if (match.status === 'closed') {
    return 'That match is already closed.';
  }

  const totals = countVotes(match);

  if (totals.A !== totals.B) {
    return `Match ${match.id} is not tied (${totals.A}-${totals.B}). Use /tournament close-match instead.`;
  }

  const results = [];
  let winsA = 0;
  let winsB = 0;

  while (winsA < 2 && winsB < 2) {
    const flip = Math.random() < 0.5 ? 'A' : 'B';
    if (flip === 'A') winsA += 1;
    else winsB += 1;
    results.push(`Coinflip ${results.length + 1}: **${flip}** wins (A ${winsA} - B ${winsB})`);
  }

  const winningChoice = winsA > winsB ? 'A' : 'B';
  match.status = 'closed';
  match.winner = winningChoice === 'A' ? match.entryA : match.entryB;
  match.winningChoice = winningChoice;
  await disablePollButtons(match);

  const lines = [
    `Match ${match.id} was tied (${totals.A}-${totals.B}). Resolving by coinflip:`,
    ...results,
    `Winner: **${winningChoice}** — ${match.winner.url}`,
  ];

  if (match.round === 'final') {
    tournament.status = 'completed';
    activeTournaments.delete(channelId);
    lines.push(`Tournament complete. Champion: ${match.winner.url}`);
    return lines.join('\n');
  }

  const semifinals = tournament.matches.filter((candidate) => candidate.round === 'semifinal');
  const allSemifinalsClosed = semifinals.every((candidate) => candidate.status === 'closed');

  if (allSemifinalsClosed && !tournament.matches.some((candidate) => candidate.round === 'final')) {
    const finalMatch = createMatch(channelId, 'final', 'final', semifinals[0].winner, semifinals[1].winner);
    tournament.matches.push(finalMatch);
    tournament.status = 'final';

    if (!channel) {
      lines.push('Final match is ready, but I could not post it in this channel.');
      return lines.join('\n');
    }

    await postMatchPoll(channel, finalMatch);
    lines.push('Final match poll posted with match_id **final**.');
  }

  return lines.join('\n');
}

module.exports = {
  cancelTournament,
  closeMatch,
  collectImageAttachment,
  createTournament,
  getTournamentStatus,
  handleVoteButton,
  startTournament,
  tiebreakMatch,
};

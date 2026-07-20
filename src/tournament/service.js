const { activeTournaments } = require('./store');

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

  return `Tournament status: ${tournament.status}. Entries collected: ${tournament.entries.length}.`;
}

function cancelTournament(channelId) {
  if (!activeTournaments.has(channelId)) {
    return 'No active tournament in this channel.';
  }

  activeTournaments.delete(channelId);
  return 'Tournament cancelled.';
}

function startTournament(channelId) {
  const tournament = activeTournaments.get(channelId);

  if (!tournament) {
    return 'No active tournament in this channel.';
  }

  if (tournament.entries.length < 2) {
    return 'At least two image entries are required to start a tournament.';
  }

  tournament.status = 'started';
  return 'Tournament start placeholder: bracket generation will be implemented next.';
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
    tournament.entries.push({
      attachmentId: attachment.id,
      url: attachment.url,
      userId: message.author.id,
      messageId: message.id,
    });
  }
}

module.exports = {
  cancelTournament,
  collectImageAttachment,
  createTournament,
  getTournamentStatus,
  startTournament,
};

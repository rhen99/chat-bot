require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const messageCreate = require('./events/messageCreate');
const { handleVoteButton } = require('./tournament/service');

const { DISCORD_TOKEN } = process.env;

if (!DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN in environment.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));

  if (command.data?.name && typeof command.execute === 'function') {
    client.commands.set(command.data.name, command);
  }
}

client.once('ready', (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on('messageCreate', (message) => messageCreate.execute(message));

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        return;
      }

      await command.execute(interaction);
      return;
    }

    if (interaction.isButton()) {
      await handleVoteButton(interaction);
    }
  } catch (error) {
    console.error(error);

    const response = {
      content: 'There was an error while handling this interaction.',
      ephemeral: true,
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(response);
    } else {
      await interaction.reply(response);
    }
  }
});

client.login(DISCORD_TOKEN);

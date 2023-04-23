import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import config from './config.json' assert { type: 'json' };

const { clientId, guildId, token } = config;

const commands = [{
  name: 'ctf',
  description: 'Fetch CTF events',
  options: [
    {
      name: 'start',
      type: 3,
      description: 'Start date for events (format: DD-MM-YYYY)',
      required: true,
    },
    {
      name: 'end',
      type: 3,
      description: 'End date for events (format: DD-MM-YYYY)',
      required: true,
    },
    {
      name: 'on_site',
      type: 5,
      description: 'Filter events based on on-site presence',
      required: false,
    },
    {
      name: 'description',
      type: 5,
      description: 'Display event descriptions',
      required: false,
    },
  ],
}];

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

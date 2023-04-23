import { Client, Intents, MessageEmbed } from 'discord.js';
import fetch from 'node-fetch';
import schedule from 'node-schedule';
import config from './config.json' assert { type: 'json' };

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

async function fetchCTFInfo(start, end) {
  const response = await fetch(`https://ctftime.org/api/v1/events/?limit=100&start=${start}&finish=${end}`); // https://ctftime.org/api/v1/events/?limit=100&start=1682200800&finish=1682805600
  const data = await response.json();
  return data;
}

function parseDate(dateString) {
  const [day, month, year] = dateString.split('-');
  return new Date(year, month - 1, day);
}

async function sendReply(interaction, content) {
  const maxLength = 2000;
  if (content.length <= maxLength) {
    await interaction.reply(content);
  } else {
    const contentParts = content.match(new RegExp(`.{1,${maxLength}}`, 'g'));
    await interaction.reply(contentParts[0]);
    for (let i = 1; i < contentParts.length; i++) {
      await interaction.channel.send(contentParts[i]);
    }
  }
}

client.once('ready', () => {
  console.log('Bot is ready!');

  // Ajout d'un rappel quotidien des CTF
  const channelId = config.channelId;
  const dailyReminder = schedule.scheduleJob('0 9 * * *', async () => {
    try {
      const now = new Date();
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 1000);
      const start = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
      const end = `${oneWeekFromNow.getDate()}-${oneWeekFromNow.getMonth() + 1}-${oneWeekFromNow.getFullYear()}`;

      const startDate = parseDate(start);
      const endDate = parseDate(end);

      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      const endTimestamp = Math.floor(endDate.getTime() / 1000);


      const ctfs = await fetchCTFInfo(startTimestamp, endTimestamp);

      let ctfList = '';

      for (const ctf of ctfs) {
        ctfList += `**${ctf.title}**\n`;
        ctfList += `Start: ${ctf.start.slice(0, 10)}\n`;
        ctfList += `Finish: ${ctf.finish.slice(0, 10)}\n`;
        ctfList += `URL: ${ctf.url}\n`;
        ctfList += `CTFtime URL: ${ctf.ctftime_url}\n`;
        ctfList += '\n';
      }

      if (!ctfList) {
        ctfList = 'Aucun CTF trouvé pour la période sélectionnée et les critères spécifiés.';
      }

      const channel = client.channels.cache.get(channelId);
      channel.send(ctfList);
    } catch (error) {
      console.error('Erreur lors de l\'exécution du rappel quotidien des CTF:', error);
    }
  });
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ctf') {
    try {
      let start = interaction.options.getString('start');
      let end = interaction.options.getString('end');
      const onsite = interaction.options.getBoolean('on_site');
      const description = interaction.options.getBoolean('description');

      if (!start || !end) {
        const now = new Date();
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        start = start || `${now.getUTCDate()}-${now.getUTCMonth() + 1}-${now.getUTCFullYear()}`;
        end = end || `${oneWeekFromNow.getUTCDate()}-${oneWeekFromNow.getUTCMonth() + 1}-${oneWeekFromNow.getUTCFullYear()}`;
      }

      const startDate = parseDate(start);
      const endDate = parseDate(end);

      if (!startDate || !endDate) {
        return await interaction.reply('Les dates de début et de fin doivent être fournies au format JJ-MM-AAAA.');
      }

      const startTimestamp = Math.floor((startDate.getTime() - startDate.getTimezoneOffset() * 60 * 1000) / 1000);
      const endTimestamp = Math.floor((endDate.getTime() - endDate.getTimezoneOffset() * 60 * 1000) / 1000);

      const ctfs = await fetchCTFInfo(startTimestamp, endTimestamp);

      let count = 0;
      for (const ctf of ctfs) {
        if (count >= 15) break; // Limite le nombre de CTF à 25
        if (onsite === null || onsite === ctf.onsite) {
          const embed = new MessageEmbed() 
            .setTitle(ctf.title ? ctf.title : 'Titre non disponible')
            .setURL(ctf.ctftime_url ? ctf.ctftime_url : 'https://ctftime.org/')
            .setColor('#0099ff');
          
  
          embed.addFields(
            {name: 'CTF Start', value: ctf.start.slice(0, 10), inline: true},
            {name: 'CTF Finish', value: ctf.finish.slice(0, 10), inline: true},
            {name: 'CTF URL', value: ctf.url, inline: false},
          );
          if (description && ctf.description) {
            embed.setDescription(ctf.description);
          }
  
          try{
            await interaction.channel.send({ embeds: [embed] });
            await new Promise(resolve => setTimeout(resolve, 200)); // pause de 1 seconde
            count++;
          } catch (error) {
            console.error('Erreur lors de l\'envoi du message:', error);
          }
        }
      }
  
      if (ctfs.length === 0) {
        await interaction.reply('Aucun CTF trouvé pour la période sélectionnée et les critères spécifiés.');
      } 
    } catch (error) {
      console.error('Erreur lors de l\'exécution de la commande ctf:', error);
    }
  }
});

client.login(config.token);


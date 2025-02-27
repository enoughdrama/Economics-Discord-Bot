const { REST, Routes } = require('discord.js');
const path = require('path')
const fs = require('fs')

const { applicationId, token } = require('./settings.json');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(token);

async function updateCommands() {
  try {
    await rest.put(Routes.applicationCommands(applicationId), { body: commands });

    console.log('[commandsUpdater -> Successfully reloaded application (/) commands]');
  } catch (error) {
    console.error(error);
  }
}

updateCommands()

module.export = rest;

const fs = require('fs');
const { Client, Collection, GatewayIntentBits, BitField } = require('discord.js');
const { token, restrictRoleId } = require('./settings.json');
const { PermissionsBitField } = require('discord.js');
const { AuditLogEvent } = require('discord-api-types/v10');
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

// Update Commands
require('./commandsUpdater.js');

const userController = require('./controller/user.controller.js')

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

const voiceStates = {};

client.on('voiceStateUpdate', async (oldState, newState) => {
    // Generate a unique key for the user-guild combination
    const userGuildKey = `${newState.id}-${newState.guild.id}`;

    // When a user joins a voice channel
    if (!oldState.channelId && newState.channelId) {
        // Record the join time
        voiceStates[userGuildKey] = { joinTime: Date.now() };
    }
    // When a user leaves a voice channel or switches to another voice channel
    else if (oldState.channelId && (newState.channelId !== oldState.channelId)) {
        // Calculate voice chat duration
        if (voiceStates[userGuildKey]) {
            const duration = Date.now() - voiceStates[userGuildKey].joinTime;
            const durationInSeconds = Math.round(duration / 1000);

            console.log(`User ${newState.id} spent ${duration} milliseconds in voice chat.`);

            await userController.updateUserVoiceTime(newState.id, durationInSeconds);

            if (newState.channelId) {
                voiceStates[userGuildKey] = { joinTime: Date.now() };
            } else {
                delete voiceStates[userGuildKey];
            }
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {

        const command = client.commands.get(interaction.commandName);

        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ There was an error while executing this command!', ephemeral: true });
        }
    }         else if (interaction.isSelectMenu()) {
        if (interaction.customId === 'select-role') {
            // Prompt user for their information using a modal
            const modal = new ModalBuilder()
                .setCustomId('submit-summary')
                .setTitle('📝 Отправьте Вашу Информацию');

            // Create text input components for each piece of information
            const nameInput = new TextInputBuilder()
                .setCustomId('name')
                .setLabel("👤 Имя")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Ваше имя...")
                .setRequired(true);

            const ideaInput = new TextInputBuilder()
                .setCustomId('idea')
                .setLabel("💡 Идея")
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder("Ваша идея...")
                .setRequired(true);

            const timezoneOrAgeInput = new TextInputBuilder()
                .setCustomId('timezoneOrAge')
                .setLabel("🕰 Часовой пояс / Возраст")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Ваш часовой пояс или возраст...")
                .setRequired(true);

            const additionalInfoInput = new TextInputBuilder()
                .setCustomId('additionalInfo')
                .setLabel("➕ Дополнительно")
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder("Любая дополнительная информация...")
                .setRequired(false); // Making this field optional

            // Add components to modal
            modal.addComponents(
                new ActionRowBuilder().addComponents(nameInput),
                new ActionRowBuilder().addComponents(ideaInput),
                new ActionRowBuilder().addComponents(timezoneOrAgeInput),
                new ActionRowBuilder().addComponents(additionalInfoInput)
            );

            // Show the modal to the user
            await interaction.showModal(modal);
        }
    }
    // Handling modal submit interactions for the information submission
    else if (interaction.isModalSubmit()) {
        if (interaction.customId === 'submit-summary') {
            // Collecting each field value
            const name = interaction.fields.getTextInputValue('name');
            const idea = interaction.fields.getTextInputValue('idea');
            const timezoneOrAge = interaction.fields.getTextInputValue('timezoneOrAge');
            const additionalInfo = interaction.fields.getTextInputValue('additionalInfo');

            // Process the collected information here
            console.log(`Received information:
              Name: ${name},
              Idea: ${idea},
              Timezone/Age: ${timezoneOrAge},
              Additional Information: ${additionalInfo}`);

            // Respond to the user
            await interaction.reply({ content: 'Спасибо за вашу заявку! 🌟', ephemeral: true });

            const staffChannel = client.channels.cache.get('1223997430777778196');
            await staffChannel.send(`🆕 Новая заявка от ${name}: ${idea}, ${timezoneOrAge}, etc.`);
        }
    }
});

client.on('guildMemberAdd', async (member) => {
    const userInfo = await userController.findOneUser('person', member.id);
    const restrictedRoleId = restrictRoleId; // ID of the restricted role

    if (userInfo && userInfo.eligibility === false) { // Assuming eligibility is stored as a boolean
        try {
            await member.roles.add(restrictedRoleId);
            console.log(`Reapplied restricted role to ${member.user.username}`);
        } catch (error) {
            console.error(`Failed to reapply restricted role to ${member.user.username}:`, error);
        }
    }
});

client.once('ready', () => {
    console.log('[bot.js -> discord bot has been started]');
});

client.login(token);
module.exports = client

const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs'); // Node.js file system module for reading the JSON file

const userController = require('../controller/user.controller');

// Assuming settings.json is in the same directory as this script.
const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf-8'));
const adminLoggingChannelId = settings.adminLogging;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kicks a user.')
        .addUserOption(option => option.setName('target').setDescription('The user to kick').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for the kick').setRequired(false)), // Added option for kick reason

    async execute(interaction) {
        const user = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided'; // Default reason
        const member = await interaction.guild.members.fetch(user.id);

        const userId = interaction.user.id;
        const actionObject = await userController.findOneUser('admins', userId);

        if (!actionObject) {
            return await interaction.reply({ content: `❌ You don't have access to the command.`, ephemeral: true });
        }

        if (!actionObject || actionObject.kick_count <= 0) return interaction.reply({ content: '❌ Daily kick limit has been reached!', ephemeral: true });
        if (!member) return interaction.reply({ content: '❌ User not found in this guild.', ephemeral: true });
        if (!member.bannable) return interaction.reply({ content: '❌ The bot couldn\'t kick this user', ephemeral: true });

        member.kick(reason)
        .then(async() => {
            const result = await userController.updateUserParam(userId, 'kick_count', actionObject.kick_count - 1, 'admins');
            if (result) {
                await interaction.reply({ content: `💞 ${user.username} has been kicked. Reason: ${reason}`, ephemeral: true });

                // Sending a log message to the adminLogging channel
                const logChannel = await interaction.guild.channels.fetch(adminLoggingChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('User Kicked')
                        .setDescription(`${user.username} has been kicked.`)
                        .setColor('#ff0000')
                        .addFields(
                            { name: 'Kicked User', value: user.username, inline: true },
                            { name: 'Kicked By', value: interaction.user.username, inline: true },
                            { name: 'Reason', value: reason, inline: false }
                        )
                        
                    logChannel.send({ embeds: [logEmbed] });
                }
            }
        })
        .catch(error => {
            console.error(error);
            interaction.reply({ content: '❌ An error occurred while trying to kick the user.', ephemeral: true });
        });
    }
};

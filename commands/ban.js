const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

const userController = require('../controller/user.controller');

const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf-8'));
const adminLoggingChannelId = settings.adminLogging;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Забанить человека')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(false)), // Optional reason for the ban

    async execute(interaction) {
        const user = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided'; // Default reason if none provided
        const member = await interaction.guild.members.fetch(user.id);

        const userId = interaction.user.id;
        const actionObject = await userController.findOneUser('admins', userId);

        if (!actionObject) {
            return interaction.reply({ content: `❌ You don't have access to the command.`, ephemeral: true });
        }

        if (actionObject.ban_count <= 0) {
            return interaction.reply({ content: '❌ Daily ban limit has been reached!', ephemeral: true });
        }

        if (!member) {
            return interaction.reply({ content: '❌ User not found in this guild.', ephemeral: true });
        }

        if (!member.bannable) {
            return interaction.reply({ content: '❌ The bot couldn\'t ban this user.', ephemeral: true });
        }

        member.ban({ reason })
            .then(async () => {
                const result = await userController.updateUserParam(userId, 'ban_count', actionObject.ban_count - 1, 'admins');
                if (result) {
                    interaction.reply({ content: `💞 ${user.username} has been banned. Reason: ${reason}`, ephemeral: true });

                    // Log the ban action to a specific channel
                    const logChannelId = adminLoggingChannelId; // Replace with your log channel ID
                    const logChannel = await interaction.guild.channels.fetch(logChannelId);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor(16711680) // Using decimal value for red color
                            .setTitle('Пользователь заблокирован')
                            .addFields(
                                { name: 'Блокирован:', value: user.tag, inline: true },
                                { name: 'Кем:', value: interaction.user.tag, inline: true },
                                { name: 'Причина:', value: reason, inline: false }
                            );
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }
            })
            .catch(error => {
                console.error(error);
                interaction.reply({ content: '❌ An error occurred while trying to ban the user.', ephemeral: true });
            });
    }
};

const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');

const userController = require('../controller/user.controller');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mutes a user for a specified duration.')
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The user to mute')
            .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('duration')
            .setDescription('Duration of the mute in minutes')
            .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
            .setDescription('Reason for muting the user')
            .setRequired(false)
        ),

    async execute(interaction) {
        const user = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const duration = interaction.options.getInteger('duration');
        const member = await interaction.guild.members.fetch(user.id);

        const userId = interaction.user.id;
        const actionObject = await userController.findOneUser('admins', userId);

        if (!actionObject) {
            return await interaction.reply({ content: `❌ You don't have access to the command.`, ephemeral: true });
        }

        if (!actionObject || actionObject.mute_count <= 0) return interaction.reply({ content: '❌ Daily mute limit has been reached!', ephemeral: true });
        if (!member) return interaction.reply({ content: '❌ User not found in this guild.', ephemeral: true });
        if (duration <= 0) return interaction.reply({ content: '❌ Please enter a valid duration.', ephemeral: true });

        const mutedRoleId = '1220742375396085800';
        const mutedRole = interaction.guild.roles.cache.find(role => role.id === mutedRoleId);

        if (!mutedRole) return interaction.reply({ content: '❌ Muted role not found.', ephemeral: true });

        member.roles.add(mutedRole)
        .then(async () => {
            const result = await userController.updateUserParam(userId, 'mute_count', actionObject.mute_count - 1, 'admins');
            if (result) {
                await interaction.reply({ content: `🔇 ${user.username} has been muted for ${duration} minute(s). Reason: ${reason}`, ephemeral: true });
                
                setTimeout(async () => {
                    if (member.roles.cache.has(mutedRoleId)) {
                        await member.roles.remove(mutedRoleId);
                        console.log(`${user.username} has been unmuted.`);
                    }
                }, duration * 60000);
            }
        })
        .catch(error => {
            console.error(error);
            interaction.reply({ content: '❌ An error occurred while trying to mute the user.', ephemeral: true });
        });
    }
};

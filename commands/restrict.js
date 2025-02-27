const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const userController = require('../controller/user.controller');

const { adminLogging, restrictRoleId } = require('../settings.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('restrict')
        .setDescription('Restricts a user and updates their eligibility in the database.')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to restrict')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for restricting the user')
                .setRequired(true)),
        
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            return;
        }

        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        const member = await interaction.guild.members.fetch(targetUser.id);
        const restrictedRoleId = restrictRoleId;
        const loggingChannel = interaction.guild.channels.cache.get(adminLogging);

        try {
            await userController.updateUserParam(targetUser.id, 'eligibility', false, 'person');

            await member.roles.add(restrictedRoleId);

            await interaction.reply({ content: `🚫 ${targetUser.username} has been restricted. Reason: ${reason}`, ephemeral: true });

            // Logging
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('User Restricted')
                .setDescription(`User **${member.user.username}** has been restricted by **${interaction.user.username}**.`)
                .addFields(
                    { name: 'User ID', value: member.user.id },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();

            loggingChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('An error occurred during the restriction process:', error);
            interaction.reply({ content: '❌ An error occurred while trying to restrict the user.', ephemeral: true });
        }
    }
};

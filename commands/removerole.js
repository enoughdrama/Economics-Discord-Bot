const { SlashCommandBuilder } = require('@discordjs/builders');
const userController = require('../controller/user.controller');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removerole')
        .setDescription('Removes an existing role menu item.')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('The ID of the role menu item to remove')
                .setRequired(true)),
    async execute(interaction) {
        const id = interaction.options.getInteger('id');

        try {
            const success = await userController.deleteRoleMenuItem(id);
            if (success) {
                await interaction.reply({ content: `Role menu item with ID ${id} removed successfully!`, ephemeral: true });
            } else {
                await interaction.reply({ content: `No role menu item found with ID ${id}.`, ephemeral: true });
            }
        } catch (error) {
            console.error('Failed to remove role menu item:', error);
            await interaction.reply({ content: 'Failed to remove role menu item.', ephemeral: true });
        }
    },
};

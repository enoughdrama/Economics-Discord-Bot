const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const userController = require('../controller/user.controller');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checklimits')
        .setDescription('Проверяет текущие ограничения и роль пользователя.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь, для которого проверяются ограничения')
                .setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const discordId = targetUser.id;

        // Fetch user data
        const user = await userController.findOneUser('person', discordId);
        if (!user) {
            return await interaction.reply({ content: `❌ Пользователь не найден.`, ephemeral: true });
        }

        const userAdminObject = await userController.findOneUser('admins', discordId);
        if (!user) {
            return await interaction.reply({ content: `❌ Пользователь не является модератором.`, ephemeral: true });
        }

        // Since userController doesn't explicitly handle mute_count, kick_count, ban_count fetching,
        // assuming they are part of the user object.
        // If they aren't, you'd need to adjust your query or method to include them.
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Ограничения пользователя ${user.username}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: 'Роль', value: user.role, inline: true },
                { name: 'Количество мутов', value: String(userAdminObject.mute_count), inline: true },
                { name: 'Количество киков', value: String(userAdminObject.kick_count), inline: true },
                { name: 'Количество банов', value: String(userAdminObject.ban_count), inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Проверка статуса пользователя' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};

const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const userController = require('../controller/user.controller');

function formatVoiceTime(voiceTimeInSeconds) {
    const hours = Math.floor(voiceTimeInSeconds / 3600);
    const minutes = Math.floor((voiceTimeInSeconds % 3600) / 60);
    const seconds = voiceTimeInSeconds % 60;
    return `${hours} часов, ${minutes} минут и ${seconds} секунд`;
}

async function getMarriageInfo(userId) {
    const partnerId = await userController.getMarriageStatus(userId);
    if (!partnerId) return 'Не в браке 💔';
    const partnerUsername = await userController.getUsernameById(partnerId);
    return `В браке с ${partnerUsername} 💍`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription("Показывает профиль пользователя с балансом и временем в голосовых чатах")
        .addUserOption(option => 
            option.setName('target')
                .setDescription('Пользователь, чей профиль вы хотите посмотреть')
                .setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('target') || interaction.user;
        const userId = target.id;
        
        let user = await userController.findOneUser('person', userId);
        if (!user) {
            if (target.id !== interaction.user.id) {
                return interaction.reply({ content: 'Пользователь не найден в базе данных.', ephemeral: true });
            }
            user = await userController.createUser(0, false, "member", userId, Date.now(), 0);
        }
        
        user = await userController.findOneUser('person', userId);
        const voiceTimeFormatted = formatVoiceTime(user.voice_time);
        const marriageInfo = await getMarriageInfo(userId);
        
        const embed = new EmbedBuilder()
            .setColor(39423)
            .setTitle(`👤 Профиль пользователя ${target.username}`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Баланс', value: `${user.balance} 🪙`, inline: true },
                { name: 'Время в голосовых чатах', value: voiceTimeFormatted, inline: true },
                { name: 'Семейное положение', value: marriageInfo, inline: false }
            )
            .setFooter({ text: 'Используйте /shop для просмотра доступных товаров и услуг.' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};

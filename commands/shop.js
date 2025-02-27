const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const userController = require('../controller/user.controller');

const isTimePassed = function (minutes, timestamp) {
    const conversion = minutes * 60 * 1000;
    const currentTime = Date.now();
    return (currentTime - timestamp) >= conversion;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription("Серверный магазин"),

    async execute(interaction) {
        const userId = interaction.user.id;
        let user = await userController.findOneUser('person', userId);

        if (user && user.last_shop_use) {
            if (isTimePassed(720, user.last_shop_use)) {
                await userController.updateUserBalance(userId, user.balance + 50);
            }
        } else {
            await userController.createUser(0, false, "member", userId);
        }
        user = await userController.findOneUser('person', userId);

        const timeElapsed = Date.now() - user.last_shop_use;
        const timeUntilNextReward = 720 * 60 * 1000 - timeElapsed;

        const minutesRemaining = Math.floor(timeUntilNextReward / (60 * 1000));
        const secondsRemaining = Math.floor((timeUntilNextReward % (60 * 1000)) / 1000);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle("🛒 Магазин zxcursed")
            .setDescription(`Ваш Баланс - ${user.balance} 🪙`)
            .addFields(
                { name: 'Список товаров', value: '✏️ Создать собственную руму - 20000 🪙\n✨ Создать собственную рольку - 10000 🪙' },
                { name: 'До следующей награды', value: `${minutesRemaining} минут и ${secondsRemaining} секунд`, inline: true }
            )

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};

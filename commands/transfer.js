const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');

const userController = require('../controller/user.controller')

const isTimePassed = function (minutes, timestamp) {
    const conversion = minutes * 60 * 1000;
    const currentTime = Date.now();

    return (currentTime - timestamp) >= conversion;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transfer')
        .setDescription("Перевести средства другому пользователю")
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь, для которого осуществляется перевод')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Сумма перевода')
                .setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const transferAmount = interaction.options.getInteger('amount');

        const discordId = targetUser.id;
        const userId = interaction.user.id;

        const user = await userController.findOneUser('person', userId);
        const receiver = await userController.findOneUser('person', discordId);

        if (!user) {
            return await interaction.reply({ content: `❌ Ваш магазин не активирован, пожалуйста, используйте /shop`, ephemeral: true });
        } else if (!receiver) {
            return await interaction.reply({ content: `❌ Получатель не активировал магазин, попросите его использовать /shop`, ephemeral: true });
        }

        if (user.balance - transferAmount < 0) {
            return await interaction.reply({ content: `❌ У вас недостаточно средств.`, ephemeral: true });
        }

        const updateSender = await userController.updateUserParam(userId, 'balance', user.balance - transferAmount, 'person');
        const updateReceiver = await userController.updateUserParam(discordId, 'balance', receiver.balance + transferAmount, 'person');

        if (updateSender && updateReceiver) {
            await interaction.reply({ content: `💵 Средства [${transferAmount}] были переведены пользователю ${targetUser.username}`, ephemeral: true });

            try {
                await targetUser.send(`🎉 Вы получили [${transferAmount}] средств от ${interaction.user.username}.`);
            } catch (error) {
                console.warn(`Не удалось отправить личное сообщение пользователю ${targetUser.username}. Возможно, у него отключены личные сообщения.`);
                await interaction.followUp({ content: `⚠️ Не удалось отправить личное сообщение пользователю ${targetUser.username}. Возможно, у него отключены личные сообщения.`, ephemeral: true });
            }
        } else {
            await interaction.reply({ content: `❌ Произошла ошибка при переводе средств. Пожалуйста, попробуйте еще раз.`, ephemeral: true });
        }
    }
};

const { SlashCommandBuilder, ActionRowBuilder, SelectMenuBuilder, EmbedBuilder } = require('discord.js');
const userController = require('../controller/user.controller');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('top')
        .setDescription('Показывает топ пользователей по деньгам или времени в голосовом чате'),
    
    async execute(interaction) {
        const row = new ActionRowBuilder()
            .addComponents(
                new SelectMenuBuilder()
                    .setCustomId('select_top_type')
                    .setPlaceholder('Выберите тип топа...')
                    .addOptions([
                        {
                            label: 'По Деньгам 💰',
                            description: 'Показать топ пользователей по деньгам',
                            value: 'by_money',
                        },
                        {
                            label: 'По Времени в Войсе 🕒',
                            description: 'Показать топ пользователей по времени в голосовом чате',
                            value: 'by_voice_time',
                        },
                    ]),
            );

        await interaction.reply({ content: 'Выберите тип топа:', components: [row], ephemeral: true });

        const filter = (i) => i.customId === 'select_top_type' && i.user.id === interaction.user.id;
        
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async (i) => {
            await i.deferUpdate(); // Acknowledge the interaction.

            const topUsers = i.values[0] === 'by_money' ? await userController.getTopByMoney() : await userController.getTopByVoiceTime();
            const embed = new EmbedBuilder()
                .setTitle(`Топ Пользователей ${i.values[0] === 'by_money' ? 'По Деньгам 💰' : 'По Времени в Войсе 🕒'}`)
                .setColor('#0099ff');

            const formattedUserList = await Promise.all(topUsers.map(async (user, index) => {
                const value = i.values[0] === 'by_money' ? user.balance : user.voice_time;
                try {
                    const userObject = await interaction.guild.members.fetch(user.discord_id);
                    const username = userObject ? userObject.user.username : 'Неизвестный';
                    return `${index + 1}. ${username}: ${value}`;
                } catch (error) {
                    console.error(`Failed to fetch user ${user.discord_id}:`, error);
                    return `${index + 1}. Неизвестный: ${value}`;
                }
            }));

            embed.setDescription(formattedUserList.join("\n") || "Нет данных.");

            // Update the original reply to include the embed and disable the select menu
            const disabledRow = new ActionRowBuilder()
                .addComponents(
                    new SelectMenuBuilder()
                        .setCustomId('select_top_type_disabled')
                        .setPlaceholder('Выберите тип топа...')
                        .setDisabled(true)
                        .addOptions([
                            {
                                label: 'По Деньгам 💰',
                                description: 'Показать топ пользователей по деньгам',
                                value: 'by_money',
                            },
                            {
                                label: 'По Времени в Войсе 🕒',
                                description: 'Показать топ пользователей по времени в голосовом чате',
                                value: 'by_voice_time',
                            },
                        ]),
                );

            await i.editReply({ content: 'Ваш выбор:', embeds: [embed], components: [] });
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.followUp({ content: 'Выбор не был сделан.', ephemeral: true });
            }
        });
    },
};

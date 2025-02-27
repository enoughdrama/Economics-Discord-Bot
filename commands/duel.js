const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const userController = require('../controller/user.controller');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('duel')
        .setDescription('Вызвать человека на дуэль.')
        .addUserOption(option =>
            option.setName('opponent')
                .setDescription('Пользователь, которого вы хотите вызвать на дуэль')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Количество денег для ставки')
                .setRequired(true)),

    async execute(interaction) {
        const challenger = interaction.user;
        const opponent = interaction.options.getUser('opponent');
        const amount = interaction.options.getInteger('amount');

        if (challenger.id === opponent.id) {
            await interaction.reply({ content: 'Вы не можете вызвать на дуэль сами себя!', ephemeral: true });
            return;
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('accept')
                    .setLabel('Принять')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('decline')
                    .setLabel('Отказаться')
                    .setStyle(ButtonStyle.Danger)
            );

        const message = await interaction.reply({
            content: `${opponent}, вы были вызваны на дуэль пользователем ${challenger.username} на сумму ${amount} <:redanPAUK:> ! Принимаете вызов?`,
            components: [row],
            fetchReply: true,
        });

        const filter = (i) => ['accept', 'decline'].includes(i.customId) && i.user.id === opponent.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, max: 1, time: 15000 });

        collector.on('collect', async (i) => {
            if (i.customId === 'accept') {
                // Update the interaction to show duel acceptance and GIF
                const duelStartEmbed = new EmbedBuilder().setImage('https://media1.tenor.com/m/YXPUDmXMC1UAAAAC/hiroomi-nase-kyoukai-no-kanata.gif').setTitle('Дуэль начинается!');
                await i.update({
                    content: `Идет сражение...`,
                    components: [],
                    embeds: [duelStartEmbed]
                });
        
                // Wait 5 seconds before showing the duel result
                setTimeout(async () => {
                    // Placeholder for actual duel logic to determine the winner
                    const winner = Math.random() < 0.5 ? challenger : opponent;
        
                    // Update the duel initiation message to announce the winner
                    const duelResultEmbed = new EmbedBuilder()
                        .setTitle(`Дуэль завершена!`)
                        .setDescription(`**${challenger.username} VS ${opponent.username}**\n${winner.username} побеждает в дуэли и забирает ${amount * 2} монет!`)
                        .setColor(winner.id === challenger.id ? '#00ff00' : '#ff0000');
        
                    await interaction.editReply({
                        content: `Дуэль между ${challenger.username} и ${opponent.username} закончилась!`,
                        components: [],
                        embeds: [duelResultEmbed]
                    });
                }, 5000);
            } else {
                await i.update({ content: `${opponent.username} отказался от дуэли.`, components: [] });
            }
        });
        
        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.editReply({ content: 'Время на ответ истекло, дуэль отменена.', components: [] });
            }
        });
        
    },
};

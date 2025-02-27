const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const userController = require('../controller/user.controller');

const MARRIAGE_COST = 1000;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('marry')
        .setDescription('Предложить пользователю пожениться на вас.')
        .addUserOption(option =>
            option.setName('partner')
                .setDescription('Пользователь, которому вы хотите сделать предложение')
                .setRequired(true)),

    async execute(interaction) {
        const proposer = interaction.user;
        const partner = interaction.options.getUser('partner');

        if (proposer.id === partner.id) {
            await interaction.reply({ content: 'Вы не можете предложить пожениться самому себе!', ephemeral: true });
            return;
        }

        let proposerData = await userController.findOneUser('person', proposer.id);
        if (proposerData.balance < MARRIAGE_COST) {
            await interaction.reply({ content: 'Недостаточно средств для предложения!', ephemeral: true });
            return;
        }
        await userController.updateUserBalance(proposer.id, proposerData.balance - MARRIAGE_COST);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('accept_marriage')
                    .setLabel('Принять')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('decline_marriage')
                    .setLabel('Отказаться')
                    .setStyle(ButtonStyle.Danger)
            );

        const message = await interaction.reply({
            content: `${partner}, ${proposer.username} делает вам предложение пожениться на нем! Стоимость предложения: ${MARRIAGE_COST} монет. Принимаете ли вы?`,
            components: [row],
            fetchReply: true,
        });

        const filter = (i) => ['accept_marriage', 'decline_marriage'].includes(i.customId) && i.user.id === partner.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, max: 1, time: 60000 });

        collector.on('collect', async (i) => {
            if (i.customId === 'accept_marriage') {
                await userController.updateUserParam(partner.id, 'username', partner.username, 'person')
                await userController.updateUserParam(proposer.id, 'username', proposer.username, 'person')

                await i.update({
                    content: `${partner.username} принял(а) ваше предложение! Ожидайте момента...`,
                    components: [],
                });

                setTimeout(async () => {
                    const animationEmbed = new EmbedBuilder()
                        .setColor('#60b0f4')
                        .setTitle('💍 Свадебная церемония начинается!')
                        .setImage('https://media1.tenor.com/m/X5Cfbkw3szkAAAAC/anime-marriage.gif');

                    await interaction.editReply({ embeds: [animationEmbed] });

                    setTimeout(async () => {
                        const finalEmbed = new EmbedBuilder()
                            .setColor('#60b0f4')
                            .setTitle('💒 Свадьба завершена!')
                            .setDescription(`${proposer.username} и ${partner.username} теперь женаты! Поздравляем!`)
                            .setFooter({ text: 'Мы желаем вам долгих и счастливых лет вместе!' });

                        await interaction.editReply({ embeds: [finalEmbed], components: [] });
                        await userController.createOrUpdateMarriageStatus(proposer.id, partner.id);
                    }, 5000);
                }, 500);
            } else {
                await i.update({ content: `${partner.username} отказался(ась) от предложения.`, components: [] });
            }
        });

    },
};

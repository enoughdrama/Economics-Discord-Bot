const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, GatewayIntentBits } = require('discord.js');

let participants = [];
let captains = [];
let teams = { team1: [], team2: [] };

const randomEmoji = require('random-emoji');

async function createTeamVoiceChannels(guild, team1, team2) {
    const eventCategory = await guild.channels.create({
        name: "Эвент 📢 | Временная категория",
        type: ChannelType.GuildCategory,
    });

    await createVoiceChannelForTeam(guild, team1, "Команда 1", eventCategory.id);
    await createVoiceChannelForTeam(guild, team2, "Команда 2", eventCategory.id);
}

async function createVoiceChannelForTeam(guild, teamMembers, channelName, categoryId) {
    const voiceChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: categoryId,
        permissionOverwrites: [
            {
                id: guild.id,
                deny: [PermissionFlagsBits.Connect],
            },
            ...teamMembers.map(memberId => ({
                id: memberId,
                allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
            })),
        ],
    });

    console.log(`Created voice channel for ${channelName}`);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('makeevent')
        .setDescription('Создает событие и объявляет его в указанном канале. 📣')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('type')
                .setDescription('The type of event')
                .setRequired(true)
                .addChoices(
                    { name: 'Матч 🎮', value: 'match' },
                    { name: 'Кино 🎬', value: 'cinema' }
                ))
        .addStringOption(option =>
            option.setName('description')
            .setDescription('Описание события')
            .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
            .setDescription('Канал для объявления события')
            .setRequired(true)
                .addChannelTypes(ChannelType.GuildText))
        .addIntegerOption(option =>
            option.setName('slots')
            .setDescription('Количество слотов для события (-1 для неограниченного)')
            .setRequired(true))
        .addStringOption(option =>
            option.setName('image_url')
            .setDescription('URL изображения для события')
            .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });
        const eventType = interaction.options.getString('type');
        const eventDescription = interaction.options.getString('description');
        const imageUrl = interaction.options.getString('image_url');
        const slots = interaction.options.getInteger('slots');
        const targetChannel = interaction.options.getChannel('channel'); 

        const client = require('../bot')

        participants = [];
        captains = [];
        teams = { team1: [], team2: [] };

        let embed = new EmbedBuilder()
            .setTitle(eventType === 'match' ? '🎮 Матч 🎮' : '🎬 Кино 🎬')
            .setDescription(`${eventDescription}\n\nСлоты: ${slots === -1 ? 'Без ограничений' : slots}`);

        if (imageUrl) embed.setImage(imageUrl);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('join_event')
                    .setLabel('Присоединиться ✅')
                    .setStyle(ButtonStyle.Success),
            );

        const message = await targetChannel.send({ embeds: [embed], components: [row] });

        const filter = (i) => i.customId === 'join_event';
        const collector = message.createMessageComponentCollector({ filter, time: 60000 * 22200 })

        collector.on('collect', async (i) => {
            if (!participants.includes(i.user.id)) {
                participants.push(i.user.id);
                await i.reply({ content: `${i.user.username} присоединился к событию! 🎉`, ephemeral: false });
                if (participants.length === slots || slots === -1) {
                    collector.stop('Slots filled');
                }
            } else {
                await i.reply({ content: 'Вы уже присоединились к событию. 🚫', ephemeral: true });
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'Slots filled' && participants.length >= 2) {
                captains = participants.sort(() => 0.5 - Math.random()).slice(0, 2);
                teams.team1.push(captains[0]);
                teams.team2.push(captains[1]);

                participants = participants.filter((id) => !captains.includes(id));

                const captainNames = await Promise.all(captains.map(async (id) => {
                    const user = await client.users.fetch(id);
                    return user.username;
                }));

                await targetChannel.send(`Капитаны выбраны: ${captainNames.join(' и ')}. Теперь они будут выбирать участников своих команд. ⏳`);

                await initiateTeamSelection(targetChannel, client, interaction);
            } else {
                await targetChannel.send('Время для присоединения к событию истекло или недостаточно участников для выбора капитанов. ⌛');
            }
        });
    },
};

function generateSelectionButtons(excludeIds = []) {
    let buttons = new ActionRowBuilder();
    participants.filter(id => !excludeIds.includes(id)).forEach(participantId => {
        buttons.addComponents(
            new ButtonBuilder()
                .setCustomId(`select_${participantId}`)
                .setLabel(`Select`)
                .setStyle(ButtonStyle.Primary),
        );
    });
    return buttons;
}

async function initiateTeamSelection(channel, client, interaction) {
    let turn = 0;

    while (participants.length > 0) {
        const currentCaptainId = captains[turn];
        const currentCaptain = await client.users.fetch(currentCaptainId);

        let messageContent = `${currentCaptain.username}, ваша очередь выбирать члена команды. Пожалуйста, отреагируйте их эмодзи:\n`;

        const buttons = generateSelectionButtons(teams[`team${turn + 1}`].map(member => member.id));
        const selectionMessage = await channel.send({ content: messageContent, components: [buttons] });

        const filter = i => i.user.id === currentCaptainId;
        const collector = selectionMessage.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            const selectedId = i.customId.split('_')[1];
            teams[`team${turn + 1}`].push(selectedId);
            participants = participants.filter(id => id !== selectedId);
            await i.update({ content: `<@${selectedId}> был выбран в Команду ${turn + 1}.`, components: [] });
            collector.stop();
        });

        collector.on('end', async collected => {
            if (collected.size === 0) {
                const randomIndex = Math.floor(Math.random() * participants.length);
                const selectedId = participants[randomIndex];
                teams[`team${turn + 1}`].push(selectedId);
                participants = participants.filter(id => id !== selectedId);
                await channel.send(`<@${selectedId}> был случайно выбран в Команду ${turn + 1} из-за истечения времени.`);
            }

            turn = (turn + 1) % captains.length;

            if (participants.length === 0) {
                finalizeTeams(channel, interaction.guild, teams);
            }
        });
    }
}

async function finalizeTeams(channel, guild, teams) {
    const team1Members = teams.team1.map(id => `<@${id}>`).join(', ');
    const team2Members = teams.team2.map(id => `<@${id}>`).join(', ');
    await channel.send({content: 'Выбор команд завершен!', embeds: [
        new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Участники Команды 1')
            .setDescription(team1Members || 'Участники не выбраны'),
        new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Участники Команды 2')
            .setDescription(team2Members || 'Участники не выбраны')
    ]});

    createTeamVoiceChannels(guild, teams.team1, teams.team2);
}

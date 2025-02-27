const { SlashCommandBuilder } = require('@discordjs/builders');
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder,
    SelectMenuBuilder
} = require('discord.js');
const userController = require('../controller/user.controller');

async function handleRolePurchase(interaction, roleId, parentInteraction) {
    const userId = interaction.user.id;

    const user = await userController.findOneUser('person', userId);
    if (!user) {
        await interaction.reply({ content: '❌ User not found.', ephemeral: true });
        return;
    }

    const roleItem = await userController.getAllRolesMenuItems().then(items => items.find(item => item.role_id === roleId));
    if (!roleItem || user.balance < roleItem.cost) {
        await interaction.reply({ content: '❌ Insufficient funds for purchase.', ephemeral: true });
        return;
    }

    const ownersShare = roleItem.cost * 0.1;
    await userController.updateUserBalance(userId, user.balance - roleItem.cost);

    const guild = interaction.guild;
    const member = await guild.members.fetch(userId);
    
    try {
        await member.roles.add(roleId);
        await interaction.reply({ content: `💫 You have successfully purchased the role: ${roleItem.name}`, ephemeral: true });
    } catch (error) {
        console.error('Failed to assign role:', error);
        await interaction.reply({ content: `❌ Failed to assign the role: ${roleItem.name}. Please contact the admins.`, ephemeral: true });
        return;
    }

    console.log(roleItem)
    
    if (roleItem.owner_id) {
        const owner = await userController.findOneUser('person', roleItem.owner_id);
        await userController.updateUserBalance(roleItem.owner_id, owner.balance + ownersShare); 

        const ownerMember = await guild.members.fetch(roleItem.owner_id);
        const ownerNewBalance = owner.balance + ownersShare;
    
        if (ownerMember && ownerMember.user) {
            const dmChannel = await ownerMember.user.createDM();
            await dmChannel.send({
                content: `🎉 Someone just purchased a role you own! \n\n` +
                         `**Role:** ${roleItem.name}\n` +
                         `**Price:** ${roleItem.cost} 🪙\n` +
                         `**Your Earnings:** ${ownersShare} 🪙\n\n` +
                         `Your new balance is: **${ownerNewBalance}** 🪙`
            }).catch(error => console.error(`Failed to send DM to the role owner: ${error}`));
        }
    }
}

class PaginatedMenu {
    constructor(interaction, items) {
        this.interaction = interaction;
        this.items = items;
        this.itemsPerPage = 5;
        this.totalPages = Math.ceil(items.length / this.itemsPerPage);
        this.currentPage = 1;
        this.imageUrl = 'https://mentalstable.tech//ico.png';
        this.guild = interaction.guild;
    }

    async getPageContent(page) {
        const start = (page - 1) * this.itemsPerPage;
        const pageItems = this.items.slice(start, start + this.itemsPerPage);
        const member = await this.guild.members.fetch(this.interaction.user.id);
        const memberRoleIds = member.roles.cache.map(role => role.id);

        const embed = new EmbedBuilder()
            .setTitle(`Покупка ролей:`)
            .setFooter({ text: `Страница ${page} из ${this.totalPages}` })
            .setThumbnail(this.imageUrl);

        let itemCounter = 1;
        for (let item of pageItems) {
            const counterLabel = `${itemCounter % (this.itemsPerPage + 1)}) `
            const prefix = memberRoleIds.includes(item.role_id) ? `✅ ${counterLabel}` : counterLabel

            embed.addFields({ name: `${prefix}${item.name}`, value: `Стоимость: ${item.cost} 🪙\nОписание: ${item.desc}`, inline: false });
            itemCounter++;
        }

        return embed;
    }

    updateComponents(page, member) {
        const start = (page - 1) * this.itemsPerPage;
        const pageItems = this.items.slice(start, start + this.itemsPerPage);
        const memberRoleIds = member.roles.cache.map(role => role.id);

        const itemButtons = pageItems.map((item, index) =>  {
                const hasBought = memberRoleIds.includes(item.role_id);
                return new ButtonBuilder()
                    .setCustomId(`buyitem_${start + index}`)
                    .setLabel(item.name.length > 80 ? item.name.substring(0, 77) + '...' : `★ ${item.name}`)
                    .setStyle(hasBought ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setDisabled(hasBought)
            }
        );

        const navigationRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('•  Назад')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page <= 1),
            new ButtonBuilder()
                .setCustomId('next')
                .setLabel('•  Дальше')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page >= this.totalPages)
        );

        let a = new ActionRowBuilder();

        itemButtons.forEach(button => {
              a.addComponents(button)
        });

        return [navigationRow, a];
    }

    async init() {
        const member = await this.guild.members.fetch(this.interaction.user.id);
        const embed = await this.getPageContent(this.currentPage, member)
        const components = await this.updateComponents(this.currentPage, member);

        const actionRow = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('sort')
                .setPlaceholder('Сортировка')
                .addOptions([
                    {
                        label: '🔹 По дате добавления',
                        description: 'Сортировка По дате добавления',
                        value: 'by_timestamp',
                    },
                    {
                        label: '🔹 По алфавиту',
                        description: 'Сортировка По алфавиту',
                        value: 'alphabetically',
                    },
                    {
                        label: '🔹 Цена - Убывание',
                        description: 'Сортировка по Цена - Убывание',
                        value: 'price_desc',
                    },

                    {
                        label: '🔹 Цены - Возрастание',
                        description: 'Сортировка по Цены - Возрастание',
                        value: 'price_asc',
                    }
                ]),
        );
    
        const message = await this.interaction.reply({
            embeds: [await this.getPageContent(this.currentPage)],
            components: [actionRow, ...components],
            fetchReply: true,
            ephemeral: true
        });
        
        const filter = i => i.user.id === this.interaction.user.id;
        const collector = message.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'sort') {
                switch (i.values[0]) {
                    case 'price_asc':
                        this.items.sort((a, b) => a.cost - b.cost);
                        break;
                    case 'price_desc':
                        this.items.sort((a, b) => b.cost - a.cost);
                        break;
                    case 'alphabetically':
                        this.items.sort((a, b) => a.name.localeCompare(b.name));
                        break;
                    case 'by_timestamp':
                        this.items.sort((a, b) => new Date(a.creation_timestamp) - new Date(b.creation_timestamp));
                        break;
                }
                this.currentPage = 1;
                
                const embed = await this.getPageContent(this.currentPage);
                const components = this.updateComponents(this.currentPage, await this.guild.members.fetch(this.interaction.user.id));
        
                return await i.update({
                    embeds: [embed],
                    components: [actionRow, ...components],
                });
            } 
            
            if (i.customId.startsWith('prev') || i.customId.startsWith('next')) {
                this.currentPage += i.customId.startsWith('prev') ? -1 : 1;
            } else if (i.customId === 'next' && this.currentPage < this.totalPages) {
                this.currentPage += 1;
            } else if (i.customId.startsWith('buyitem_')) {
                const start = (this.currentPage - 1) * this.itemsPerPage;
                const index = parseInt(i.customId.split('_')[1]);
                const itemIndex = index
        
                const item = this.items[itemIndex];
                if (!item) {
                    await i.update({ content: "Роль не найдена!", ephemeral: true });
                    return;
                }

                await handleRolePurchase(i, item.role_id, this.interaction);
                return;
            }
        
            const member = await this.guild.members.fetch(this.interaction.user.id);
            const updatedEmbed = await this.getPageContent(this.currentPage, member);
            const updatedComponents = this.updateComponents(this.currentPage, member);

            await i.update({
                embeds: [updatedEmbed],
                components: [actionRow, ...updatedComponents],
            });
        });
               
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('menu')
        .setDescription("Меню с доступными ролями к покупке."),
    async execute(interaction) {
        const items = await userController.getAllRolesMenuItems();
        const paginatedMenu = new PaginatedMenu(interaction, items);
        await paginatedMenu.init();
    }
};

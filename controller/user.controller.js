const db = require('../db')

class UserController {
    async createUser(balance, is_muted, role, discord_id, eligibility = true, gender = '') {
        const newPerson = await db.query('INSERT INTO person (balance, is_muted, role, discord_id, last_shop_use, voice_time, eligibility, gender) values ($1, $2, $3, $4, $5, $6, $7, $8)', [balance, is_muted, role, discord_id.toString(), 0, 0, gender])
    
        return newPerson.rows
    }

    async getUsers(req, res) {
        
    }

    async getTopByMoney(limit = 10) {
        try {
            const result = await db.query(
                'SELECT discord_id, username, balance FROM person ORDER BY balance DESC LIMIT $1',
                [limit]
            );
            
            return result.rows;
        } catch (error) {
            console.error('Error fetching top users by money:', error.message);
            throw error;
        }
    }
    
    async getTopByVoiceTime(limit = 10) {
        try {
            const result = await db.query(
                'SELECT discord_id, username, voice_time FROM person ORDER BY voice_time DESC LIMIT $1',
                [limit]
            );

            return result.rows;
        } catch (error) {
            console.error('Error fetching top users by voice time:', error.message);
            throw error;
        }
    }

    async getMarriageStatus(discord_id) {
        const result = await db.query('SELECT partner_id FROM person WHERE discord_id = $1', [discord_id.toString()]);
        return result.rows.length > 0 ? result.rows[0].partner_id : null;
    }

    async getUsernameById(discord_id) {
        const result = await db.query('SELECT username FROM person WHERE discord_id = $1', [discord_id.toString()]);
        return result.rows.length > 0 ? result.rows[0].username : 'Unknown';
    }

    async createOrUpdateMarriageStatus(proposerId, partnerId) {
        try {
            await db.query('UPDATE person SET partner_id = $1 WHERE discord_id = $2', [partnerId, proposerId.toString()]);
            await db.query('UPDATE person SET partner_id = $1 WHERE discord_id = $2', [proposerId, partnerId.toString()]);
            return true;
        } catch (error) {
            console.error(`Error updating marriage status:`, error.message);
            throw error;
        }
    }    

    async updateUserVoiceTime(discord_id, voiceTimeDuration) {
        try {
            let user = await this.findOneUser('person', discord_id);
            if (!user) {
                console.log('user not found')
                await db.query('INSERT INTO person (balance, is_muted, role, discord_id, last_shop_use, voice_time, eligibility, gender) values ($1, $2, $3, $4, $5, $6, $7, $8)', [0, false, 'member', discord_id.toString(), Date.now(), 0, true, ''])
                user = await this.findOneUser('person', discord_id)
            }
    
            const newVoiceTime = (user.voice_time || 0) + voiceTimeDuration;
            await db.query('UPDATE person SET voice_time = $1 WHERE discord_id = $2', [newVoiceTime, discord_id.toString()])
            
            return true;
        } catch (error) {
            console.error(`Error updating voice time for user ${discord_id}:`, error.message);
            throw error;
        }
    }

    async findOneUser(table, id) {
        let targetPerson = await db.query(`SELECT * FROM ${table} WHERE discord_id = $1`, [id]);
        const element = targetPerson.rows[0];

        if (!element) {
            console.log('Requested an unknown user to procced, creating row...')
            await db.query('INSERT INTO person (balance, is_muted, role, discord_id, last_shop_use, voice_time, eligibility, gender) values ($1, $2, $3, $4, $5, $6, $7, $8)', [0, false, 'member', id.toString(), Date.now(), 0, true, ''],)
            targetPerson = await db.query(`SELECT * FROM ${table} WHERE discord_id = $1`, [id]);
        }

        return targetPerson.rows[0];
    }

    async updateUserParam(userId, param, value, table) {
        try {            
            await db.query(`UPDATE ${table} SET ${param} = $1 WHERE discord_id = $2`, [value, userId]);
    
            return true;
        } catch (error) {
            console.error(`Error updating user param ${param}:`, error.message);
            throw error;
        }
    }

    async updateUserBalance(userId, amount) {
        try {
            const user = await this.findOneUser('person', userId);
            if (!user) {
                throw new Error('User not found');
            }
    
            const newBalance = user.balance = amount;
            await db.query('UPDATE person SET balance = $1, last_shop_use = $2 WHERE discord_id = $3', [newBalance, Date.now(), userId]);
    
            return { ...user, balance: newBalance };
        } catch (error) {
            console.error('Error updating user balance:', error.message);
            throw error;
        }
    }

    async deleteUser(req, res) {
        
    }

    async getAllRolesMenuItems() {
        try {
            const result = await db.query('SELECT name, cost, "desc", role_id, owner_id FROM roles_menu');
            return result.rows;
        } catch (error) {
            console.error('Error retrieving roles menu items:', error.message);
            // Consider re-throwing with more context or handling it gracefully
            throw new Error('Failed to retrieve roles menu items from the database.');
        }
    }

    async createRoleMenuItem(name, cost, desc) {
        try {
            const result = await db.query(
                'INSERT INTO roles_menu (name, cost, "desc") VALUES ($1, $2, $3) RETURNING *',
                [name, cost, desc]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error creating a new role menu item:', error.message);
            throw error;
        }
    }

    async createRoleMenuItem(name, cost, desc, roleId, creationTimestamp, owner_id) {
        try {
            const result = await db.query(
                'INSERT INTO roles_menu (name, cost, "desc", role_id, creation_timestamp, owner_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                [name, cost, desc, roleId, creationTimestamp, owner_id]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error creating a new role menu item:', error.message);
            throw error;
        }
    }

    async deleteRoleMenuItem(id) {
        try {
            await db.query('DELETE FROM roles_menu WHERE id = $1', [id]);
            return true;
        } catch (error) {
            console.error(`Error deleting role menu item with ID ${id}:`, error.message);
            throw error;
        }
    }
}

module.exports = new UserController()
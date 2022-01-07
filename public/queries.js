const Pool = require('pg').Pool;
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    }
});

const getUserData = async () => {
    try {
        response = await pool.query('SELECT * FROM tg_auto_delete_messages_data ORDER BY id ASC');
        return { data: response.rows, total: response.rows.length };
    } catch (error) {
        throw { msg: 'Something Went Wrong !!!', err: error };
    };
};

const addUserData = async (request) => {
    const user_id = parseInt(request.user_id);
    const chat_id = Number(request.chat_id);
    const message_id = parseInt(request.message_id);
    const created_at = parseInt(request.created_at);

    try {
        response = await pool.query('INSERT INTO tg_auto_delete_messages_data (user_id, chat_id, message_id, created_at) VALUES ($1, $2, $3, $4)', [user_id, chat_id, message_id, created_at]);
        return { data: response };
    } catch (error) {
        throw { msg: 'Something Went Wrong !!!', err: error };
    };
};

const updateUserData = async (request) => {
    const [ user_id, message_id, id ] = request.body;

    try {
        response = await pool.query('UPDATE tg_auto_delete_messages_data SET user_id = $1, message_id = $2 WHERE id = $3', [user_id, message_id, Number(id)]);
        return { data: response };
    } catch (error) {
        throw { msg: 'Something Went Wrong !!!', err: error };
    };
};

const deleteUserDataByMsgId = async (request) => {
    const user_id = parseInt(request.user_id);
    const chat_id = Number(request.chat_id);
    const message_id = parseInt(request.message_id);

    try {
        response = await pool.query('DELETE FROM tg_auto_delete_messages_data WHERE user_id = $1 and chat_id = $2 and message_id = $3', [user_id, chat_id, message_id]);
        return { data: response };
    } catch (error) {
        throw { msg: 'Something Went Wrong !!!', err: error };
    };
};

const deleteUserData = async (request) => {
    const user_id = parseInt(request.user_id);
    const chat_id = Number(request.chat_id);

    try {
        response = await pool.query('DELETE FROM tg_auto_delete_messages_data WHERE user_id = $1 and chat_id = $2', [user_id, chat_id]);
        return { data: response };
    } catch (error) {
        throw { msg: 'Something Went Wrong !!!', err: error };
    };
};

/*

    USER CHAT DATA QUARIES

*/

const addUserChatStatus = async (request) => {
    const user_id = parseInt(request.user_id);
    const chat_title = request.chat_title;
    const chat_id = Number(request.chat_id);
    const chat_type = request.chat_type;
    const time_out = parseInt(request.time_out)

    try {
        response = await pool.query('INSERT INTO tg_auto_delete_messages_user_status (user_id, chat_title, chat_id, chat_type, time_out, is_enabled) VALUES ($1, $2, $3, $4, $5, $6)', [user_id, chat_title, chat_id, chat_type, time_out, Boolean(1)]);
        return { data: response.rows, total: response.rows.length };
    } catch (error) {
        throw { msg: 'Something Went Wrong !!!', err: error };
    };
};

const updateUserChatDataBy = async (request) => {
    const update_by = request.update_by;
    const update_by_value = request.update_by_value;
    const user_id = parseInt(request.user_id);
    const chat_id = Number(request.chat_id);

    try {
        response = await pool.query(`UPDATE tg_auto_delete_messages_user_status SET ${update_by} = $1 WHERE user_id = $2 and chat_id = $3`, [update_by_value, user_id, chat_id]);
        return { data: response.rows, total: response.rows.length };
    } catch (error) {
        throw { msg: 'Something Went Wrong !!!', err: error };
    };
};

const getUserAllChatData = async (request) => {
    const user_id = parseInt(request.user_id);

    try {
        response = await pool.query('SELECT * FROM tg_auto_delete_messages_user_status WHERE user_id = $1', [user_id]);
        return { data: response.rows, total: response.rows.length };
    } catch (error) {
        throw { msg: 'Something Went Wrong !!!', err: error };
    };
};

const getUserChatDataBy = async (request) => {
    const get_by = request.get_by;
    const get_by_value = request.get_by_value;
    
    try {
        response = await pool.query(`SELECT * FROM tg_auto_delete_messages_user_status WHERE ${get_by} = $1`, [get_by_value]);
        return { data: response.rows, total: response.rows.length };
    } catch (error) {
        throw { msg: 'Something Went Wrong !!!', err: error };
    };
};

const deleteUserChatStatus = async (request) => {
    const user_id = parseInt(request.user_id);
    const chat_id = Number(request.chat_id);

    try {
        response = await pool.query('DELETE FROM tg_auto_delete_messages_user_status WHERE user_id = $1 and chat_id = $2', [user_id, chat_id]);
        return { data: response };
    } catch (error) {
        throw { msg: 'Something Went Wrong !!!', err: error };
    };
};

const getUserChatData = async () => {
    try {
        response = await pool.query('SELECT * FROM tg_auto_delete_messages_user_status ORDER BY id ASC');
        return { data: response.rows, total: response.rows.length };
    } catch (error) {
        throw { msg: 'Something Went Wrong !!!', err: error };
    };
};

module.exports = {
    getUserData,
    addUserData,
    updateUserData,
    deleteUserDataByMsgId,
    deleteUserData,
    getUserChatData,
    getUserAllChatData,
    getUserChatDataBy,
    addUserChatStatus,
    updateUserChatDataBy,
    deleteUserChatStatus
};

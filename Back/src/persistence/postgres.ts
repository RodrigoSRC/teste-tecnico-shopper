import waitPort from 'wait-port';
import fs from 'fs';
import { Client } from 'pg';

const {
    POSTGRES_HOST: HOST,
    POSTGRES_HOST_FILE: HOST_FILE,
    POSTGRES_USER: USER,
    POSTGRES_USER_FILE: USER_FILE,
    POSTGRES_PASSWORD: PASSWORD,
    POSTGRES_PASSWORD_FILE: PASSWORD_FILE,
    POSTGRES_DB: DB,
    POSTGRES_DB_FILE: DB_FILE,
} = process.env;

let client: Client;

async function init(): Promise<void> {
    const host = HOST_FILE ? fs.readFileSync(HOST_FILE, 'utf8').trim() : HOST;
    const user = USER_FILE ? fs.readFileSync(USER_FILE, 'utf8').trim() : USER;
    const password = PASSWORD_FILE ? fs.readFileSync(PASSWORD_FILE, 'utf8').trim() : PASSWORD;
    const database = DB_FILE ? fs.readFileSync(DB_FILE, 'utf8').trim() : DB;

    await waitPort({ 
        host, 
        port: 5432,
        timeout: 10000,
        waitForDns: true,
    });

    client = new Client({
        host,
        user,
        password,
        database
    });

    try {
        await client.connect();
        console.log(`Connected to postgres db at host ${HOST}`);
        // Run the SQL instruction to create the table if it does not exist
        await client.query('CREATE TABLE IF NOT EXISTS todo_items (id varchar(36), name varchar(255), completed boolean)');
        console.log('Connected to db and created table todo_items if it did not exist');
    } catch (err) {
        console.error('Unable to connect to the database:', err);
    }
}

// Get all items from the table
async function getItems(): Promise<{ id: string; name: string; completed: boolean }[]> {
    try {
        const res = await client.query('SELECT * FROM todo_items');
        return res.rows.map(row => ({
            id: row.id,
            name: row.name,
            completed: row.completed
        }));
    } catch (err) {
        console.error('Unable to get items:', err);
        return [];
    }
}

// End the connection
async function teardown(): Promise<void> {
    try {
        await client.end();
        console.log('Client ended');
    } catch (err) {
        console.error('Unable to end client:', err);
    }
}

// Get one item by id from the table
async function getItem(id: string): Promise<{ id: string; name: string; completed: boolean } | null> {
    try {
        const res = await client.query('SELECT * FROM todo_items WHERE id = $1', [id]);
        return res.rows.length > 0 ? res.rows[0] : null;
    } catch (err) {
        console.error('Unable to get item:', err);
        return null;
    }
}

// Store one item in the table
async function storeItem(item: { id: string; name: string; completed: boolean }): Promise<void> {
    try {
        await client.query('INSERT INTO todo_items(id, name, completed) VALUES($1, $2, $3)', [item.id, item.name, item.completed]);
        console.log('Stored item:', item);
    } catch (err) {
        console.error('Unable to store item:', err);
    }
}

// Update one item by id in the table
async function updateItem(id: string, item: { name: string; completed: boolean }): Promise<void> {
    try {
        await client.query('UPDATE todo_items SET name = $1, completed = $2 WHERE id = $3', [item.name, item.completed, id]);
        console.log('Updated item:', item);
    } catch (err) {
        console.error('Unable to update item:', err);
    }
}

// Remove one item by id from the table
async function removeItem(id: string): Promise<void> {
    try {
        await client.query('DELETE FROM todo_items WHERE id = $1', [id]);
        console.log('Removed item:', id);
    } catch (err) {
        console.error('Unable to remove item:', err);
    }
}

export {
    init,
    teardown,
    getItems,
    getItem,
    storeItem,
    updateItem,
    removeItem,
};

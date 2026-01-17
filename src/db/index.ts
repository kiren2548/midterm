import Database from 'better-sqlite3';

async function initializeDatabaes() {
    
    const option = {verbose:console.log};
    const db = new Database('app.db',option);
    return db;
}

const db = await initializeDatabaes();

export default db;
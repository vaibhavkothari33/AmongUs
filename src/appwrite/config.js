import { Client, Account, Databases } from 'appwrite';

const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
export const COLLECTIONS = {
    PLAYERS: import.meta.env.VITE_APPWRITE_PLAYERS_COLLECTION_ID,
    TASKS: import.meta.env.VITE_APPWRITE_TASKS_COLLECTION_ID,
    EVENTS: import.meta.env.VITE_APPWRITE_EVENTS_COLLECTION_ID  // Add this line
};
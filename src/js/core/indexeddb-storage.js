/**
 * IndexedDB Storage System for Vocabulary App
 * Provides high-performance, large-capacity storage with backup capabilities
 */
class IndexedDBStorage {
    constructor() {
        this.dbName = 'VocabularyAppDB';
        this.dbVersion = 1;
        this.db = null;
        
        this.stores = {
            words: 'words',
            lessons: 'lessons',
            progress: 'progress',
            settings: 'settings',
            backups: 'backups'
        };
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB initialized successfully');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                this.createObjectStores();
                console.log('📦 IndexedDB object stores created');
            };
        });
    }

    createObjectStores() {
        // Words store
        if (!this.db.objectStoreNames.contains(this.stores.words)) {
            const wordsStore = this.db.createObjectStore(this.stores.words, { keyPath: 'id' });
            wordsStore.createIndex('english', 'english', { unique: false });
            wordsStore.createIndex('vietnamese', 'vietnamese', { unique: false });
            wordsStore.createIndex('lessonId', 'lessonId', { unique: false });
            wordsStore.createIndex('category', 'category', { unique: false });
            wordsStore.createIndex('addedDate', 'addedDate', { unique: false });
        }

        // Lessons store
        if (!this.db.objectStoreNames.contains(this.stores.lessons)) {
            const lessonsStore = this.db.createObjectStore(this.stores.lessons, { keyPath: 'id' });
            lessonsStore.createIndex('name', 'name', { unique: false });
            lessonsStore.createIndex('createdDate', 'createdDate', { unique: false });
        }

        // Progress store
        if (!this.db.objectStoreNames.contains(this.stores.progress)) {
            this.db.createObjectStore(this.stores.progress, { keyPath: 'type' });
        }

        // Settings store
        if (!this.db.objectStoreNames.contains(this.stores.settings)) {
            this.db.createObjectStore(this.stores.settings, { keyPath: 'key' });
        }

        // Backups store
        if (!this.db.objectStoreNames.contains(this.stores.backups)) {
            const backupsStore = this.db.createObjectStore(this.stores.backups, { 
                keyPath: 'id', 
                autoIncrement: true 
            });
            backupsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
    }

    async performTransaction(storeName, mode, operation) {
        if (!this.db) throw new Error('Database not initialized');
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], mode);
            const store = transaction.objectStore(storeName);
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            
            try {
                const result = operation(store);
                if (result && result.onsuccess !== undefined) {
                    result.onsuccess = () => resolve(result.result);
                    result.onerror = () => reject(result.error);
                } else {
                    resolve(result);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    // Words operations
    async addWord(word) {
        return this.performTransaction(this.stores.words, 'readwrite', (store) => {
            return store.add(word);
        });
    }

    async updateWord(word) {
        return this.performTransaction(this.stores.words, 'readwrite', (store) => {
            return store.put(word);
        });
    }

    async deleteWord(id) {
        return this.performTransaction(this.stores.words, 'readwrite', (store) => {
            return store.delete(id);
        });
    }

    async getWord(id) {
        return this.performTransaction(this.stores.words, 'readonly', (store) => {
            return store.get(id);
        });
    }

    async getAllWords() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.stores.words], 'readonly');
            const store = transaction.objectStore(this.stores.words);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getWordsByLesson(lessonId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.stores.words], 'readonly');
            const store = transaction.objectStore(this.stores.words);
            const index = store.index('lessonId');
            const request = index.getAll(lessonId);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Lessons operations
    async addLesson(lesson) {
        return this.performTransaction(this.stores.lessons, 'readwrite', (store) => {
            return store.add(lesson);
        });
    }

    async updateLesson(lesson) {
        return this.performTransaction(this.stores.lessons, 'readwrite', (store) => {
            return store.put(lesson);
        });
    }

    async deleteLesson(id) {
        return this.performTransaction(this.stores.lessons, 'readwrite', (store) => {
            return store.delete(id);
        });
    }

    async getAllLessons() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.stores.lessons], 'readonly');
            const store = transaction.objectStore(this.stores.lessons);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Progress operations
    async saveProgress(type, progressData) {
        const data = {
            type: type,
            data: progressData,
            lastUpdated: new Date().toISOString()
        };
        
        return this.performTransaction(this.stores.progress, 'readwrite', (store) => {
            return store.put(data);
        });
    }

    async getProgress(type) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.stores.progress], 'readonly');
            const store = transaction.objectStore(this.stores.progress);
            const request = store.get(type);
            
            request.onsuccess = () => resolve(request.result?.data || null);
            request.onerror = () => reject(request.error);
        });
    }

    // Settings operations
    async saveSetting(key, value) {
        const data = {
            key: key,
            value: value,
            lastUpdated: new Date().toISOString()
        };
        
        return this.performTransaction(this.stores.settings, 'readwrite', (store) => {
            return store.put(data);
        });
    }

    async getSetting(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.stores.settings], 'readonly');
            const store = transaction.objectStore(this.stores.settings);
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result?.value || null);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllSettings() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.stores.settings], 'readonly');
            const store = transaction.objectStore(this.stores.settings);
            const request = store.getAll();
            
            request.onsuccess = () => {
                const settings = {};
                request.result.forEach(item => {
                    settings[item.key] = item.value;
                });
                resolve(settings);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Backup operations
    async createBackup(description = 'Auto backup') {
        const backup = {
            timestamp: new Date().toISOString(),
            description: description,
            data: {
                words: await this.getAllWords(),
                lessons: await this.getAllLessons(),
                progress: await this.getProgress('quiz'),
                settings: await this.getAllSettings()
            },
            version: this.dbVersion
        };
        
        return this.performTransaction(this.stores.backups, 'readwrite', (store) => {
            return store.add(backup);
        });
    }

    async getAllBackups() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.stores.backups], 'readonly');
            const store = transaction.objectStore(this.stores.backups);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteBackup(id) {
        return this.performTransaction(this.stores.backups, 'readwrite', (store) => {
            return store.delete(id);
        });
    }

    async restoreFromBackup(backupId) {
        const backup = await this.getBackup(backupId);
        if (!backup) throw new Error('Backup not found');
        
        // Clear existing data
        await this.clearAllData();
        
        // Restore data
        const { words, lessons, progress, settings } = backup.data;
        
        if (words) {
            for (const word of words) {
                await this.addWord(word);
            }
        }
        
        if (lessons) {
            for (const lesson of lessons) {
                await this.addLesson(lesson);
            }
        }
        
        if (progress) {
            await this.saveProgress('quiz', progress);
        }
        
        if (settings) {
            for (const [key, value] of Object.entries(settings)) {
                await this.saveSetting(key, value);
            }
        }
        
        return true;
    }

    async getBackup(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.stores.backups], 'readonly');
            const store = transaction.objectStore(this.stores.backups);
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Export/Import operations
    async exportAllData() {
        return {
            words: await this.getAllWords(),
            lessons: await this.getAllLessons(),
            progress: await this.getProgress('quiz'),
            settings: await this.getAllSettings(),
            exportDate: new Date().toISOString(),
            storageType: 'IndexedDB'
        };
    }

    async importData(data) {
        // Create backup before import
        await this.createBackup('Before import - ' + new Date().toLocaleString());
        
        if (data.words) {
            for (const word of data.words) {
                await this.updateWord(word); // Use update to handle duplicates
            }
        }
        
        if (data.lessons) {
            for (const lesson of data.lessons) {
                await this.updateLesson(lesson);
            }
        }
        
        if (data.progress) {
            await this.saveProgress('quiz', data.progress);
        }
        
        if (data.settings) {
            for (const [key, value] of Object.entries(data.settings)) {
                await this.saveSetting(key, value);
            }
        }
        
        return true;
    }

    // Utility methods
    async clearAllData() {
        const stores = Object.values(this.stores);
        for (const storeName of stores) {
            if (storeName !== this.stores.backups) { // Keep backups
                await this.performTransaction(storeName, 'readwrite', (store) => {
                    return store.clear();
                });
            }
        }
    }

    async getDataStats() {
        const [words, lessons, backups] = await Promise.all([
            this.getAllWords(),
            this.getAllLessons(), 
            this.getAllBackups()
        ]);
        
        return {
            words: words.length,
            lessons: lessons.length,
            backups: backups.length,
            totalSize: await this.getStorageUsage()
        };
    }

    async getStorageUsage() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return {
                usedBytes: estimate.usage || 0,
                availableBytes: estimate.quota || 0,
                usagePercentage: estimate.usage && estimate.quota ? 
                    (estimate.usage / estimate.quota * 100).toFixed(2) + '%' : 'Unknown'
            };
        }
        return { usedBytes: 0, availableBytes: 0, usagePercentage: 'Unknown' };
    }

    // Check if IndexedDB is supported
    static isSupported() {
        return 'indexedDB' in window;
    }

    // Close database connection
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IndexedDBStorage;
} else if (typeof window !== 'undefined') {
    window.IndexedDBStorage = IndexedDBStorage;
} 
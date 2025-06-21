// IndexedDB Storage Manager for Vocabulary App
// Provides much better storage capacity and features than localStorage

class IndexedDBStorage {
    constructor() {
        this.dbName = 'VocabularyAppDB';
        this.dbVersion = 1;
        this.db = null;
        
        // Object stores (tables)
        this.stores = {
            words: 'words',
            lessons: 'lessons', 
            progress: 'progress',
            settings: 'settings',
            backups: 'backups'
        };
    }

    // Initialize database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('IndexedDB failed to open:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB opened successfully');
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create words store
                if (!db.objectStoreNames.contains(this.stores.words)) {
                    const wordsStore = db.createObjectStore(this.stores.words, { keyPath: 'id' });
                    wordsStore.createIndex('lessonId', 'lessonId', { unique: false });
                    wordsStore.createIndex('category', 'category', { unique: false });
                    wordsStore.createIndex('english', 'english', { unique: false });
                    wordsStore.createIndex('addedDate', 'addedDate', { unique: false });
                }
                
                // Create lessons store
                if (!db.objectStoreNames.contains(this.stores.lessons)) {
                    const lessonsStore = db.createObjectStore(this.stores.lessons, { keyPath: 'id' });
                    lessonsStore.createIndex('name', 'name', { unique: false });
                    lessonsStore.createIndex('createdDate', 'createdDate', { unique: false });
                }
                
                // Create progress store
                if (!db.objectStoreNames.contains(this.stores.progress)) {
                    db.createObjectStore(this.stores.progress, { keyPath: 'type' });
                }
                
                // Create settings store
                if (!db.objectStoreNames.contains(this.stores.settings)) {
                    db.createObjectStore(this.stores.settings, { keyPath: 'key' });
                }
                
                // Create backups store
                if (!db.objectStoreNames.contains(this.stores.backups)) {
                    const backupsStore = db.createObjectStore(this.stores.backups, { keyPath: 'id', autoIncrement: true });
                    backupsStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                console.log('IndexedDB schema created/updated');
            };
        });
    }

    // Generic method to perform transactions
    async performTransaction(storeName, mode, operation) {
        if (!this.db) {
            throw new Error('Database not initialized. Call init() first.');
        }
        
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

    async getLesson(id) {
        return this.performTransaction(this.stores.lessons, 'readonly', (store) => {
            return store.get(id);
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
            
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.data : null);
            };
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
            
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.value : null);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getAllSettings() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.stores.settings], 'readonly');
            const store = transaction.objectStore(this.stores.settings);
            const request = store.getAll();
            
            request.onsuccess = () => {
                const results = request.result;
                const settings = {};
                results.forEach(item => {
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

    // Import/Export operations
    async exportAllData() {
        return {
            words: await this.getAllWords(),
            lessons: await this.getAllLessons(),
            progress: await this.getProgress('quiz'),
            settings: await this.getAllSettings(),
            exportDate: new Date().toISOString(),
            version: this.dbVersion
        };
    }

    async importData(data) {
        // Clear existing data first
        await this.clearAllData();
        
        // Import lessons first (words depend on lessons)
        if (data.lessons && Array.isArray(data.lessons)) {
            for (const lesson of data.lessons) {
                await this.addLesson(lesson);
            }
        }
        
        // Import words
        if (data.words && Array.isArray(data.words)) {
            for (const word of data.words) {
                await this.addWord(word);
            }
        }
        
        // Import progress
        if (data.progress) {
            await this.saveProgress('quiz', data.progress);
        }
        
        // Import settings
        if (data.settings) {
            for (const [key, value] of Object.entries(data.settings)) {
                await this.saveSetting(key, value);
            }
        }
        
        console.log('Data import completed successfully');
    }

    // Migration from localStorage
    async migrateFromLocalStorage() {
        console.log('Starting migration from localStorage to IndexedDB...');
        
        try {
            // Get data from localStorage
            const wordsData = localStorage.getItem('vocabularyWords');
            const lessonsData = localStorage.getItem('vocabularyLessons');
            const progressData = localStorage.getItem('quizProgress');
            const currentLessonId = localStorage.getItem('currentLessonId');
            const practiceLessonsData = localStorage.getItem('selectedPracticeLessons');
            
            // Import lessons
            if (lessonsData) {
                const lessons = JSON.parse(lessonsData);
                for (const lesson of lessons) {
                    await this.addLesson(lesson);
                }
                console.log(`Migrated ${lessons.length} lessons`);
            }
            
            // Import words
            if (wordsData) {
                const words = JSON.parse(wordsData);
                for (const word of words) {
                    await this.addWord(word);
                }
                console.log(`Migrated ${words.length} words`);
            }
            
            // Import progress
            if (progressData) {
                const progress = JSON.parse(progressData);
                await this.saveProgress('quiz', progress);
                console.log('Migrated quiz progress');
            }
            
            // Import settings
            if (currentLessonId) {
                await this.saveSetting('currentLessonId', currentLessonId);
            }
            
            if (practiceLessonsData) {
                const practiceLessons = JSON.parse(practiceLessonsData);
                await this.saveSetting('selectedPracticeLessons', practiceLessons);
            }
            
            // Create backup of localStorage data before clearing
            await this.createBackup('Migration from localStorage');
            
            console.log('Migration completed successfully!');
            return true;
            
        } catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }
    }

    // Utility methods
    async clearAllData() {
        const stores = Object.values(this.stores);
        for (const storeName of stores) {
            await this.performTransaction(storeName, 'readwrite', (store) => {
                return store.clear();
            });
        }
    }

    async getStorageUsage() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            return await navigator.storage.estimate();
        }
        return null;
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

    // Close database connection
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IndexedDBStorage;
} else if (typeof window !== 'undefined') {
    window.IndexedDBStorage = IndexedDBStorage;
} 
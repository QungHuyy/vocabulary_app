/**
 * Storage Adapter - Unified interface for localStorage and IndexedDB
 * Provides seamless migration and fallback capabilities
 */
class StorageAdapter {
    constructor() {
        this.preferredStorage = 'indexeddb'; // 'localStorage' or 'indexeddb'
        this.currentStorage = null;
        this.indexedDBStorage = null;
        this.isReady = false;
        this.migration = null;
    }

    async init() {
        try {
            // Check IndexedDB support
            if (IndexedDBStorage.isSupported() && this.preferredStorage === 'indexeddb') {
                this.indexedDBStorage = new IndexedDBStorage();
                await this.indexedDBStorage.init();
                
                // Initialize migration system
                this.migration = new DataMigration();
                await this.migration.init();
                
                // Check if we need to migrate from localStorage
                const hasLocalData = this.migration.hasLocalStorageData();
                const hasIndexedData = await this.migration.hasIndexedDBData();
                
                if (hasLocalData && !hasIndexedData) {
                    console.log('🔄 Auto-migrating data from localStorage to IndexedDB...');
                    const result = await this.migration.migrate({
                        createBackup: true,
                        clearLocalStorage: false // Keep localStorage as backup initially
                    });
                    
                    if (result.success) {
                        console.log('✅ Auto-migration completed:', result.stats);
                        // Verify migration
                        const verification = await this.migration.verifyMigration();
                        if (verification.success) {
                            console.log('✅ Migration verification passed');
                        } else {
                            console.warn('⚠️ Migration verification failed:', verification);
                        }
                    } else {
                        console.error('❌ Auto-migration failed:', result.message);
                        throw new Error('Migration failed: ' + result.message);
                    }
                }
                
                this.currentStorage = 'indexeddb';
                console.log('✅ Using IndexedDB storage');
                
            } else {
                // Fallback to localStorage
                this.currentStorage = 'localStorage';
                console.log('⚠️ Falling back to localStorage');
            }
            
            this.isReady = true;
            return true;
            
        } catch (error) {
            console.error('Storage initialization failed:', error);
            // Fallback to localStorage
            this.currentStorage = 'localStorage';
            this.isReady = true;
            console.log('⚠️ Using localStorage fallback due to error');
            return true;
        }
    }

    async ensureReady() {
        if (!this.isReady) {
            await this.init();
        }
    }

    // Words operations
    async getAllWords() {
        await this.ensureReady();
        
        if (this.currentStorage === 'indexeddb') {
            return await this.indexedDBStorage.getAllWords();
        } else {
            const data = localStorage.getItem('vocabularyWords');
            return data ? JSON.parse(data) : [];
        }
    }

    async addWord(word) {
        await this.ensureReady();
        
        if (this.currentStorage === 'indexeddb') {
            return await this.indexedDBStorage.addWord(word);
        } else {
            const words = await this.getAllWords();
            words.push(word);
            localStorage.setItem('vocabularyWords', JSON.stringify(words));
            return true;
        }
    }

    async updateWord(word) {
        await this.ensureReady();
        
        if (this.currentStorage === 'indexeddb') {
            return await this.indexedDBStorage.updateWord(word);
        } else {
            const words = await this.getAllWords();
            const index = words.findIndex(w => w.id === word.id);
            if (index !== -1) {
                words[index] = word;
                localStorage.setItem('vocabularyWords', JSON.stringify(words));
            }
            return true;
        }
    }

    async deleteWord(id) {
        await this.ensureReady();
        
        if (this.currentStorage === 'indexeddb') {
            return await this.indexedDBStorage.deleteWord(id);
        } else {
            const words = await this.getAllWords();
            const filteredWords = words.filter(w => w.id !== id);
            localStorage.setItem('vocabularyWords', JSON.stringify(filteredWords));
            return true;
        }
    }

    async saveWords(words) {
        await this.ensureReady();
        
        if (this.currentStorage === 'indexeddb') {
            // Clear existing words and add new ones
            const transaction = this.indexedDBStorage.db.transaction(['words'], 'readwrite');
            const store = transaction.objectStore('words');
            await store.clear();
            
            for (const word of words) {
                await this.indexedDBStorage.addWord(word);
            }
        } else {
            localStorage.setItem('vocabularyWords', JSON.stringify(words));
        }
    }

    // Lessons operations
    async getAllLessons() {
        await this.ensureReady();
        
        if (this.currentStorage === 'indexeddb') {
            return await this.indexedDBStorage.getAllLessons();
        } else {
            const data = localStorage.getItem('vocabularyLessons');
            return data ? JSON.parse(data) : [];
        }
    }

    async addLesson(lesson) {
        await this.ensureReady();
        
        if (this.currentStorage === 'indexeddb') {
            return await this.indexedDBStorage.addLesson(lesson);
        } else {
            const lessons = await this.getAllLessons();
            lessons.push(lesson);
            localStorage.setItem('vocabularyLessons', JSON.stringify(lessons));
            return true;
        }
    }

    async updateLesson(lesson) {
        await this.ensureReady();
        
        if (this.currentStorage === 'indexeddb') {
            return await this.indexedDBStorage.updateLesson(lesson);
        } else {
            const lessons = await this.getAllLessons();
            const index = lessons.findIndex(l => l.id === lesson.id);
            if (index !== -1) {
                lessons[index] = lesson;
                localStorage.setItem('vocabularyLessons', JSON.stringify(lessons));
            }
            return true;
        }
    }

    async deleteLesson(id) {
        await this.ensureReady();
        
        if (this.currentStorage === 'indexeddb') {
            return await this.indexedDBStorage.deleteLesson(id);
        } else {
            const lessons = await this.getAllLessons();
            const filteredLessons = lessons.filter(l => l.id !== id);
            localStorage.setItem('vocabularyLessons', JSON.stringify(filteredLessons));
            return true;
        }
    }

    async saveLessons(lessons) {
        await this.ensureReady();
        
        if (this.currentStorage === 'indexeddb') {
            console.log('💾 Saving lessons to IndexedDB:', lessons.length);
            
            // Get existing lessons to compare
            const existingLessons = await this.indexedDBStorage.getAllLessons();
            const existingIds = existingLessons.map(l => l.id);
            
            // Update or add new lessons
            for (const lesson of lessons) {
                try {
                    if (existingIds.includes(lesson.id)) {
                        await this.indexedDBStorage.updateLesson(lesson);
                        console.log('✅ Updated lesson:', lesson.id);
                    } else {
                        await this.indexedDBStorage.addLesson(lesson);
                        console.log('✅ Added new lesson:', lesson.id);
                    }
                } catch (error) {
                    console.error('❌ Error saving lesson:', lesson.id, error);
                }
            }
            
            // Remove lessons that no longer exist
            const newIds = lessons.map(l => l.id);
            for (const existingLesson of existingLessons) {
                if (!newIds.includes(existingLesson.id)) {
                    await this.indexedDBStorage.deleteLesson(existingLesson.id);
                    console.log('🗑️ Removed lesson:', existingLesson.id);
                }
            }
            
            console.log('✅ All lessons saved to IndexedDB');
        } else {
            localStorage.setItem('vocabularyLessons', JSON.stringify(lessons));
        }
    }

    // Progress operations
    async getProgress() {
        await this.ensureReady();
        
        if (this.currentStorage === 'indexeddb') {
            return await this.indexedDBStorage.getProgress('quiz');
        } else {
            const data = localStorage.getItem('quizProgress');
            return data ? JSON.parse(data) : {
                totalQuestions: 0,
                correctAnswers: 0,
                totalWords: 0,
                learnedWords: []
            };
        }
    }

    async saveProgress(progress) {
        await this.ensureReady();
        
        if (this.currentStorage === 'indexeddb') {
            return await this.indexedDBStorage.saveProgress('quiz', progress);
        } else {
            localStorage.setItem('quizProgress', JSON.stringify(progress));
            return true;
        }
    }

    // Settings operations
    async getSetting(key) {
        await this.ensureReady();
        
        if (this.currentStorage === 'indexeddb') {
            return await this.indexedDBStorage.getSetting(key);
        } else {
            return localStorage.getItem(key);
        }
    }

    async saveSetting(key, value) {
        await this.ensureReady();
        
        if (this.currentStorage === 'indexeddb') {
            return await this.indexedDBStorage.saveSetting(key, value);
        } else {
            if (typeof value === 'object') {
                localStorage.setItem(key, JSON.stringify(value));
            } else {
                localStorage.setItem(key, value);
            }
            return true;
        }
    }

    // Batch save operation (for compatibility with existing code)
    async saveAll(data) {
        await this.ensureReady();
        
        if (data.words) await this.saveWords(data.words);
        if (data.lessons) await this.saveLessons(data.lessons);
        if (data.progress) await this.saveProgress(data.progress);
        if (data.currentLessonId !== undefined) await this.saveSetting('currentLessonId', data.currentLessonId);
        if (data.selectedPracticeLessons) await this.saveSetting('selectedPracticeLessons', data.selectedPracticeLessons);
    }

    // Export/Import operations
    async exportData() {
        await this.ensureReady();
        
        if (this.currentStorage === 'indexeddb') {
            return await this.indexedDBStorage.exportAllData();
        } else {
            return {
                words: await this.getAllWords(),
                lessons: await this.getAllLessons(),
                progress: await this.getProgress(),
                settings: {
                    currentLessonId: await this.getSetting('currentLessonId'),
                    selectedPracticeLessons: JSON.parse(await this.getSetting('selectedPracticeLessons') || '{}')
                },
                exportDate: new Date().toISOString(),
                storageType: 'localStorage'
            };
        }
    }

    async importData(data) {
        await this.ensureReady();
        
        if (this.currentStorage === 'indexeddb') {
            return await this.indexedDBStorage.importData(data);
        } else {
            if (data.words) await this.saveWords(data.words);
            if (data.lessons) await this.saveLessons(data.lessons);
            if (data.progress) await this.saveProgress(data.progress);
            if (data.settings) {
                for (const [key, value] of Object.entries(data.settings)) {
                    await this.saveSetting(key, value);
                }
            }
        }
    }

    // Backup operations (IndexedDB only)
    async createBackup(description) {
        await this.ensureReady();
        
        if (this.currentStorage === 'indexeddb') {
            return await this.indexedDBStorage.createBackup(description);
        } else {
            console.warn('Backup feature only available with IndexedDB');
            return null;
        }
    }

    async getAllBackups() {
        await this.ensureReady();
        
        if (this.currentStorage === 'indexeddb') {
            return await this.indexedDBStorage.getAllBackups();
        } else {
            return [];
        }
    }

    // Storage information
    async getStorageInfo() {
        await this.ensureReady();
        
        const info = {
            type: this.currentStorage,
            isReady: this.isReady,
            supportsIndexedDB: IndexedDBStorage.isSupported()
        };
        
        if (this.currentStorage === 'indexeddb') {
            info.stats = await this.indexedDBStorage.getDataStats();
            info.usage = await this.indexedDBStorage.getStorageUsage();
        } else {
            // Calculate localStorage usage
            let totalSize = 0;
            const keys = ['vocabularyWords', 'vocabularyLessons', 'quizProgress', 'currentLessonId', 'selectedPracticeLessons'];
            keys.forEach(key => {
                const value = localStorage.getItem(key);
                if (value) {
                    totalSize += new Blob([value]).size;
                }
            });
            info.usage = { usedBytes: totalSize };
        }
        
        return info;
    }

    // Migration utilities
    async startMigration(options = {}) {
        await this.ensureReady();
        
        if (this.migration) {
            return await this.migration.migrate(options);
        } else {
            return { success: false, message: 'Migration not available' };
        }
    }

    getMigrationStatus() {
        return this.migration ? this.migration.getStatus() : null;
    }

    async verifyMigration() {
        if (this.migration) {
            return await this.migration.verifyMigration();
        } else {
            return { success: false, message: 'Migration not available' };
        }
    }

    // Force storage type
    forceStorageType(type) {
        this.preferredStorage = type;
        this.isReady = false;
        return this.init();
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageAdapter;
} else if (typeof window !== 'undefined') {
    window.StorageAdapter = StorageAdapter;
} 
// Storage Adapter - Unified interface for localStorage and IndexedDB
// Provides seamless migration and fallback capabilities

class StorageAdapter {
    constructor() {
        this.preferredStorage = 'indexeddb'; // 'localStorage' or 'indexeddb'
        this.currentStorage = null;
        this.indexedDBStorage = null;
        this.isReady = false;
    }

    // Initialize storage system
    async init() {
        console.log('Initializing storage system...');
        
        try {
            // Try to initialize IndexedDB first
            if (this.supportsIndexedDB()) {
                const { IndexedDBStorage } = await import('./indexeddb-storage.js');
                this.indexedDBStorage = new IndexedDBStorage();
                await this.indexedDBStorage.init();
                this.currentStorage = 'indexeddb';
                console.log('✅ IndexedDB initialized successfully');
                
                // Check if we need to migrate from localStorage
                if (this.hasLocalStorageData()) {
                    console.log('📦 Found localStorage data, starting migration...');
                    await this.migrateFromLocalStorage();
                }
            } else {
                throw new Error('IndexedDB not supported');
            }
        } catch (error) {
            console.warn('❌ IndexedDB failed, falling back to localStorage:', error.message);
            this.currentStorage = 'localStorage';
        }
        
        this.isReady = true;
        console.log(`🚀 Storage system ready (using: ${this.currentStorage})`);
        return this.currentStorage;
    }

    // Check if IndexedDB is supported
    supportsIndexedDB() {
        return 'indexedDB' in window && window.indexedDB !== null;
    }

    // Check if localStorage has vocabulary data
    hasLocalStorageData() {
        return localStorage.getItem('vocabularyWords') || 
               localStorage.getItem('vocabularyLessons');
    }

    // Migrate from localStorage to IndexedDB
    async migrateFromLocalStorage() {
        if (!this.indexedDBStorage) return false;
        
        try {
            await this.indexedDBStorage.migrateFromLocalStorage();
            
            // Ask user if they want to clear localStorage after successful migration
            const shouldClear = confirm(
                'Migration thành công! Bạn có muốn xóa dữ liệu cũ trong localStorage không?\n' +
                '(Khuyến nghị: Chọn OK để tiết kiệm dung lượng)'
            );
            
            if (shouldClear) {
                this.clearLocalStorage();
                console.log('✅ localStorage cleared after migration');
            }
            
            return true;
        } catch (error) {
            console.error('Migration failed:', error);
            return false;
        }
    }

    // Clear localStorage vocabulary data
    clearLocalStorage() {
        const keys = [
            'vocabularyWords',
            'vocabularyLessons',
            'currentLessonId',
            'quizProgress',
            'selectedPracticeLessons'
        ];
        
        keys.forEach(key => localStorage.removeItem(key));
    }

    // Ensure storage is ready
    async ensureReady() {
        if (!this.isReady) {
            await this.init();
        }
    }

    // Unified API methods - automatically route to appropriate storage

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

    async addWord(word) {
        await this.ensureReady();
        
        if (this.currentStorage === 'indexeddb') {
            return await this.indexedDBStorage.addWord(word);
        } else {
            const words = await this.getAllWords();
            words.push(word);
            await this.saveWords(words);
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
                await this.saveWords(words);
            }
        }
    }

    async deleteWord(id) {
        await this.ensureReady();
        
        if (this.currentStorage === 'indexeddb') {
            return await this.indexedDBStorage.deleteWord(id);
        } else {
            const words = await this.getAllWords();
            const filteredWords = words.filter(w => w.id !== id);
            await this.saveWords(filteredWords);
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

    async saveLessons(lessons) {
        await this.ensureReady();
        
        if (this.currentStorage === 'indexeddb') {
            // Clear existing lessons and add new ones
            const transaction = this.indexedDBStorage.db.transaction(['lessons'], 'readwrite');
            const store = transaction.objectStore('lessons');
            await store.clear();
            
            for (const lesson of lessons) {
                await this.indexedDBStorage.addLesson(lesson);
            }
        } else {
            localStorage.setItem('vocabularyLessons', JSON.stringify(lessons));
        }
    }

    async addLesson(lesson) {
        await this.ensureReady();
        
        if (this.currentStorage === 'indexeddb') {
            return await this.indexedDBStorage.addLesson(lesson);
        } else {
            const lessons = await this.getAllLessons();
            lessons.push(lesson);
            await this.saveLessons(lessons);
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
                await this.saveLessons(lessons);
            }
        }
    }

    async deleteLesson(id) {
        await this.ensureReady();
        
        if (this.currentStorage === 'indexeddb') {
            return await this.indexedDBStorage.deleteLesson(id);
        } else {
            const lessons = await this.getAllLessons();
            const filteredLessons = lessons.filter(l => l.id !== id);
            await this.saveLessons(filteredLessons);
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
            supportsIndexedDB: this.supportsIndexedDB()
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

    // Cleanup
    close() {
        if (this.indexedDBStorage) {
            this.indexedDBStorage.close();
        }
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageAdapter;
} else if (typeof window !== 'undefined') {
    window.StorageAdapter = StorageAdapter;
} 
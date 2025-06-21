/**
 * Migration Script: localStorage → IndexedDB
 * Safely transfers all vocabulary app data with backup capabilities
 */
class DataMigration {
    constructor() {
        this.indexedDBStorage = null;
        this.migrationStatus = {
            completed: false,
            progress: 0,
            errors: [],
            backupCreated: false
        };
    }

    async init() {
        if (!IndexedDBStorage.isSupported()) {
            throw new Error('IndexedDB is not supported in this browser');
        }

        this.indexedDBStorage = new IndexedDBStorage();
        await this.indexedDBStorage.init();
        
        console.log('🔄 Migration system initialized');
        return true;
    }

    /**
     * Check if migration is needed
     */
    hasLocalStorageData() {
        const keys = [
            'vocabularyWords',
            'vocabularyLessons', 
            'quizProgress',
            'currentLessonId',
            'selectedPracticeLessons'
        ];
        
        return keys.some(key => localStorage.getItem(key) !== null);
    }

    /**
     * Check if IndexedDB already has data
     */
    async hasIndexedDBData() {
        try {
            const words = await this.indexedDBStorage.getAllWords();
            const lessons = await this.indexedDBStorage.getAllLessons();
            return words.length > 0 || lessons.length > 0;
        } catch (error) {
            console.warn('Error checking IndexedDB data:', error);
            return false;
        }
    }

    /**
     * Get localStorage data for migration
     */
    getLocalStorageData() {
        const data = {};
        
        try {
            // Get words
            const wordsData = localStorage.getItem('vocabularyWords');
            data.words = wordsData ? JSON.parse(wordsData) : [];

            // Get lessons  
            const lessonsData = localStorage.getItem('vocabularyLessons');
            data.lessons = lessonsData ? JSON.parse(lessonsData) : [];

            // Get progress
            const progressData = localStorage.getItem('quizProgress');
            data.progress = progressData ? JSON.parse(progressData) : null;

            // Get settings
            data.settings = {};
            const currentLessonId = localStorage.getItem('currentLessonId');
            if (currentLessonId) {
                data.settings.currentLessonId = currentLessonId;
            }

            const practiceLessonsData = localStorage.getItem('selectedPracticeLessons');
            if (practiceLessonsData) {
                data.settings.selectedPracticeLessons = JSON.parse(practiceLessonsData);
            }

            return data;
        } catch (error) {
            console.error('Error reading localStorage data:', error);
            throw new Error('Failed to read localStorage data: ' + error.message);
        }
    }

    /**
     * Create JSON backup of localStorage data
     */
    createLocalStorageBackup() {
        try {
            const data = this.getLocalStorageData();
            const backup = {
                timestamp: new Date().toISOString(),
                source: 'localStorage',
                data: data,
                note: 'Backup created before migration to IndexedDB'
            };

            const blob = new Blob([JSON.stringify(backup, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `vocabulary-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.migrationStatus.backupCreated = true;
            console.log('📦 localStorage backup created and downloaded');
            return true;
        } catch (error) {
            console.error('Backup creation failed:', error);
            this.migrationStatus.errors.push('Backup creation failed: ' + error.message);
            return false;
        }
    }

    /**
     * Perform the actual migration
     */
    async migrate(options = {}) {
        const {
            createBackup = true,
            clearLocalStorage = false,
            overwriteExisting = false
        } = options;

        try {
            console.log('🚀 Starting data migration...');
            this.migrationStatus.progress = 10;

            // Check if migration is needed
            if (!this.hasLocalStorageData()) {
                console.log('ℹ️ No localStorage data found, migration not needed');
                return { success: true, message: 'No data to migrate' };
            }

            // Check for existing IndexedDB data
            const hasExistingData = await this.hasIndexedDBData();
            if (hasExistingData && !overwriteExisting) {
                console.log('⚠️ IndexedDB already has data');
                return { 
                    success: false, 
                    message: 'IndexedDB already contains data. Use overwriteExisting option to proceed.' 
                };
            }

            // Create backup
            if (createBackup) {
                this.createLocalStorageBackup();
                this.migrationStatus.progress = 20;
            }

            // Get localStorage data
            const data = this.getLocalStorageData();
            this.migrationStatus.progress = 30;

            // Migrate lessons first (words depend on lessons)
            if (data.lessons && data.lessons.length > 0) {
                console.log(`📚 Migrating ${data.lessons.length} lessons...`);
                for (const lesson of data.lessons) {
                    await this.indexedDBStorage.addLesson(lesson);
                }
                this.migrationStatus.progress = 50;
            }

            // Migrate words
            if (data.words && data.words.length > 0) {
                console.log(`📝 Migrating ${data.words.length} words...`);
                for (const word of data.words) {
                    await this.indexedDBStorage.addWord(word);
                }
                this.migrationStatus.progress = 70;
            }

            // Migrate progress
            if (data.progress) {
                console.log('📊 Migrating quiz progress...');
                await this.indexedDBStorage.saveProgress('quiz', data.progress);
                this.migrationStatus.progress = 80;
            }

            // Migrate settings
            if (data.settings && Object.keys(data.settings).length > 0) {
                console.log('⚙️ Migrating settings...');
                for (const [key, value] of Object.entries(data.settings)) {
                    await this.indexedDBStorage.saveSetting(key, value);
                }
                this.migrationStatus.progress = 90;
            }

            // Create IndexedDB backup of migrated data
            await this.indexedDBStorage.createBackup('Post-migration backup');

            // Clear localStorage if requested
            if (clearLocalStorage) {
                this.clearLocalStorage();
                console.log('🧹 localStorage cleared');
            }

            this.migrationStatus.progress = 100;
            this.migrationStatus.completed = true;

            console.log('✅ Migration completed successfully!');
            return { 
                success: true, 
                message: 'Migration completed successfully',
                stats: {
                    words: data.words?.length || 0,
                    lessons: data.lessons?.length || 0,
                    hasProgress: !!data.progress,
                    settingsCount: Object.keys(data.settings || {}).length
                }
            };

        } catch (error) {
            console.error('❌ Migration failed:', error);
            this.migrationStatus.errors.push(error.message);
            
            return { 
                success: false, 
                message: 'Migration failed: ' + error.message,
                errors: this.migrationStatus.errors
            };
        }
    }

    /**
     * Clear localStorage data
     */
    clearLocalStorage() {
        const keys = [
            'vocabularyWords',
            'vocabularyLessons',
            'quizProgress', 
            'currentLessonId',
            'selectedPracticeLessons'
        ];

        keys.forEach(key => {
            localStorage.removeItem(key);
        });

        console.log('🧹 localStorage data cleared');
    }

    /**
     * Verify migration integrity
     */
    async verifyMigration() {
        try {
            const localData = this.getLocalStorageData();
            const indexedWords = await this.indexedDBStorage.getAllWords();
            const indexedLessons = await this.indexedDBStorage.getAllLessons();
            const indexedProgress = await this.indexedDBStorage.getProgress('quiz');

            const verification = {
                words: {
                    localStorage: localData.words?.length || 0,
                    indexedDB: indexedWords.length,
                    match: (localData.words?.length || 0) === indexedWords.length
                },
                lessons: {
                    localStorage: localData.lessons?.length || 0,
                    indexedDB: indexedLessons.length,
                    match: (localData.lessons?.length || 0) === indexedLessons.length
                },
                progress: {
                    localStorage: !!localData.progress,
                    indexedDB: !!indexedProgress,
                    match: !!localData.progress === !!indexedProgress
                }
            };

            const allMatch = verification.words.match && 
                           verification.lessons.match && 
                           verification.progress.match;

            console.log('🔍 Migration verification:', verification);
            return { success: allMatch, details: verification };

        } catch (error) {
            console.error('Verification failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get migration status
     */
    getStatus() {
        return { ...this.migrationStatus };
    }

    /**
     * Reset migration status
     */
    resetStatus() {
        this.migrationStatus = {
            completed: false,
            progress: 0,
            errors: [],
            backupCreated: false
        };
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataMigration;
} else if (typeof window !== 'undefined') {
    window.DataMigration = DataMigration;
} 
// Centralized Storage Management
class StorageManager {
    constructor() {
        this.keys = {
            WORDS: 'vocabularyWords',
            LESSONS: 'vocabularyLessons',
            CURRENT_LESSON: 'currentLessonId',
            QUIZ_PROGRESS: 'quizProgress',
            PRACTICE_SETTINGS: 'practiceSettings',
            SELECTED_PRACTICE_LESSONS: 'selectedPracticeLessons'
        };
    }

    // Generic storage methods
    get(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error(`Error getting data for key ${key}:`, error);
            return defaultValue;
        }
    }

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error setting data for key ${key}:`, error);
            return false;
        }
    }

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Error removing key ${key}:`, error);
            return false;
        }
    }

    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }

    // Specific data methods
    getWords() {
        return this.get(this.keys.WORDS, []);
    }

    saveWords(words) {
        return this.set(this.keys.WORDS, words);
    }

    getLessons() {
        return this.get(this.keys.LESSONS, []);
    }

    saveLessons(lessons) {
        return this.set(this.keys.LESSONS, lessons);
    }

    getCurrentLessonId() {
        return this.get(this.keys.CURRENT_LESSON, null);
    }

    setCurrentLessonId(lessonId) {
        return this.set(this.keys.CURRENT_LESSON, lessonId);
    }

    getQuizProgress() {
        return this.get(this.keys.QUIZ_PROGRESS, {
            totalQuestions: 0,
            correctAnswers: 0,
            totalWords: 0,
            learnedWords: []
        });
    }

    saveQuizProgress(progress) {
        return this.set(this.keys.QUIZ_PROGRESS, progress);
    }

    getPracticeSettings() {
        return this.get(this.keys.PRACTICE_SETTINGS, {});
    }

    savePracticeSettings(settings) {
        return this.set(this.keys.PRACTICE_SETTINGS, settings);
    }

    getSelectedPracticeLessons() {
        return this.get(this.keys.SELECTED_PRACTICE_LESSONS, {});
    }

    saveSelectedPracticeLessons(selections) {
        return this.set(this.keys.SELECTED_PRACTICE_LESSONS, selections);
    }

    // Backup and restore
    exportData() {
        return {
            words: this.getWords(),
            lessons: this.getLessons(),
            progress: this.getQuizProgress(),
            settings: this.getPracticeSettings(),
            exportDate: new Date().toISOString()
        };
    }

    importData(data) {
        try {
            if (data.words) this.saveWords(data.words);
            if (data.lessons) this.saveLessons(data.lessons);
            if (data.progress) this.saveQuizProgress(data.progress);
            if (data.settings) this.savePracticeSettings(data.settings);
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }
}

export { StorageManager }; 
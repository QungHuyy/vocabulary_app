// Main App Entry Point
import { StorageManager } from './core/storage.js';
import { EventBus } from './core/eventBus.js';
import { LessonManager } from './modules/LessonManager.js';
import { WordManager } from './modules/WordManager.js';
import { StatManager } from './modules/StatManager.js';
import { TabManager } from './ui/TabManager.js';
import { Toast } from './ui/Toast.js';
import { Modal } from './ui/Modal.js';

// Practice Modes
import { Flashcards } from './practice/Flashcards.js';
import { Quiz } from './practice/Quiz.js';
import { SpellingTest } from './practice/SpellingTest.js';
import { MatchingGame } from './practice/MatchingGame.js';
import { SpeedChallenge } from './practice/SpeedChallenge.js';
import { ListeningPractice } from './practice/ListeningPractice.js';

// Utils
import { SpeechManager } from './utils/speech.js';
import { AutocompleteManager } from './utils/autocomplete.js';
import { TranslationManager } from './utils/translation.js';

class VocabularyApp {
    constructor() {
        this.initializeCore();
        this.initializeModules();
        this.initializePracticeModes();
        this.initializeUI();
        this.setupEventListeners();
    }

    initializeCore() {
        this.storage = new StorageManager();
        this.eventBus = new EventBus();
        this.speech = new SpeechManager();
    }

    initializeModules() {
        this.lessonManager = new LessonManager(this.storage, this.eventBus);
        this.wordManager = new WordManager(this.storage, this.eventBus);
        this.statManager = new StatManager(this.storage, this.eventBus);
    }

    initializePracticeModes() {
        this.practiceManager = {
            flashcards: new Flashcards(this.wordManager, this.speech, this.eventBus),
            quiz: new Quiz(this.wordManager, this.speech, this.eventBus),
            spelling: new SpellingTest(this.wordManager, this.speech, this.eventBus),
            matching: new MatchingGame(this.wordManager, this.speech, this.eventBus),
            speed: new SpeedChallenge(this.wordManager, this.speech, this.eventBus),
            listening: new ListeningPractice(this.wordManager, this.speech, this.eventBus)
        };
    }

    initializeUI() {
        this.tabManager = new TabManager(this.eventBus);
        this.toast = new Toast();
        this.modal = new Modal();
        this.autocomplete = new AutocompleteManager();
        this.translation = new TranslationManager();
    }

    setupEventListeners() {
        // Global event listeners
        this.eventBus.on('word:added', () => this.statManager.updateStats());
        this.eventBus.on('lesson:created', () => this.statManager.updateStats());
        this.eventBus.on('practice:completed', (data) => this.statManager.recordPractice(data));
        
        // Initialize sample data if needed
        if (this.lessonManager.getLessons().length === 0) {
            this.loadSampleData();
        }
    }

    loadSampleData() {
        // Sample data loading logic
        this.lessonManager.createSampleLessons();
        this.wordManager.createSampleWords();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VocabularyApp();
});

export default VocabularyApp; 
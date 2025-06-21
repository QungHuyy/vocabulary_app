// Flashcards Practice Mode
class Flashcards {
    constructor(wordManager, speechManager, eventBus) {
        this.wordManager = wordManager;
        this.speech = speechManager;
        this.eventBus = eventBus;
        this.currentSession = null;
        this.keyHandler = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.eventBus.on('flashcards:start', (selectedLessons) => {
            this.startSession(selectedLessons);
        });

        this.eventBus.on('flashcards:stop', () => {
            this.stopSession();
        });
    }

    startSession(selectedLessons) {
        const words = this.wordManager.getWordsFromLessons(selectedLessons);
        
        if (words.length === 0) {
            this.eventBus.emit('toast:show', {
                message: 'Vui lòng chọn ít nhất một bài học để luyện tập!',
                type: 'error'
            });
            return;
        }

        this.currentSession = {
            words: this.shuffleArray([...words]),
            currentIndex: 0,
            isFlipped: false,
            rememberedWords: new Set(),
            notRememberedWords: new Set(),
            isReviewingForgotten: false,
            forgottenWords: []
        };

        this.setupKeyboardListeners();
        this.renderCard();
        this.eventBus.emit('ui:showPracticeContent', 'flashcards');
    }

    setupKeyboardListeners() {
        this.removeKeyboardListeners();
        
        this.keyHandler = (e) => {
            if (!this.currentSession) return;
            
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.flipCard();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.markAsNotRemembered();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.markAsRemembered();
                    break;
            }
        };
        
        document.addEventListener('keydown', this.keyHandler);
    }

    removeKeyboardListeners() {
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
            this.keyHandler = null;
        }
    }

    renderCard() {
        const container = document.getElementById('flashcardsContent');
        const currentWord = this.currentSession.words[this.currentSession.currentIndex];
        
        const frontText = currentWord.english;
        const backText = currentWord.vietnamese;
        
        container.innerHTML = `
            <div class="flashcard-progress">
                ${this.currentSession.currentIndex + 1} / ${this.currentSession.words.length}
                ${this.currentSession.isReviewingForgotten ? ' (Ôn tập từ chưa nhớ)' : ''}
            </div>
            
            <div class="flashcard-instructions">
                <p><strong>Phím tắt:</strong> SPACE (lật thẻ) | ← (chưa nhớ) | → (đã nhớ)</p>
            </div>
            
            <div class="flashcard ${this.currentSession.isFlipped ? 'flipped' : ''}" onclick="app.practiceManager.flashcards.flipCard()">
                <div class="flashcard-front">
                    <div class="flashcard-word">${frontText}</div>
                    <button class="pronunciation-btn" onclick="event.stopPropagation(); app.practiceManager.flashcards.pronounceEnglishOnly('${currentWord.english}')" title="Phát âm tiếng Anh">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
                <div class="flashcard-back">
                    <div class="flashcard-meaning">${backText}</div>
                    ${currentWord.example ? `<p style="margin-top: 15px; font-size: 1rem; font-style: italic;">${currentWord.example}</p>` : ''}
                </div>
            </div>
            
            <div class="flashcard-status">
                <p>Đã nhớ: ${this.currentSession.rememberedWords.size} | Chưa nhớ: ${this.currentSession.notRememberedWords.size}</p>
            </div>
        `;
        
        // Auto-pronounce English word ONLY
        if (!this.currentSession.isFlipped) {
            setTimeout(() => {
                this.pronounceEnglishOnly(currentWord.english);
            }, 500);
        }
    }

    flipCard() {
        if (!this.currentSession) return;
        this.currentSession.isFlipped = !this.currentSession.isFlipped;
        this.renderCard();
    }

    markAsRemembered() {
        const currentWord = this.currentSession.words[this.currentSession.currentIndex];
        this.currentSession.rememberedWords.add(currentWord.id);
        this.currentSession.notRememberedWords.delete(currentWord.id);
        this.nextCard();
    }

    markAsNotRemembered() {
        const currentWord = this.currentSession.words[this.currentSession.currentIndex];
        this.currentSession.notRememberedWords.add(currentWord.id);
        this.currentSession.rememberedWords.delete(currentWord.id);
        this.nextCard();
    }

    nextCard() {
        if (this.currentSession.currentIndex < this.currentSession.words.length - 1) {
            this.currentSession.currentIndex++;
            this.currentSession.isFlipped = false;
            this.renderCard();
        } else {
            if (!this.currentSession.isReviewingForgotten && this.currentSession.notRememberedWords.size > 0) {
                this.startForgottenReview();
            } else {
                this.finishSession();
            }
        }
    }

    startForgottenReview() {
        this.currentSession.forgottenWords = this.currentSession.words.filter(word => 
            this.currentSession.notRememberedWords.has(word.id)
        );
        
        if (this.currentSession.forgottenWords.length === 0) {
            this.finishSession();
            return;
        }
        
        this.currentSession.words = this.shuffleArray(this.currentSession.forgottenWords);
        this.currentSession.currentIndex = 0;
        this.currentSession.isFlipped = false;
        this.currentSession.isReviewingForgotten = true;
        
        this.renderCard();
        this.eventBus.emit('toast:show', {
            message: 'Bắt đầu ôn tập các từ chưa nhớ!',
            type: 'info'
        });
    }

    finishSession() {
        this.removeKeyboardListeners();
        
        const totalWords = this.currentSession.isReviewingForgotten ? 
            this.currentSession.forgottenWords.length : 
            [...new Set([...Array.from(this.currentSession.rememberedWords), ...Array.from(this.currentSession.notRememberedWords)])].length;
        
        const rememberedCount = this.currentSession.rememberedWords.size;
        const notRememberedCount = this.currentSession.notRememberedWords.size;
        
        this.eventBus.emit('practice:completed', {
            mode: 'flashcards',
            totalWords,
            rememberedCount,
            notRememberedCount,
            accuracy: totalWords > 0 ? Math.round((rememberedCount / totalWords) * 100) : 0
        });

        this.renderResults(totalWords, rememberedCount, notRememberedCount);
    }

    renderResults(totalWords, rememberedCount, notRememberedCount) {
        const container = document.getElementById('flashcardsContent');
        container.innerHTML = `
            <div class="practice-result">
                <h3><i class="fas fa-check-circle" style="color: #28a745;"></i> Hoàn thành Flashcards!</h3>
                <div class="flashcard-summary">
                    <p><strong>Tổng số từ:</strong> ${totalWords}</p>
                    <p><strong>Đã nhớ:</strong> ${rememberedCount} từ</p>
                    <p><strong>Chưa nhớ:</strong> ${notRememberedCount} từ</p>
                    <p><strong>Tỷ lệ nhớ:</strong> ${totalWords > 0 ? Math.round((rememberedCount / totalWords) * 100) : 0}%</p>
                </div>
                <button class="btn btn-primary" onclick="app.practiceManager.flashcards.restart()">
                    <i class="fas fa-redo"></i> Luyện lại
                </button>
                <button class="btn btn-secondary" onclick="app.practiceManager.flashcards.backToModes()">
                    <i class="fas fa-arrow-left"></i> Chọn chế độ khác
                </button>
            </div>
        `;
    }

    stopSession() {
        this.removeKeyboardListeners();
        this.currentSession = null;
    }

    restart() {
        if (this.currentSession) {
            const originalWords = [...this.currentSession.words];
            this.currentSession = {
                words: this.shuffleArray(originalWords),
                currentIndex: 0,
                isFlipped: false,
                rememberedWords: new Set(),
                notRememberedWords: new Set(),
                isReviewingForgotten: false,
                forgottenWords: []
            };
            this.renderCard();
        }
    }

    backToModes() {
        this.stopSession();
        this.eventBus.emit('ui:backToModeSelector');
    }

    pronounce(text) {
        // Only pronounce English text
        this.speech.pronounceEnglish(text);
    }

    pronounceEnglishOnly(englishWord) {
        // Ensure we only speak English words
        this.speech.pronounceEnglish(englishWord);
    }

    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }
}

export { Flashcards }; 
// Spelling Test Practice Mode - English pronunciation only
class SpellingTest {
    constructor(wordManager, speechManager, eventBus) {
        this.wordManager = wordManager;
        this.speech = speechManager;
        this.eventBus = eventBus;
        this.currentTest = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.eventBus.on('spelling:start', (config) => {
            this.startTest(config);
        });

        this.eventBus.on('spelling:stop', () => {
            this.stopTest();
        });
    }

    startTest(config) {
        const { selectedLessons, length } = config;
        const words = this.wordManager.getWordsFromLessons(selectedLessons);
        
        if (words.length === 0) {
            this.eventBus.emit('toast:show', {
                message: 'Vui lòng chọn ít nhất một bài học để luyện tập!',
                type: 'error'
            });
            return;
        }

        const shuffledWords = this.shuffleArray([...words]);
        const testWords = shuffledWords.slice(0, Math.min(length, words.length));
        
        this.currentTest = {
            words: testWords,
            currentIndex: 0,
            correctAnswers: 0,
            userAnswers: []
        };

        this.renderQuestion();
    }

    renderQuestion() {
        const container = document.getElementById('spellingContent');
        const currentWord = this.currentTest.words[this.currentTest.currentIndex];
        
        // Determine question type randomly for each word
        if (!currentWord.spellingType) {
            currentWord.spellingType = Math.random() < 0.5 ? 'en-spell' : 'vi-spell';
        }
        
        const isEnSpell = currentWord.spellingType === 'en-spell';
        let questionText, audioWord, hintText, placeholder, correctAnswer;
        
        if (isEnSpell) {
            questionText = 'Nghe từ tiếng Anh và viết chính tả:';
            audioWord = currentWord.english;
            hintText = `Nghĩa: ${currentWord.vietnamese}`;
            placeholder = 'Nhập từ tiếng Anh...';
            correctAnswer = currentWord.english;
        } else {
            questionText = 'Nghe nghĩa tiếng Việt và viết từ tiếng Anh:';
            audioWord = currentWord.vietnamese; // Note: we won't actually speak this
            hintText = `Nghĩa tiếng Việt: ${currentWord.vietnamese}`;
            placeholder = 'Nhập từ tiếng Anh...';
            correctAnswer = currentWord.english;
        }
        
        container.innerHTML = `
            <div class="spelling-progress">
                <p>Câu ${this.currentTest.currentIndex + 1} / ${this.currentTest.words.length}</p>
            </div>
            
            <div class="spelling-question">
                <p>${questionText}</p>
                <div class="spelling-audio-container">
                    ${isEnSpell ? `
                        <button class="listening-audio-btn" onclick="app.practiceManager.spelling.pronounceEnglishOnly('${currentWord.english}')" title="Nghe từ tiếng Anh">
                            <i class="fas fa-volume-up"></i> Nghe từ tiếng Anh
                        </button>
                    ` : `
                        <div class="spelling-hint-text">${hintText}</div>
                        <button class="listening-audio-btn" onclick="app.practiceManager.spelling.pronounceEnglishOnly('${currentWord.english}')" title="Gợi ý phát âm">
                            <i class="fas fa-volume-up"></i> Gợi ý phát âm
                        </button>
                    `}
                </div>
                ${isEnSpell ? `<p style="color: #666; margin-bottom: 20px;">${hintText}</p>` : ''}
                <input type="text" class="spelling-input" id="spellingInput" placeholder="${placeholder}" onkeypress="app.practiceManager.spelling.handleKeyPress(event)">
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
                <button class="btn btn-primary" onclick="app.practiceManager.spelling.checkAnswer()">
                    <i class="fas fa-check"></i> Kiểm tra
                </button>
            </div>
        `;
        
        document.getElementById('spellingInput').focus();
        
        // Auto play only if it's English spelling
        if (isEnSpell) {
            setTimeout(() => {
                this.pronounceEnglishOnly(currentWord.english);
            }, 500);
        }
    }

    handleKeyPress(event) {
        if (event.key === 'Enter') {
            this.checkAnswer();
        }
    }

    checkAnswer() {
        const input = document.getElementById('spellingInput');
        const userAnswer = input.value.trim().toLowerCase();
        const correctAnswer = this.currentTest.words[this.currentTest.currentIndex].english.toLowerCase();
        
        const isCorrect = userAnswer === correctAnswer;
        this.currentTest.userAnswers.push({
            word: this.currentTest.words[this.currentTest.currentIndex],
            userAnswer: input.value.trim(),
            correct: isCorrect
        });
        
        if (isCorrect) {
            this.currentTest.correctAnswers++;
            input.classList.add('correct');
            input.classList.remove('incorrect');
        } else {
            input.classList.add('incorrect');
            input.classList.remove('correct');
        }
        
        setTimeout(() => {
            if (this.currentTest.currentIndex < this.currentTest.words.length - 1) {
                this.currentTest.currentIndex++;
                this.renderQuestion();
            } else {
                this.finishTest();
            }
        }, 1500);
    }

    finishTest() {
        const accuracy = Math.round((this.currentTest.correctAnswers / this.currentTest.words.length) * 100);
        
        this.eventBus.emit('practice:completed', {
            mode: 'spelling',
            totalQuestions: this.currentTest.words.length,
            correctAnswers: this.currentTest.correctAnswers,
            accuracy: accuracy
        });

        const container = document.getElementById('spellingContent');
        
        let resultHtml = `
            <div class="practice-result">
                <h3><i class="fas fa-spell-check" style="color: #4facfe;"></i> Kết quả Spelling Test</h3>
                <div class="quiz-score">${accuracy}%</div>
                <p>Đúng ${this.currentTest.correctAnswers} / ${this.currentTest.words.length} từ</p>
                
                <div style="margin-top: 20px; text-align: left;">
                    <h4>Chi tiết:</h4>
        `;
        
        this.currentTest.userAnswers.forEach(answer => {
            const icon = answer.correct ? 
                '<i class="fas fa-check-circle" style="color: #28a745;"></i>' : 
                '<i class="fas fa-times-circle" style="color: #dc3545;"></i>';
            
            resultHtml += `
                <div style="margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 8px;">
                    ${icon} <strong>${answer.word.english}</strong> - ${answer.word.vietnamese}
                    ${!answer.correct ? `<br><span style="color: #dc3545;">Bạn viết: ${answer.userAnswer}</span>` : ''}
                </div>
            `;
        });
        
        resultHtml += `
                </div>
                
                <div style="margin-top: 20px;">
                    <button class="btn btn-primary" onclick="app.practiceManager.spelling.restart()">
                        <i class="fas fa-redo"></i> Luyện lại
                    </button>
                    <button class="btn btn-secondary" onclick="app.practiceManager.spelling.backToModes()">
                        <i class="fas fa-arrow-left"></i> Chọn chế độ khác
                    </button>
                </div>
            </div>
        `;
        
        container.innerHTML = resultHtml;
    }

    stopTest() {
        this.currentTest = null;
    }

    restart() {
        if (this.currentTest) {
            const originalWords = [...this.currentTest.words];
            this.currentTest = {
                words: this.shuffleArray(originalWords),
                currentIndex: 0,
                correctAnswers: 0,
                userAnswers: []
            };
            this.renderQuestion();
        }
    }

    backToModes() {
        this.stopTest();
        this.eventBus.emit('ui:backToModeSelector');
    }

    pronounceEnglishOnly(englishWord) {
        // Only pronounce English words - never Vietnamese
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

export { SpellingTest }; 
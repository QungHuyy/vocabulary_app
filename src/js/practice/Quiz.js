// Quiz Practice Mode - English pronunciation only
class Quiz {
    constructor(wordManager, speechManager, eventBus) {
        this.wordManager = wordManager;
        this.speech = speechManager;
        this.eventBus = eventBus;
        this.currentQuiz = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.eventBus.on('quiz:start', (config) => {
            this.startQuiz(config);
        });

        this.eventBus.on('quiz:stop', () => {
            this.stopQuiz();
        });
    }

    startQuiz(config) {
        const { selectedLessons, length, mode } = config;
        const words = this.wordManager.getWordsFromLessons(selectedLessons);
        
        if (words.length < 4) {
            this.eventBus.emit('toast:show', {
                message: 'Cần ít nhất 4 từ vựng để bắt đầu quiz!',
                type: 'error'
            });
            return;
        }

        const shuffledWords = this.shuffleArray([...words]);
        const quizWords = shuffledWords.slice(0, Math.min(length, words.length));
        
        this.currentQuiz = {
            words: quizWords,
            currentIndex: 0,
            score: 0,
            mode: mode,
            userAnswers: []
        };

        this.renderQuestion();
    }

    renderQuestion() {
        const quiz = this.currentQuiz;
        const currentWord = quiz.words[quiz.currentIndex];
        const container = document.getElementById('quizContent');
        
        // Determine question type based on mode
        let questionText, correctAnswer, questionType, isEnglishQuestion;
        
        if (quiz.mode === 'en-to-vi' || (quiz.mode === 'mixed' && Math.random() < 0.5)) {
            questionText = currentWord.english;
            correctAnswer = currentWord.vietnamese;
            questionType = 'Dịch từ tiếng Anh sang tiếng Việt';
            isEnglishQuestion = true;
        } else {
            questionText = currentWord.vietnamese;
            correctAnswer = currentWord.english;
            questionType = 'Dịch từ tiếng Việt sang tiếng Anh';
            isEnglishQuestion = false;
        }

        // Generate wrong answers
        const wrongAnswers = this.generateWrongAnswers(correctAnswer, !isEnglishQuestion);
        const options = [correctAnswer, ...wrongAnswers];
        this.shuffleArray(options);

        container.innerHTML = `
            <div class="quiz-question">
                <div class="quiz-word-audio">
                    <div class="question-text">${questionText}</div>
                    ${isEnglishQuestion ? `
                        <button class="pronunciation-btn" onclick="app.practiceManager.quiz.pronounceEnglishOnly('${currentWord.english}')" title="Phát âm tiếng Anh">
                            <i class="fas fa-volume-up"></i>
                        </button>
                    ` : ''}
                </div>
                <div class="question-type">${questionType}</div>
            </div>
            <div class="quiz-options">
                ${options.map(option => `
                    <div class="quiz-option" onclick="app.practiceManager.quiz.selectOption(this, '${option}', '${correctAnswer}')">
                        ${option}
                    </div>
                `).join('')}
            </div>
            <div style="text-align: center; margin-top: 20px;">
                <span>Câu ${quiz.currentIndex + 1}/${quiz.words.length}</span>
            </div>
        `;

        // Auto-pronounce English if it's an English question
        if (isEnglishQuestion) {
            setTimeout(() => {
                this.pronounceEnglishOnly(currentWord.english);
            }, 500);
        }
    }

    generateWrongAnswers(correctAnswer, isVietnamese) {
        const allWords = this.wordManager.getAllWords();
        const allAnswers = allWords.map(word => isVietnamese ? word.vietnamese : word.english);
        const wrongAnswers = allAnswers.filter(answer => answer !== correctAnswer);
        
        return this.shuffleArray(wrongAnswers).slice(0, 3);
    }

    selectOption(element, selectedAnswer, correctAnswer) {
        // Disable all options
        document.querySelectorAll('.quiz-option').forEach(option => {
            option.style.pointerEvents = 'none';
            if (option.textContent.trim() === correctAnswer) {
                option.classList.add('correct');
            } else if (option === element && selectedAnswer !== correctAnswer) {
                option.classList.add('incorrect');
            }
        });

        // Record answer
        const isCorrect = selectedAnswer === correctAnswer;
        const currentWord = this.currentQuiz.words[this.currentQuiz.currentIndex];
        
        this.currentQuiz.userAnswers.push({
            word: currentWord,
            selectedAnswer,
            correctAnswer,
            isCorrect
        });

        if (isCorrect) {
            this.currentQuiz.score++;
        }

        // Show next question or finish
        setTimeout(() => {
            this.currentQuiz.currentIndex++;
            if (this.currentQuiz.currentIndex < this.currentQuiz.words.length) {
                this.renderQuestion();
            } else {
                this.finishQuiz();
            }
        }, 1500);
    }

    finishQuiz() {
        const quiz = this.currentQuiz;
        const scorePercentage = Math.round((quiz.score / quiz.words.length) * 100);
        
        this.eventBus.emit('practice:completed', {
            mode: 'quiz',
            totalQuestions: quiz.words.length,
            correctAnswers: quiz.score,
            accuracy: scorePercentage
        });

        let feedback = '';
        if (scorePercentage >= 90) feedback = 'Xuất sắc! 🎉';
        else if (scorePercentage >= 70) feedback = 'Rất tốt! 👍';
        else if (scorePercentage >= 50) feedback = 'Khá ổn! 👌';
        else feedback = 'Cần cố gắng thêm! 💪';

        const container = document.getElementById('quizContent');
        container.innerHTML = `
            <div class="practice-result">
                <h3><i class="fas fa-question-circle" style="color: #4facfe;"></i> Hoàn thành Quiz!</h3>
                <div class="quiz-score">${quiz.score}/${quiz.words.length}</div>
                <div class="quiz-feedback">${feedback}</div>
                <p>Độ chính xác: ${scorePercentage}%</p>
                
                <div style="margin-top: 20px;">
                    <button class="btn btn-primary" onclick="app.practiceManager.quiz.restart()">
                        <i class="fas fa-redo"></i> Làm lại
                    </button>
                    <button class="btn btn-secondary" onclick="app.practiceManager.quiz.backToModes()">
                        <i class="fas fa-arrow-left"></i> Chọn chế độ khác
                    </button>
                </div>
            </div>
        `;
    }

    stopQuiz() {
        this.currentQuiz = null;
    }

    restart() {
        if (this.currentQuiz) {
            const originalWords = [...this.currentQuiz.words];
            this.currentQuiz = {
                words: this.shuffleArray(originalWords),
                currentIndex: 0,
                score: 0,
                mode: this.currentQuiz.mode,
                userAnswers: []
            };
            this.renderQuestion();
        }
    }

    backToModes() {
        this.stopQuiz();
        this.eventBus.emit('ui:backToModeSelector');
    }

    pronounceEnglishOnly(englishWord) {
        // Only pronounce English words
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

export { Quiz }; 
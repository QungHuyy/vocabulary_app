class VocabularyApp {
    constructor() {
        this.lessons = JSON.parse(localStorage.getItem('vocabularyLessons')) || [];
        this.currentLessonId = localStorage.getItem('currentLessonId') || null;
        this.words = JSON.parse(localStorage.getItem('vocabularyWords')) || [];
        this.currentQuiz = null;
        this.quizProgress = JSON.parse(localStorage.getItem('quizProgress')) || {
            totalQuestions: 0,
            correctAnswers: 0,
            totalWords: 0,
            learnedWords: []
        };
        this.currentReviewIndex = 0;
        this.reviewWords = [];
        this.selectedReviewLessons = [];
        
        // Autocomplete and translation
        this.commonWords = [];
        this.currentSuggestionIndex = -1;
        this.translationTimeout = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateStats();
        this.renderWordsList();
        this.renderLessonsList();
        this.updateLessonSelectors();
        this.updateCurrentLessonDisplay();
        this.renderReviewLessonCheckboxes();
        
        // Load voices for speech synthesis
        this.loadVoices();
        
        // Initialize autocomplete and translation
        this.initializeCommonWords();
        this.setupAutocomplete();
        this.setupTranslation();
        
        // Load sample data if no lessons exist
        if (this.lessons.length === 0) {
            this.loadSampleData();
        }
    }

    loadSampleData() {
        // Create sample lessons
        const sampleLessons = [
            {
                id: 'lesson-1',
                name: 'Gia đình và bạn bè',
                description: 'Các từ vựng về gia đình và mối quan hệ',
                color: 'blue',
                createdDate: new Date().toISOString(),
                words: []
            },
            {
                id: 'lesson-2',
                name: 'Công việc và nghề nghiệp',
                description: 'Từ vựng liên quan đến công việc',
                color: 'green',
                createdDate: new Date().toISOString(),
                words: []
            },
            {
                id: 'lesson-3',
                name: 'Thực phẩm và đồ uống',
                description: 'Các từ về đồ ăn và thức uống',
                color: 'orange',
                createdDate: new Date().toISOString(),
                words: []
            }
        ];

        const sampleWords = [
            {
                id: Date.now() + Math.random(),
                english: 'family',
                vietnamese: 'gia đình',
                example: 'I love my family.',
                category: 'noun',
                lessonId: 'lesson-1',
                addedDate: new Date().toISOString(),
                reviewed: 0,
                lastReviewed: null
            },
            {
                id: Date.now() + Math.random() + 1,
                english: 'teacher',
                vietnamese: 'giáo viên',
                example: 'My teacher is very kind.',
                category: 'noun',
                lessonId: 'lesson-2',
                addedDate: new Date().toISOString(),
                reviewed: 0,
                lastReviewed: null
            },
            {
                id: Date.now() + Math.random() + 2,
                english: 'apple',
                vietnamese: 'quả táo',
                example: 'I eat an apple every day.',
                category: 'noun',
                lessonId: 'lesson-3',
                addedDate: new Date().toISOString(),
                reviewed: 0,
                lastReviewed: null
            }
        ];
        
        this.lessons = sampleLessons;
        this.words = sampleWords;
        this.currentLessonId = 'lesson-1';
        
        this.saveToStorage();
        this.updateStats();
        this.renderWordsList();
        this.renderLessonsList();
        this.updateLessonSelectors();
        this.updateCurrentLessonDisplay();
        this.renderReviewLessonCheckboxes();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Add word form
        document.getElementById('addWordForm').addEventListener('submit', (e) => this.addWord(e));
        
        // Add lesson form
        document.getElementById('addLessonForm').addEventListener('submit', (e) => this.addLesson(e));

        // Search and filter
        document.getElementById('searchWord').addEventListener('input', () => this.renderWordsList());
        document.getElementById('filterCategory').addEventListener('change', () => this.renderWordsList());
        document.getElementById('filterLesson').addEventListener('change', () => this.renderWordsList());

        // Quiz
        document.getElementById('startQuiz').addEventListener('click', () => this.startQuiz());

        // Review
        document.getElementById('startReview').addEventListener('click', () => this.startReview());
        document.getElementById('shuffleReview').addEventListener('click', () => this.shuffleReview());

        // Modal
        document.getElementById('cancelDelete').addEventListener('click', () => this.hideModal());
        document.getElementById('confirmDelete').addEventListener('click', () => this.confirmDelete());
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Refresh content if needed
        if (tabName === 'list') {
            this.renderWordsList();
        } else if (tabName === 'lessons') {
            this.renderLessonsList();
        } else if (tabName === 'review') {
            this.renderReviewLessonCheckboxes();
        }
    }

    addWord(e) {
        e.preventDefault();
        
        const englishWord = document.getElementById('englishWord').value.trim();
        const vietnameseMeaning = document.getElementById('vietnameseMeaning').value.trim();
        const example = document.getElementById('example').value.trim();
        const category = document.getElementById('category').value;
        const selectedLessonId = document.getElementById('selectedLesson').value;

        if (!englishWord || !vietnameseMeaning) {
            this.showMessage('Vui lòng nhập đầy đủ từ tiếng Anh và nghĩa tiếng Việt!', 'error');
            return;
        }

        if (!selectedLessonId) {
            this.showMessage('Vui lòng chọn bài học để thêm từ vựng!', 'error');
            return;
        }

        // Check if word already exists in the same lesson
        if (this.words.some(word => 
            word.english.toLowerCase() === englishWord.toLowerCase() && 
            word.lessonId === selectedLessonId)) {
            this.showMessage('Từ vựng này đã tồn tại trong bài học này!', 'error');
            return;
        }

        const newWord = {
            id: Date.now() + Math.random(),
            english: englishWord,
            vietnamese: vietnameseMeaning,
            example: example,
            category: category,
            lessonId: selectedLessonId,
            addedDate: new Date().toISOString(),
            reviewed: 0,
            lastReviewed: null
        };

        this.words.push(newWord);
        this.saveToStorage();
        this.updateStats();
        this.renderWordsList();
        this.renderLessonsList();
        
        // Reset form
        document.getElementById('addWordForm').reset();
        this.clearTranslation();
        this.showMessage('Đã thêm từ vựng thành công!', 'success');
    }

    addLesson(e) {
        e.preventDefault();
        
        const lessonName = document.getElementById('lessonName').value.trim();
        const lessonDescription = document.getElementById('lessonDescription').value.trim();
        const lessonColor = document.getElementById('lessonColor').value;

        if (!lessonName) {
            this.showMessage('Vui lòng nhập tên bài học!', 'error');
            return;
        }

        // Check if lesson name already exists
        if (this.lessons.some(lesson => lesson.name.toLowerCase() === lessonName.toLowerCase())) {
            this.showMessage('Tên bài học này đã tồn tại!', 'error');
            return;
        }

        const newLesson = {
            id: 'lesson-' + Date.now(),
            name: lessonName,
            description: lessonDescription,
            color: lessonColor,
            createdDate: new Date().toISOString(),
            words: []
        };

        this.lessons.push(newLesson);
        this.saveToStorage();
        this.renderLessonsList();
        this.updateLessonSelectors();
        this.renderReviewLessonCheckboxes();
        this.hideCreateLessonForm();
        
        this.showMessage('Đã tạo bài học thành công!', 'success');
    }

    renderWordsList() {
        const searchTerm = document.getElementById('searchWord').value.toLowerCase();
        const filterCategory = document.getElementById('filterCategory').value;
        const filterLesson = document.getElementById('filterLesson').value;
        
        let filteredWords = this.words.filter(word => {
            const matchesSearch = word.english.toLowerCase().includes(searchTerm) || 
                                 word.vietnamese.toLowerCase().includes(searchTerm);
            const matchesCategory = !filterCategory || word.category === filterCategory;
            const matchesLesson = !filterLesson || word.lessonId === filterLesson;
            return matchesSearch && matchesCategory && matchesLesson;
        });

        const wordsList = document.getElementById('wordsList');
        
        if (filteredWords.length === 0) {
            wordsList.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Không tìm thấy từ vựng nào.</p>';
            return;
        }

        wordsList.innerHTML = filteredWords.map(word => {
            const lesson = this.lessons.find(l => l.id === word.lessonId);
            const lessonName = lesson ? lesson.name : 'Không xác định';
            
            return `
            <div class="word-item">
                <div class="word-header-with-audio">
                    <div class="word-title-audio">
                        <span class="word-english">${word.english}</span>
                        <button class="pronunciation-btn" onclick="app.speakWord('${word.english}')" title="Phát âm">
                            <i class="fas fa-volume-up"></i>
                        </button>
                    </div>
                    <span class="word-category">${this.getCategoryName(word.category)}</span>
                </div>
                <div class="word-vietnamese">${word.vietnamese}</div>
                <div class="word-lesson">📚 ${lessonName}</div>
                ${word.example ? `<div class="word-example">"${word.example}"</div>` : ''}
                <div class="word-actions">
                    <button class="btn btn-small btn-warning" onclick="app.editWord('${word.id}')">
                        <i class="fas fa-edit"></i> Sửa
                    </button>
                    <button class="btn btn-small btn-danger" onclick="app.deleteWord('${word.id}')">
                        <i class="fas fa-trash"></i> Xóa
                    </button>
                </div>
            </div>
            `;
        }).join('');
    }

    getCategoryName(category) {
        const categories = {
            'general': 'Tổng quát',
            'adjective': 'Tính từ',
            'noun': 'Danh từ',
            'verb': 'Động từ',
            'adverb': 'Trạng từ'
        };
        return categories[category] || 'Tổng quát';
    }

    editWord(wordId) {
        const word = this.words.find(w => w.id == wordId);
        if (!word) return;

        // Fill form with word data
        document.getElementById('englishWord').value = word.english;
        document.getElementById('vietnameseMeaning').value = word.vietnamese;
        document.getElementById('example').value = word.example || '';
        document.getElementById('category').value = word.category;
        document.getElementById('selectedLesson').value = word.lessonId || '';

        // Remove the word from list (will be re-added when form is submitted)
        this.words = this.words.filter(w => w.id != wordId);
        this.saveToStorage();
        this.updateStats();
        this.renderWordsList();
        this.renderLessonsList();

        // Switch to add tab
        this.switchTab('add');
        this.showMessage('Đã tải thông tin từ vựng để chỉnh sửa', 'success');
    }

    deleteWord(wordId) {
        this.wordToDelete = wordId;
        this.showModal();
    }

    confirmDelete() {
        if (this.wordToDelete) {
            this.words = this.words.filter(w => w.id != this.wordToDelete);
            this.saveToStorage();
            this.updateStats();
            this.renderWordsList();
            this.renderLessonsList();
            this.hideModal();
            this.showMessage('Đã xóa từ vựng!', 'success');
            this.wordToDelete = null;
        }
    }

    showModal() {
        document.getElementById('deleteModal').classList.add('show');
    }

    hideModal() {
        document.getElementById('deleteModal').classList.remove('show');
    }

    // Lesson Management Methods
    renderLessonsList() {
        const lessonsList = document.getElementById('lessonsList');
        
        if (this.lessons.length === 0) {
            lessonsList.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Chưa có bài học nào. Hãy tạo bài học đầu tiên!</p>';
            return;
        }

        lessonsList.innerHTML = this.lessons.map(lesson => {
            const wordCount = this.words.filter(word => word.lessonId === lesson.id).length;
            const isActive = lesson.id === this.currentLessonId;
            
            return `
            <div class="lesson-card color-${lesson.color} ${isActive ? 'active' : ''}" onclick="app.selectLesson('${lesson.id}')">
                <div class="lesson-title">
                    <i class="fas fa-book"></i>
                    ${lesson.name}
                </div>
                ${lesson.description ? `<div class="lesson-description">${lesson.description}</div>` : ''}
                <div class="lesson-stats">
                    <span class="lesson-word-count">${wordCount} từ vựng</span>
                    <span class="lesson-progress">Tạo: ${new Date(lesson.createdDate).toLocaleDateString('vi-VN')}</span>
                </div>
                <div class="lesson-actions">
                    <button class="btn btn-small btn-primary" onclick="event.stopPropagation(); app.selectLesson('${lesson.id}')">
                        <i class="fas fa-play"></i> Chọn
                    </button>
                    <button class="btn btn-small btn-warning" onclick="event.stopPropagation(); app.editLesson('${lesson.id}')">
                        <i class="fas fa-edit"></i> Sửa
                    </button>
                    <button class="btn btn-small btn-danger" onclick="event.stopPropagation(); app.deleteLesson('${lesson.id}')">
                        <i class="fas fa-trash"></i> Xóa
                    </button>
                </div>
            </div>
            `;
        }).join('');
    }

    selectLesson(lessonId) {
        this.currentLessonId = lessonId;
        localStorage.setItem('currentLessonId', lessonId);
        this.renderLessonsList();
        this.updateCurrentLessonDisplay();
        this.updateLessonSelectors();
        this.showMessage('Đã chọn bài học!', 'success');
    }

    editLesson(lessonId) {
        const lesson = this.lessons.find(l => l.id === lessonId);
        if (!lesson) return;

        // Fill form with lesson data
        document.getElementById('lessonName').value = lesson.name;
        document.getElementById('lessonDescription').value = lesson.description || '';
        document.getElementById('lessonColor').value = lesson.color;

        // Remove the lesson from list (will be re-added when form is submitted)
        this.lessons = this.lessons.filter(l => l.id !== lessonId);
        this.saveToStorage();
        this.renderLessonsList();
        this.updateLessonSelectors();
        this.renderReviewLessonCheckboxes();

        // Show form
        this.showCreateLessonForm();
        this.showMessage('Đã tải thông tin bài học để chỉnh sửa', 'success');
    }

    deleteLesson(lessonId) {
        const lesson = this.lessons.find(l => l.id === lessonId);
        if (!lesson) return;

        const wordsInLesson = this.words.filter(word => word.lessonId === lessonId).length;
        if (wordsInLesson > 0) {
            if (!confirm(`Bài học "${lesson.name}" có ${wordsInLesson} từ vựng. Bạn có chắc chắn muốn xóa không? Tất cả từ vựng trong bài học cũng sẽ bị xóa.`)) {
                return;
            }
        }

        // Remove lesson and all its words
        this.lessons = this.lessons.filter(l => l.id !== lessonId);
        this.words = this.words.filter(word => word.lessonId !== lessonId);
        
        // If this was the current lesson, select another one
        if (this.currentLessonId === lessonId) {
            this.currentLessonId = this.lessons.length > 0 ? this.lessons[0].id : null;
            localStorage.setItem('currentLessonId', this.currentLessonId || '');
        }

        this.saveToStorage();
        this.renderLessonsList();
        this.updateLessonSelectors();
        this.updateCurrentLessonDisplay();
        this.renderReviewLessonCheckboxes();
        this.renderWordsList();
        this.updateStats();
        this.showMessage('Đã xóa bài học!', 'success');
    }

    updateLessonSelectors() {
        const selectors = ['selectedLesson', 'filterLesson'];
        
        selectors.forEach(selectorId => {
            const selector = document.getElementById(selectorId);
            if (!selector) return;
            
            const currentValue = selector.value;
            selector.innerHTML = selectorId === 'selectedLesson' 
                ? '<option value="">Chọn bài học...</option>'
                : '<option value="">Tất cả bài học</option>';
            
            this.lessons.forEach(lesson => {
                const option = document.createElement('option');
                option.value = lesson.id;
                option.textContent = lesson.name;
                if (lesson.id === currentValue || (selectorId === 'selectedLesson' && lesson.id === this.currentLessonId)) {
                    option.selected = true;
                }
                selector.appendChild(option);
            });
        });
    }

    updateCurrentLessonDisplay() {
        const display = document.getElementById('currentLessonDisplay');
        if (!display) return;

        if (!this.currentLessonId || this.lessons.length === 0) {
            display.innerHTML = '<p>Chưa chọn bài học nào. Hãy tạo và chọn một bài học để bắt đầu!</p>';
            return;
        }

        const currentLesson = this.lessons.find(l => l.id === this.currentLessonId);
        if (!currentLesson) {
            display.innerHTML = '<p>Bài học hiện tại không tồn tại.</p>';
            return;
        }

        const wordCount = this.words.filter(word => word.lessonId === this.currentLessonId).length;
        display.innerHTML = `
            <div class="lesson-info">
                <h4><i class="fas fa-book color-${currentLesson.color}"></i> ${currentLesson.name}</h4>
                <p>${currentLesson.description || 'Không có mô tả'}</p>
                <div class="lesson-stats">
                    <span><i class="fas fa-list"></i> ${wordCount} từ vựng</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(currentLesson.createdDate).toLocaleDateString('vi-VN')}</span>
                </div>
            </div>
        `;
    }

    showCreateLessonForm() {
        document.getElementById('createLessonForm').style.display = 'block';
    }

    hideCreateLessonForm() {
        document.getElementById('createLessonForm').style.display = 'none';
        document.getElementById('addLessonForm').reset();
    }

    startQuiz() {
        // Get words from current lesson if selected
        let availableWords = this.words;
        if (this.currentLessonId) {
            availableWords = this.words.filter(word => word.lessonId === this.currentLessonId);
        }
        
        if (availableWords.length < 4) {
            const message = this.currentLessonId 
                ? 'Bài học hiện tại cần ít nhất 4 từ vựng để bắt đầu quiz!' 
                : 'Cần ít nhất 4 từ vựng để bắt đầu quiz!';
            this.showMessage(message, 'error');
            return;
        }

        const quizLength = parseInt(document.getElementById('quizLength').value);
        const quizMode = document.getElementById('quizMode').value;
        
        // Shuffle words and select quiz length
        const shuffledWords = [...availableWords].sort(() => Math.random() - 0.5);
        const quizWords = shuffledWords.slice(0, Math.min(quizLength, availableWords.length));
        
        this.currentQuiz = {
            words: quizWords,
            currentIndex: 0,
            score: 0,
            mode: quizMode,
            userAnswers: []
        };

        this.renderQuizQuestion();
    }

    renderQuizQuestion() {
        const quiz = this.currentQuiz;
        const currentWord = quiz.words[quiz.currentIndex];
        const quizContent = document.getElementById('quizContent');
        
        // Determine question type based on mode
        let questionText, correctAnswer, questionType;
        if (quiz.mode === 'en-to-vi' || (quiz.mode === 'mixed' && Math.random() < 0.5)) {
            questionText = currentWord.english;
            correctAnswer = currentWord.vietnamese;
            questionType = 'Dịch từ tiếng Anh sang tiếng Việt';
        } else {
            questionText = currentWord.vietnamese;
            correctAnswer = currentWord.english;
            questionType = 'Dịch từ tiếng Việt sang tiếng Anh';
        }

        // Generate wrong answers
        const wrongAnswers = this.generateWrongAnswers(correctAnswer, quiz.mode === 'en-to-vi' || (quiz.mode === 'mixed' && questionText === currentWord.english));
        const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);

        quizContent.innerHTML = `
            <div class="quiz-question">
                <div class="quiz-word-audio">
                    <div class="question-text">${questionText}</div>
                    ${quiz.mode !== 'vi-to-en' && questionText === currentWord.english ? `
                        <button class="pronunciation-btn" onclick="app.speakWord('${currentWord.english}')" title="Phát âm">
                            <i class="fas fa-volume-up"></i>
                        </button>
                    ` : ''}
                </div>
                <div class="question-type">${questionType}</div>
            </div>
            <div class="quiz-options">
                ${options.map(option => `
                    <div class="quiz-option" onclick="app.selectQuizOption(this, '${option}', '${correctAnswer}')">
                        ${option}
                    </div>
                `).join('')}
            </div>
            <div style="text-align: center; margin-top: 20px;">
                <span>Câu ${quiz.currentIndex + 1}/${quiz.words.length}</span>
            </div>
        `;
    }

    generateWrongAnswers(correctAnswer, isVietnamese) {
        const allAnswers = this.words.map(word => isVietnamese ? word.vietnamese : word.english);
        const wrongAnswers = allAnswers.filter(answer => answer !== correctAnswer);
        
        // Shuffle and take 3 random wrong answers
        return wrongAnswers.sort(() => Math.random() - 0.5).slice(0, 3);
    }

    selectQuizOption(element, selectedAnswer, correctAnswer) {
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
        this.currentQuiz.userAnswers.push({
            word: this.currentQuiz.words[this.currentQuiz.currentIndex],
            selectedAnswer,
            correctAnswer,
            isCorrect
        });

        if (isCorrect) {
            this.currentQuiz.score++;
        }

        // Show next button or finish quiz
        setTimeout(() => {
            this.currentQuiz.currentIndex++;
            if (this.currentQuiz.currentIndex < this.currentQuiz.words.length) {
                this.renderQuizQuestion();
            } else {
                this.finishQuiz();
            }
        }, 1500);
    }

    finishQuiz() {
        const quiz = this.currentQuiz;
        const scorePercentage = Math.round((quiz.score / quiz.words.length) * 100);
        
        // Update progress
        this.quizProgress.totalQuestions += quiz.words.length;
        this.quizProgress.correctAnswers += quiz.score;
        
        // Mark words as reviewed
        quiz.words.forEach(word => {
            const wordIndex = this.words.findIndex(w => w.id === word.id);
            if (wordIndex !== -1) {
                this.words[wordIndex].reviewed++;
                this.words[wordIndex].lastReviewed = new Date().toISOString();
                
                // Add to learned words if answered correctly and not already learned
                const userAnswer = quiz.userAnswers.find(a => a.word.id === word.id);
                if (userAnswer && userAnswer.isCorrect && !this.quizProgress.learnedWords.includes(word.id)) {
                    this.quizProgress.learnedWords.push(word.id);
                }
            }
        });

        this.saveToStorage();
        this.updateStats();

        let feedback = '';
        if (scorePercentage >= 90) feedback = 'Xuất sắc! 🎉';
        else if (scorePercentage >= 70) feedback = 'Rất tốt! 👍';
        else if (scorePercentage >= 50) feedback = 'Khá ổn! 👌';
        else feedback = 'Cần cố gắng thêm! 💪';

        document.getElementById('quizContent').innerHTML = `
            <div class="quiz-result">
                <div class="quiz-score">${quiz.score}/${quiz.words.length}</div>
                <div class="quiz-feedback">${feedback}</div>
                <p>Độ chính xác: ${scorePercentage}%</p>
                <div style="margin-top: 20px;">
                    <button class="btn btn-primary" onclick="app.startQuiz()">
                        <i class="fas fa-redo"></i> Làm lại
                    </button>
                    <button class="btn btn-secondary" onclick="app.resetQuiz()">
                        <i class="fas fa-home"></i> Về trang chủ
                    </button>
                </div>
            </div>
        `;
    }

    resetQuiz() {
        this.currentQuiz = null;
        document.getElementById('quizContent').innerHTML = `
            <div class="quiz-start">
                <p>Sẵn sàng kiểm tra kiến thức từ vựng của bạn?</p>
                <button id="startQuiz" class="btn btn-primary">
                    <i class="fas fa-play"></i> Bắt đầu luyện tập
                </button>
            </div>
        `;
        document.getElementById('startQuiz').addEventListener('click', () => this.startQuiz());
    }

    startReview() {
        // Get words from selected lessons
        let availableWords = [];
        
        if (this.selectedReviewLessons.length > 0) {
            // Get words from selected lessons
            availableWords = this.words.filter(word => 
                this.selectedReviewLessons.includes(word.lessonId)
            );
        } else {
            // No lessons selected, show error
            this.showMessage('Vui lòng chọn ít nhất một bài học để ôn tập!', 'error');
            return;
        }
        
        if (availableWords.length === 0) {
            this.showMessage('Các bài học đã chọn không có từ vựng nào để ôn tập!', 'error');
            return;
        }

        this.reviewWords = availableWords;
        this.currentReviewIndex = 0;
        this.renderReviewCard();
        this.updateReviewInfo();
    }

    shuffleReview() {
        if (this.reviewWords) {
            this.reviewWords = this.reviewWords.sort(() => Math.random() - 0.5);
            this.currentReviewIndex = 0;
            this.renderReviewCard();
        }
    }

    renderReviewCard() {
        if (!this.reviewWords || this.reviewWords.length === 0) return;

        const word = this.reviewWords[this.currentReviewIndex];
        const reviewContent = document.getElementById('reviewContent');

        reviewContent.innerHTML = `
            <div class="review-card">
                <div class="review-word-audio">
                    <div class="review-word">${word.english}</div>
                    <button class="pronunciation-btn" onclick="app.speakWord('${word.english}')" title="Phát âm">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
                <div class="review-meaning">${word.vietnamese}</div>
                ${word.example ? `<div class="review-example">"${word.example}"</div>` : ''}
                <div class="review-navigation">
                    <button class="btn btn-secondary" onclick="app.previousReview()" ${this.currentReviewIndex === 0 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left"></i> Trước
                    </button>
                    <span class="review-progress">${this.currentReviewIndex + 1} / ${this.reviewWords.length}</span>
                    <button class="btn btn-secondary" onclick="app.nextReview()" ${this.currentReviewIndex === this.reviewWords.length - 1 ? 'disabled' : ''}>
                        Sau <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;
    }

    previousReview() {
        if (this.currentReviewIndex > 0) {
            this.currentReviewIndex--;
            this.renderReviewCard();
        }
    }

    nextReview() {
        if (this.reviewWords && this.currentReviewIndex < this.reviewWords.length - 1) {
            this.currentReviewIndex++;
            this.renderReviewCard();
        }
    }

    updateStats() {
        document.getElementById('totalWords').textContent = this.words.length;
        document.getElementById('learnedWords').textContent = this.quizProgress.learnedWords.length;
        
        const accuracy = this.quizProgress.totalQuestions > 0 
            ? Math.round((this.quizProgress.correctAnswers / this.quizProgress.totalQuestions) * 100)
            : 0;
        document.getElementById('accuracy').textContent = accuracy + '%';
    }

    saveToStorage() {
        localStorage.setItem('vocabularyWords', JSON.stringify(this.words));
        localStorage.setItem('vocabularyLessons', JSON.stringify(this.lessons));
        localStorage.setItem('currentLessonId', this.currentLessonId || '');
        localStorage.setItem('quizProgress', JSON.stringify(this.quizProgress));
    }

    showMessage(message, type) {
        // Remove existing messages
        document.querySelectorAll('.message').forEach(msg => msg.remove());
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type} show`;
        messageDiv.textContent = message;
        
        const activeTab = document.querySelector('.tab-content.active .card');
        if (activeTab) {
            activeTab.insertBefore(messageDiv, activeTab.firstChild);
            
            // Auto hide after 3 seconds
            setTimeout(() => {
                messageDiv.remove();
            }, 3000);
        }
    }

    // Speech Synthesis for Pronunciation
    speakWord(word) {
        if (!word || word.trim() === '') {
            this.showMessage('Không có từ để phát âm!', 'error');
            return;
        }

        // Check if speech synthesis is supported
        if (!('speechSynthesis' in window)) {
            this.showMessage('Trình duyệt không hỗ trợ phát âm!', 'error');
            return;
        }

        // Cancel any ongoing speech
        speechSynthesis.cancel();

        // Create speech utterance
        const utterance = new SpeechSynthesisUtterance(word.trim());
        
        // Set voice properties
        utterance.lang = 'en-US'; // English US
        utterance.rate = 0.8; // Slightly slower for learning
        utterance.pitch = 1;
        utterance.volume = 1;

        // Try to use a native English voice if available
        const voices = speechSynthesis.getVoices();
        const englishVoice = voices.find(voice => 
            voice.lang.startsWith('en') && voice.localService
        ) || voices.find(voice => voice.lang.startsWith('en'));

        if (englishVoice) {
            utterance.voice = englishVoice;
        }

        // Add event listeners
        utterance.onstart = () => {
            // Visual feedback - change button style while speaking
            const buttons = document.querySelectorAll('.pronunciation-btn, .btn-pronunciation');
            buttons.forEach(btn => {
                if (btn.onclick && btn.onclick.toString().includes(word)) {
                    btn.style.background = 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)';
                    btn.style.transform = 'scale(1.1)';
                }
            });
        };

        utterance.onend = () => {
            // Reset button styles
            const buttons = document.querySelectorAll('.pronunciation-btn, .btn-pronunciation');
            buttons.forEach(btn => {
                if (btn.onclick && btn.onclick.toString().includes(word)) {
                    btn.style.background = '';
                    btn.style.transform = '';
                }
            });
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
            this.showMessage('Lỗi phát âm: ' + event.error, 'error');
        };

        // Speak the word
        speechSynthesis.speak(utterance);
    }

    // Load voices when they become available
    loadVoices() {
        return new Promise((resolve) => {
            let voices = speechSynthesis.getVoices();
            if (voices.length) {
                resolve(voices);
                return;
            }
            
            speechSynthesis.onvoiceschanged = () => {
                voices = speechSynthesis.getVoices();
                resolve(voices);
            };
        });
    }

    // Review Lesson Selection Methods
    renderReviewLessonCheckboxes() {
        const container = document.getElementById('reviewLessonCheckboxes');
        if (!container) return;

        if (this.lessons.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Chưa có bài học nào để ôn tập.</p>';
            return;
        }

        container.innerHTML = this.lessons.map(lesson => {
            const wordCount = this.words.filter(word => word.lessonId === lesson.id).length;
            const isSelected = this.selectedReviewLessons.includes(lesson.id);
            
            return `
            <div class="lesson-checkbox-item ${isSelected ? 'selected' : ''}" onclick="app.toggleReviewLesson('${lesson.id}')">
                <div class="lesson-checkbox ${isSelected ? 'checked' : ''}"></div>
                <div class="lesson-checkbox-color color-${lesson.color}"></div>
                <span class="lesson-checkbox-label">${lesson.name}</span>
                <span class="lesson-checkbox-count">${wordCount} từ</span>
            </div>
            `;
        }).join('');

        this.updateReviewInfo();
    }

    toggleReviewLesson(lessonId) {
        const index = this.selectedReviewLessons.indexOf(lessonId);
        
        if (index === -1) {
            // Add lesson to selection
            this.selectedReviewLessons.push(lessonId);
        } else {
            // Remove lesson from selection
            this.selectedReviewLessons.splice(index, 1);
        }

        this.renderReviewLessonCheckboxes();
    }

    selectAllLessons() {
        this.selectedReviewLessons = this.lessons.map(lesson => lesson.id);
        this.renderReviewLessonCheckboxes();
        this.showMessage('Đã chọn tất cả bài học!', 'success');
    }

    deselectAllLessons() {
        this.selectedReviewLessons = [];
        this.renderReviewLessonCheckboxes();
        this.showMessage('Đã bỏ chọn tất cả bài học!', 'success');
    }

    updateReviewInfo() {
        const reviewContent = document.getElementById('reviewContent');
        if (!reviewContent) return;

        if (this.selectedReviewLessons.length === 0) {
            reviewContent.innerHTML = '<p>Chọn bài học và nhấn "Bắt đầu ôn tập" để xem lại từ vựng đã học</p>';
            return;
        }

        const totalWords = this.words.filter(word => 
            this.selectedReviewLessons.includes(word.lessonId)
        ).length;

        const selectedLessonNames = this.selectedReviewLessons
            .map(id => this.lessons.find(lesson => lesson.id === id)?.name)
            .filter(Boolean)
            .join(', ');

        if (!this.reviewWords || this.reviewWords.length === 0) {
            reviewContent.innerHTML = `
                <div class="selected-lessons-info">
                    <i class="fas fa-info-circle"></i>
                    Đã chọn ${this.selectedReviewLessons.length} bài học (${totalWords} từ vựng): ${selectedLessonNames}
                </div>
                <p>Nhấn "Bắt đầu ôn tập" để xem lại từ vựng đã học</p>
            `;
        }
    }

    // Autocomplete and Translation Methods
    initializeCommonWords() {
        this.commonWords = [
            // Common nouns
            { word: 'apple', type: 'noun' },
            { word: 'book', type: 'noun' },
            { word: 'car', type: 'noun' },
            { word: 'dog', type: 'noun' },
            { word: 'house', type: 'noun' },
            { word: 'family', type: 'noun' },
            { word: 'friend', type: 'noun' },
            { word: 'school', type: 'noun' },
            { word: 'teacher', type: 'noun' },
            { word: 'student', type: 'noun' },
            { word: 'water', type: 'noun' },
            { word: 'food', type: 'noun' },
            { word: 'computer', type: 'noun' },
            { word: 'phone', type: 'noun' },
            { word: 'money', type: 'noun' },
            
            // Common verbs
            { word: 'eat', type: 'verb' },
            { word: 'drink', type: 'verb' },
            { word: 'sleep', type: 'verb' },
            { word: 'walk', type: 'verb' },
            { word: 'run', type: 'verb' },
            { word: 'speak', type: 'verb' },
            { word: 'listen', type: 'verb' },
            { word: 'read', type: 'verb' },
            { word: 'write', type: 'verb' },
            { word: 'study', type: 'verb' },
            { word: 'work', type: 'verb' },
            { word: 'play', type: 'verb' },
            { word: 'love', type: 'verb' },
            { word: 'like', type: 'verb' },
            { word: 'want', type: 'verb' },
            
            // Common adjectives
            { word: 'beautiful', type: 'adjective' },
            { word: 'good', type: 'adjective' },
            { word: 'bad', type: 'adjective' },
            { word: 'big', type: 'adjective' },
            { word: 'small', type: 'adjective' },
            { word: 'happy', type: 'adjective' },
            { word: 'sad', type: 'adjective' },
            { word: 'hot', type: 'adjective' },
            { word: 'cold', type: 'adjective' },
            { word: 'new', type: 'adjective' },
            { word: 'old', type: 'adjective' },
            { word: 'fast', type: 'adjective' },
            { word: 'slow', type: 'adjective' },
            { word: 'easy', type: 'adjective' },
            { word: 'difficult', type: 'adjective' },
            
            // Common adverbs
            { word: 'quickly', type: 'adverb' },
            { word: 'slowly', type: 'adverb' },
            { word: 'carefully', type: 'adverb' },
            { word: 'always', type: 'adverb' },
            { word: 'never', type: 'adverb' },
            { word: 'often', type: 'adverb' },
            { word: 'sometimes', type: 'adverb' },
            { word: 'usually', type: 'adverb' },
            { word: 'really', type: 'adverb' },
            { word: 'very', type: 'adverb' }
        ];
    }

    setupAutocomplete() {
        const englishInput = document.getElementById('englishWord');
        const suggestionsContainer = document.getElementById('englishSuggestions');
        
        if (!englishInput || !suggestionsContainer) return;

        englishInput.addEventListener('input', (e) => {
            this.handleAutocomplete(e.target.value, suggestionsContainer);
        });

        englishInput.addEventListener('keydown', (e) => {
            this.handleAutocompleteKeyboard(e, suggestionsContainer);
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!englishInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.classList.remove('show');
            }
        });
    }

    handleAutocomplete(inputValue, suggestionsContainer) {
        const value = inputValue.trim().toLowerCase();
        
        if (value.length < 2) {
            suggestionsContainer.classList.remove('show');
            return;
        }

        // Filter words that start with the input
        const suggestions = this.commonWords.filter(item => 
            item.word.toLowerCase().startsWith(value)
        ).slice(0, 8); // Limit to 8 suggestions

        if (suggestions.length === 0) {
            suggestionsContainer.innerHTML = '<div class="no-suggestions">Không tìm thấy gợi ý phù hợp</div>';
            suggestionsContainer.classList.add('show');
            return;
        }

        suggestionsContainer.innerHTML = suggestions.map((item, index) => `
            <div class="suggestion-item" data-word="${item.word}" data-index="${index}">
                <span class="suggestion-word">${item.word}</span>
                <span class="suggestion-type">${item.type}</span>
            </div>
        `).join('');

        // Add click listeners to suggestions
        suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectSuggestion(item.dataset.word);
                suggestionsContainer.classList.remove('show');
            });
        });

        suggestionsContainer.classList.add('show');
        this.currentSuggestionIndex = -1;
    }

    handleAutocompleteKeyboard(e, suggestionsContainer) {
        const suggestions = suggestionsContainer.querySelectorAll('.suggestion-item');
        
        if (!suggestionsContainer.classList.contains('show') || suggestions.length === 0) {
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.currentSuggestionIndex = Math.min(this.currentSuggestionIndex + 1, suggestions.length - 1);
                this.highlightSuggestion(suggestions);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.currentSuggestionIndex = Math.max(this.currentSuggestionIndex - 1, -1);
                this.highlightSuggestion(suggestions);
                break;
                
            case 'Enter':
                if (this.currentSuggestionIndex >= 0) {
                    e.preventDefault();
                    const selectedWord = suggestions[this.currentSuggestionIndex].dataset.word;
                    this.selectSuggestion(selectedWord);
                    suggestionsContainer.classList.remove('show');
                }
                break;
                
            case 'Escape':
                suggestionsContainer.classList.remove('show');
                this.currentSuggestionIndex = -1;
                break;
        }
    }

    highlightSuggestion(suggestions) {
        suggestions.forEach((item, index) => {
            if (index === this.currentSuggestionIndex) {
                item.classList.add('highlighted');
            } else {
                item.classList.remove('highlighted');
            }
        });
    }

    selectSuggestion(word) {
        const englishInput = document.getElementById('englishWord');
        englishInput.value = word;
        this.currentSuggestionIndex = -1;
        
        // Trigger translation for the selected word
        this.translateWord(word);
    }

    setupTranslation() {
        const englishInput = document.getElementById('englishWord');
        if (!englishInput) return;

        englishInput.addEventListener('input', (e) => {
            clearTimeout(this.translationTimeout);
            const word = e.target.value.trim();
            
            if (word.length >= 3) {
                this.translationTimeout = setTimeout(() => {
                    this.translateWord(word);
                }, 1000); // Wait 1 second after user stops typing
            } else {
                this.clearTranslation();
            }
        });
    }

    async translateWord(word) {
        if (!word || word.length < 2) return;

        const vietnameseInput = document.getElementById('vietnameseMeaning');
        const statusElement = document.getElementById('translationStatus');
        
        if (!vietnameseInput || !statusElement) return;

        // Don't auto-translate if user has already entered something
        if (vietnameseInput.value.trim() && !vietnameseInput.classList.contains('auto-translated')) {
            return;
        }

        try {
            statusElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang dịch...';
            statusElement.className = 'translation-status loading';

            // Try to get translation from MyMemory API (free translation service)
            const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|vi`);
            const data = await response.json();

            if (data.responseStatus === 200 && data.responseData.translatedText) {
                let translation = data.responseData.translatedText;
                
                // Clean up translation (remove extra spaces, capitalize properly)
                translation = translation.trim().toLowerCase();
                
                // Set the translation
                vietnameseInput.value = translation;
                vietnameseInput.classList.add('auto-translated');
                
                statusElement.innerHTML = '<i class="fas fa-check"></i> Đã dịch tự động';
                statusElement.className = 'translation-status success';
                
                setTimeout(() => {
                    statusElement.innerHTML = '';
                    statusElement.className = 'translation-status';
                }, 3000);
                
            } else {
                throw new Error('Translation failed');
            }
        } catch (error) {
            console.error('Translation error:', error);
            statusElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Không thể dịch';
            statusElement.className = 'translation-status error';
            
            setTimeout(() => {
                statusElement.innerHTML = '';
                statusElement.className = 'translation-status';
            }, 3000);
        }
    }

    clearTranslation() {
        const vietnameseInput = document.getElementById('vietnameseMeaning');
        const statusElement = document.getElementById('translationStatus');
        
        if (vietnameseInput && vietnameseInput.classList.contains('auto-translated')) {
            vietnameseInput.value = '';
            vietnameseInput.classList.remove('auto-translated');
        }
        
        if (statusElement) {
            statusElement.innerHTML = '';
            statusElement.className = 'translation-status';
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VocabularyApp();
});

// Export and Import functions
function exportData() {
    const data = {
        words: app.words,
        lessons: app.lessons,
        progress: app.quizProgress,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `vocabulary_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.words && Array.isArray(data.words)) {
                app.words = data.words;
                if (data.lessons) {
                    app.lessons = data.lessons;
                }
                if (data.progress) {
                    app.quizProgress = data.progress;
                }
                
                app.saveToStorage();
                app.updateStats();
                app.renderWordsList();
                app.renderLessonsList();
                app.updateLessonSelectors();
                app.showMessage('Đã nhập dữ liệu thành công!', 'success');
            } else {
                app.showMessage('File không đúng định dạng!', 'error');
            }
        } catch (error) {
            app.showMessage('Lỗi khi đọc file!', 'error');
        }
    };
    reader.readAsText(file);
} 
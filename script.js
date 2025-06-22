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
        
        // Practice modes
        this.currentPracticeMode = null;
        this.currentFlashcards = null;
        this.currentSpellingTest = null;
        this.currentMatchingGame = null;
        this.currentSpeedChallenge = null;
        this.currentListeningPractice = null;
        
        // Selected lessons for each practice mode
        this.selectedPracticeLessons = {
            quiz: [],
            flashcards: [],
            spelling: [],
            matching: [],
            speed: [],
            listening: []
        };
        
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
        } else {
            // Initialize practice lesson selections from localStorage or default to all
            const savedPracticeLessons = localStorage.getItem('selectedPracticeLessons');
            if (savedPracticeLessons) {
                this.selectedPracticeLessons = JSON.parse(savedPracticeLessons);
            } else {
                const allLessonIds = this.lessons.map(lesson => lesson.id);
                this.selectedPracticeLessons = {
                    quiz: [...allLessonIds],
                    flashcards: [...allLessonIds],
                    spelling: [...allLessonIds],
                    matching: [...allLessonIds],
                    speed: [...allLessonIds],
                    listening: [...allLessonIds]
                };
                this.saveToStorage();
            }
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
        
        // Initialize practice lesson selections - select all by default
        const allLessonIds = this.lessons.map(lesson => lesson.id);
        this.selectedPracticeLessons = {
            quiz: [...allLessonIds],
            flashcards: [...allLessonIds],
            spelling: [...allLessonIds],
            matching: [...allLessonIds],
            speed: [...allLessonIds],
            listening: [...allLessonIds]
        };
        
        this.saveToStorage();
        this.updateStats();
        this.renderWordsList();
        this.renderLessonsList();
        this.updateLessonSelectors();
        this.updateCurrentLessonDisplay();
        this.renderReviewLessonCheckboxes();
    }

    setupEventListeners() {
        // Note: Removed individual element listeners since they're handled by the global setupEventListeners in HTML
        // The HTML file handles all event listeners to avoid null element errors
        
        // Setup autocomplete and translation features
        this.setupAutocomplete();
        this.setupTranslation();
        
        // Load voices for speech synthesis
        this.loadVoices();
    }

    switchTab(tabName) {
        // Remove flashcard keyboard listeners when switching tabs
        if (this.flashcardKeyHandler) {
            document.removeEventListener('keydown', this.flashcardKeyHandler);
            this.flashcardKeyHandler = null;
        }
        
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
                        <button class="pronunciation-btn" onclick="app.speakEnglishOnly('${word.english}')" title="Phát âm tiếng Anh">
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

    // Beautiful Input Modal Methods
    showInputModal(options) {
        return new Promise((resolve, reject) => {
            const modal = document.getElementById('inputModal');
            const title = document.getElementById('inputModalTitle');
            const message = document.getElementById('inputModalMessage');
            const label = document.getElementById('inputModalLabel');
            const field = document.getElementById('inputModalField');
            const hint = document.getElementById('inputModalHint');
            const confirmBtn = document.getElementById('inputModalConfirm');
            const cancelBtn = document.getElementById('inputModalCancel');

            // Set content
            title.textContent = options.title || 'Nhập thông tin';
            message.textContent = options.message || 'Vui lòng nhập thông tin:';
            label.textContent = options.label || 'Giá trị:';
            field.placeholder = options.placeholder || '';
            field.value = options.defaultValue || '';
            hint.textContent = options.hint || '';
            
            // Set input type and validation
            field.type = options.type || 'text';
            if (options.min !== undefined) field.min = options.min;
            if (options.max !== undefined) field.max = options.max;
            if (options.step !== undefined) field.step = options.step;

            // Store resolve/reject for later use
            this.currentInputResolve = resolve;
            this.currentInputReject = reject;

            // Show modal
            modal.style.display = 'flex';
            
            // Focus input field
            setTimeout(() => field.focus(), 100);

            // Handle enter key
            const handleEnter = (e) => {
                if (e.key === 'Enter') {
                    confirmBtn.click();
                }
            };
            field.addEventListener('keydown', handleEnter);

            // Clean up function
            this.inputModalCleanup = () => {
                field.removeEventListener('keydown', handleEnter);
                modal.style.display = 'none';
            };
        });
    }

    closeInputModal(confirmed = false) {
        const field = document.getElementById('inputModalField');
        const value = field.value.trim();

        if (this.inputModalCleanup) {
            this.inputModalCleanup();
        }

        if (confirmed && this.currentInputResolve) {
            this.currentInputResolve(value);
        } else if (this.currentInputReject) {
            this.currentInputReject(new Error('User cancelled'));
        }

        this.currentInputResolve = null;
        this.currentInputReject = null;
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

    async startQuiz() {
        const selectedWords = this.getSelectedPracticeWords('quiz');
        
        if (selectedWords.length < 4) {
            this.showMessage('Vui lòng chọn ít nhất một bài học có từ 4 từ vựng trở lên để bắt đầu quiz!', 'error');
            return;
        }

        // Get custom number of questions with beautiful modal
        try {
            const customQuestions = await this.showInputModal({
                title: '🎯 Tùy chỉnh Quiz',
                message: 'Bạn muốn làm bao nhiêu câu hỏi?',
                label: 'Số câu hỏi:',
                type: 'number',
                min: 1,
                max: Math.max(selectedWords.length * 3, 100),
                defaultValue: '20',
                placeholder: 'VD: 20',
                hint: `Tối đa ${selectedWords.length} từ có sẵn. Nếu nhập nhiều hơn, từ sẽ được lặp lại.`
            });
            
            const quizLength = parseInt(customQuestions);
            if (isNaN(quizLength) || quizLength <= 0) {
                this.showMessage('Số câu hỏi không hợp lệ!', 'error');
                return;
            }
        } catch (error) {
            return; // User cancelled
        }

        const quizMode = document.getElementById('quizMode').value;
        
        // Generate questions with repetition if needed
        let quizWords = [];
        if (quizLength <= selectedWords.length) {
            // Enough words available
            const shuffledWords = [...selectedWords].sort(() => Math.random() - 0.5);
            quizWords = shuffledWords.slice(0, quizLength);
        } else {
            // Need to repeat words
            quizWords = [...selectedWords];
            while (quizWords.length < quizLength) {
                const remainingNeeded = quizLength - quizWords.length;
                const additionalWords = [...selectedWords].sort(() => Math.random() - 0.5).slice(0, remainingNeeded);
                quizWords.push(...additionalWords);
            }
        }
        
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
                        <button class="pronunciation-btn" onclick="app.speakEnglishOnly('${currentWord.english}')" title="Phát âm tiếng Anh">
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
        // Use selected words for generating wrong answers
        const selectedWords = this.getSelectedPracticeWords('quiz');
        const allAnswers = selectedWords.map(word => isVietnamese ? word.vietnamese : word.english);
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
                    <button class="pronunciation-btn" onclick="app.speakEnglishOnly('${word.english}')" title="Phát âm tiếng Anh">
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

    async saveToStorage() {
        if (this.storage) {
            // Use IndexedDB via StorageAdapter
            await this.storage.saveAll({
                words: this.words,
                lessons: this.lessons,
                currentLessonId: this.currentLessonId,
                progress: this.quizProgress,
                selectedPracticeLessons: this.selectedPracticeLessons
            });
        } else {
            // Fallback to localStorage
            localStorage.setItem('vocabularyWords', JSON.stringify(this.words));
            localStorage.setItem('vocabularyLessons', JSON.stringify(this.lessons));
            localStorage.setItem('currentLessonId', this.currentLessonId || '');
            localStorage.setItem('quizProgress', JSON.stringify(this.quizProgress));
            localStorage.setItem('selectedPracticeLessons', JSON.stringify(this.selectedPracticeLessons));
        }
        
        // Create auto backup after saving (only if enabled)
        if (this.autoBackupEnabled) {
            this.createAutoBackup();
        }
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

    // Speech Synthesis for Pronunciation - ENGLISH ONLY
    speakWord(word) {
        if (!word || word.trim() === '') {
            this.showMessage('Không có từ để phát âm!', 'error');
            return;
        }

        // IMPORTANT: Only pronounce English text - filter out Vietnamese
        if (!this.isEnglishText(word)) {
            console.log('Skipping non-English text pronunciation:', word);
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
        utterance.lang = 'en-US'; // English US ONLY
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
            console.log('Speaking English word:', word);
            // Visual feedback - change button style while speaking
            const buttons = document.querySelectorAll('.pronunciation-btn, .btn-pronunciation, .listening-audio-btn');
            buttons.forEach(btn => {
                if (btn.onclick && btn.onclick.toString().includes(word)) {
                    btn.style.background = 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)';
                    btn.style.transform = 'scale(1.1)';
                    btn.classList.add('speaking');
                }
            });
        };

        utterance.onend = () => {
            console.log('Finished speaking English word:', word);
            // Reset button styles
            const buttons = document.querySelectorAll('.pronunciation-btn, .btn-pronunciation, .listening-audio-btn');
            buttons.forEach(btn => {
                if (btn.onclick && btn.onclick.toString().includes(word)) {
                    btn.style.background = '';
                    btn.style.transform = '';
                    btn.classList.remove('speaking');
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

    // Check if text is English (basic Vietnamese detection)
    isEnglishText(text) {
        if (!text || typeof text !== 'string') return false;
        
        const cleanText = text.trim();
        
        // Vietnamese character pattern detection
        const vietnamesePattern = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/;
        
        if (vietnamesePattern.test(cleanText)) {
            return false; // Contains Vietnamese characters
        }

        // If text doesn't contain Vietnamese characters, consider it English
        return true;
    }

    // Safe pronunciation method that ensures only English is spoken
    speakEnglishOnly(englishWord) {
        if (this.isEnglishText(englishWord)) {
            this.speakWord(englishWord);
        } else {
            console.log('Word is not English, skipping pronunciation:', englishWord);
        }
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

    // Practice Mode Management
    selectPracticeMode(mode) {
        this.currentPracticeMode = mode;
        
        // Hide mode selector
        document.querySelector('.practice-mode-selector').style.display = 'none';
        
        // Generate and show practice content
        const container = document.getElementById('practiceContainer');
        container.innerHTML = this.generatePracticeHTML(mode);
        container.style.display = 'block';
        
        // Setup event listeners and render checkboxes
        this.setupPracticeModeEventListeners(mode);
        this.renderPracticeLessonCheckboxes(mode);
        this.updatePracticeInfo(mode);
    }

    generatePracticeHTML(mode) {
        const modeConfig = {
            quiz: {
                icon: 'fas fa-question-circle',
                title: 'Quiz - Trắc nghiệm',
                description: 'Sẵn sàng kiểm tra kiến thức từ vựng của bạn?',
                startText: 'Bắt đầu Quiz',
                settings: `
                    <div class="quiz-settings">
                        <label>
                            Chế độ:
                            <select id="quizMode">
                                <option value="en-to-vi">Anh → Việt</option>
                                <option value="vi-to-en">Việt → Anh</option>
                                <option value="mixed">Hỗn hợp</option>
                            </select>
                        </label>
                    </div>
                `
            },
            flashcards: {
                icon: 'fas fa-clone',
                title: 'Flashcards - Lật thẻ từ vựng',
                description: 'Lật thẻ để học từ vựng một cách hiệu quả!',
                startText: 'Bắt đầu Flashcards',
                settings: '<p><strong>Hướng dẫn:</strong> SPACE (lật thẻ) | ← (chưa nhớ) | → (đã nhớ)</p>'
            },
            spelling: {
                icon: 'fas fa-spell-check',
                title: 'Spelling Test - Kiểm tra chính tả',
                description: 'Nghe và viết đúng từ vựng!',
                startText: 'Bắt đầu Spelling Test',
                settings: ''
            },
            matching: {
                icon: 'fas fa-puzzle-piece',
                title: 'Matching Game - Trò chơi ghép từ',
                description: 'Ghép từ tiếng Anh với nghĩa tiếng Việt!',
                startText: 'Bắt đầu Matching Game',
                settings: '<p>Mỗi ván chơi tối đa 8 từ. Chơi cho đến khi hoàn thành tất cả từ đã chọn.</p>'
            },
            speed: {
                icon: 'fas fa-bolt',
                title: 'Speed Challenge - Thử thách tốc độ',
                description: 'Trả lời nhanh nhất có thể trong thời gian cho phép!',
                startText: 'Bắt đầu Speed Challenge',
                settings: `
                    <div class="speed-settings">
                        <label>
                            Thời gian:
                            <select id="speedTime">
                                <option value="30">30 giây</option>
                                <option value="60" selected>60 giây</option>
                                <option value="120">2 phút</option>
                            </select>
                        </label>
                    </div>
                `
            },
            listening: {
                icon: 'fas fa-headphones',
                title: 'Listening Practice - Luyện nghe',
                description: 'Nghe và chọn nghĩa đúng của từ!',
                startText: 'Bắt đầu Listening Practice',
                settings: ''
            }
        };

        const config = modeConfig[mode];
        
        return `
            <div class="practice-content" id="${mode}-content">
                <div class="practice-header-small">
                    <h3><i class="${config.icon}"></i> ${config.title}</h3>
                    <button class="btn btn-secondary" onclick="app.backToModeSelector()">
                        <i class="fas fa-arrow-left"></i> Quay lại
                    </button>
                </div>
                
                <!-- Lesson Selection -->
                <div class="practice-lesson-selector">
                    <h4><i class="fas fa-check-square"></i> Chọn bài học để luyện tập:</h4>
                    <div class="practice-lesson-checkboxes" id="${mode}LessonCheckboxes">
                        <!-- Checkboxes will be populated by JavaScript -->
                    </div>
                    <div class="practice-select-controls">
                        <button type="button" class="btn btn-small btn-secondary" onclick="app.selectAllPracticeLessons('${mode}')">
                            <i class="fas fa-check-double"></i> Chọn tất cả
                        </button>
                        <button type="button" class="btn btn-small btn-secondary" onclick="app.deselectAllPracticeLessons('${mode}')">
                            <i class="fas fa-times"></i> Bỏ chọn tất cả
                        </button>
                    </div>
                    <div class="selected-practice-info" id="${mode}SelectedInfo">
                        <i class="fas fa-info-circle"></i> Chưa chọn bài học nào
                    </div>
                </div>
                
                ${config.settings}
                
                <div id="${mode}Content">
                    <div class="${mode}-start">
                        <p>${config.description}</p>
                        <button id="start${mode.charAt(0).toUpperCase() + mode.slice(1)}" class="btn btn-primary">
                            <i class="fas fa-play"></i> ${config.startText}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    setupPracticeModeEventListeners(mode) {
        const startBtn = document.getElementById(`start${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                switch(mode) {
                    case 'quiz': this.startQuiz(); break;
                    case 'flashcards': this.startFlashcards(); break;
                    case 'spelling': this.startSpellingTest(); break;
                    case 'matching': this.startMatchingGame(); break;
                    case 'speed': this.startSpeedChallenge(); break;
                    case 'listening': this.startListeningPractice(); break;
                }
            });
        }
    }

    backToModeSelector() {
        this.currentPracticeMode = null;
        
        // Remove flashcard keyboard listeners
        if (this.flashcardKeyHandler) {
            document.removeEventListener('keydown', this.flashcardKeyHandler);
            this.flashcardKeyHandler = null;
        }
        
        // Reset any active practice
        this.resetFlashcards();
        this.resetSpellingTest();
        this.resetMatchingGame();
        this.resetSpeedChallenge();
        this.resetListeningPractice();
        
        // Show mode selector and clear practice container
        document.querySelector('.practice-mode-selector').style.display = 'block';
        document.getElementById('practiceContainer').innerHTML = '';
        document.getElementById('practiceContainer').style.display = 'none';
    }

    // Flashcards Implementation
    startFlashcards() {
        const selectedWords = this.getSelectedPracticeWords('flashcards');
        
        if (selectedWords.length === 0) {
            this.showMessage('Vui lòng chọn ít nhất một bài học để luyện tập!', 'error');
            return;
        }

        this.currentFlashcards = {
            words: [...selectedWords].sort(() => Math.random() - 0.5),
            currentIndex: 0,
            isFlipped: false,
            rememberedWords: new Set(),
            notRememberedWords: new Set(),
            isReviewingForgotten: false,
            forgottenWords: []
        };

        // Add keyboard event listeners
        this.setupFlashcardKeyboardListeners();
        this.renderFlashcard();
    }

    renderFlashcard() {
        const container = document.getElementById('flashcardsContent');
        const currentWord = this.currentFlashcards.words[this.currentFlashcards.currentIndex];
        
        // Always show English first
        const frontText = currentWord.english;
        const backText = currentWord.vietnamese;
        
        container.innerHTML = `
            <div class="flashcard-progress">
                ${this.currentFlashcards.currentIndex + 1} / ${this.currentFlashcards.words.length}
                ${this.currentFlashcards.isReviewingForgotten ? ' (Ôn tập từ chưa nhớ)' : ''}
            </div>
            
            <div class="flashcard-instructions">
                <p><strong>Phím tắt:</strong> SPACE (lật thẻ) | ← (chưa nhớ) | → (đã nhớ)</p>
            </div>
            
            <div class="flashcard ${this.currentFlashcards.isFlipped ? 'flipped' : ''}" onclick="app.flipFlashcard()">
                <div class="flashcard-front">
                    <div class="flashcard-word">${frontText}</div>
                    <button class="pronunciation-btn" onclick="event.stopPropagation(); app.speakEnglishOnly('${currentWord.english}')" title="Phát âm tiếng Anh">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
                <div class="flashcard-back">
                    <div class="flashcard-meaning">${backText}</div>
                    ${currentWord.example ? `<p style="margin-top: 15px; font-size: 1rem; font-style: italic;">${currentWord.example}</p>` : ''}
                </div>
            </div>
            
            <div class="flashcard-status">
                <p>Đã nhớ: ${this.currentFlashcards.rememberedWords.size} | Chưa nhớ: ${this.currentFlashcards.notRememberedWords.size}</p>
            </div>
        `;
        
        // Auto-pronounce English word ONLY when showing front
        if (!this.currentFlashcards.isFlipped) {
            setTimeout(() => {
                this.speakEnglishOnly(currentWord.english);
            }, 500);
        }
    }

    setupFlashcardKeyboardListeners() {
        // Remove existing listeners first
        if (this.flashcardKeyHandler) {
            document.removeEventListener('keydown', this.flashcardKeyHandler);
        }
        
        this.flashcardKeyHandler = (e) => {
            if (!this.currentFlashcards) return;
            
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.flipFlashcard();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.markWordAsNotRemembered();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.markWordAsRemembered();
                    break;
            }
        };
        
        document.addEventListener('keydown', this.flashcardKeyHandler);
    }

    flipFlashcard() {
        this.currentFlashcards.isFlipped = !this.currentFlashcards.isFlipped;
        this.renderFlashcard();
    }

    markWordAsRemembered() {
        const currentWord = this.currentFlashcards.words[this.currentFlashcards.currentIndex];
        this.currentFlashcards.rememberedWords.add(currentWord.id);
        this.currentFlashcards.notRememberedWords.delete(currentWord.id);
        this.nextFlashcard();
    }

    markWordAsNotRemembered() {
        const currentWord = this.currentFlashcards.words[this.currentFlashcards.currentIndex];
        this.currentFlashcards.notRememberedWords.add(currentWord.id);
        this.currentFlashcards.rememberedWords.delete(currentWord.id);
        this.nextFlashcard();
    }

    nextFlashcard() {
        if (this.currentFlashcards.currentIndex < this.currentFlashcards.words.length - 1) {
            this.currentFlashcards.currentIndex++;
            this.currentFlashcards.isFlipped = false;
            this.renderFlashcard();
        } else {
            // Check if we need to review forgotten words
            if (!this.currentFlashcards.isReviewingForgotten && this.currentFlashcards.notRememberedWords.size > 0) {
                this.startForgottenWordsReview();
            } else {
                this.finishFlashcards();
            }
        }
    }

    startForgottenWordsReview() {
        // Create array of forgotten words
        this.currentFlashcards.forgottenWords = this.currentFlashcards.words.filter(word => 
            this.currentFlashcards.notRememberedWords.has(word.id)
        );
        
        if (this.currentFlashcards.forgottenWords.length === 0) {
            this.finishFlashcards();
            return;
        }
        
        // Shuffle forgotten words
        this.currentFlashcards.forgottenWords.sort(() => Math.random() - 0.5);
        
        // Switch to forgotten words review
        this.currentFlashcards.words = this.currentFlashcards.forgottenWords;
        this.currentFlashcards.currentIndex = 0;
        this.currentFlashcards.isFlipped = false;
        this.currentFlashcards.isReviewingForgotten = true;
        
        this.renderFlashcard();
        this.showMessage('Bắt đầu ôn tập các từ chưa nhớ!', 'info');
    }

    finishFlashcards() {
        // Remove keyboard listeners
        if (this.flashcardKeyHandler) {
            document.removeEventListener('keydown', this.flashcardKeyHandler);
            this.flashcardKeyHandler = null;
        }
        
        const totalWords = this.currentFlashcards.isReviewingForgotten ? 
            this.currentFlashcards.forgottenWords.length : 
            [...new Set([...Array.from(this.currentFlashcards.rememberedWords), ...Array.from(this.currentFlashcards.notRememberedWords)])].length;
        
        const rememberedCount = this.currentFlashcards.rememberedWords.size;
        const notRememberedCount = this.currentFlashcards.notRememberedWords.size;
        
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
                <button class="btn btn-primary" onclick="app.startFlashcards()">
                    <i class="fas fa-redo"></i> Luyện lại
                </button>
                <button class="btn btn-secondary" onclick="app.backToModeSelector()">
                    <i class="fas fa-arrow-left"></i> Chọn chế độ khác
                </button>
            </div>
        `;
    }

    resetFlashcards() {
        // Remove keyboard listeners
        if (this.flashcardKeyHandler) {
            document.removeEventListener('keydown', this.flashcardKeyHandler);
            this.flashcardKeyHandler = null;
        }
        
        this.currentFlashcards = null;
        const container = document.getElementById('flashcardsContent');
        if (container) {
            container.innerHTML = `
                <div class="flashcards-start">
                    <p>Lật thẻ để học từ vựng một cách hiệu quả!</p>
                    <p><strong>Hướng dẫn:</strong> SPACE (lật thẻ) | ← (chưa nhớ) | → (đã nhớ)</p>
                    <button id="startFlashcards" class="btn btn-primary">
                        <i class="fas fa-play"></i> Bắt đầu Flashcards
                    </button>
                </div>
            `;
            document.getElementById('startFlashcards').addEventListener('click', () => this.startFlashcards());
        }
    }

    // Spelling Test Implementation
    async startSpellingTest() {
        const selectedWords = this.getSelectedPracticeWords('spelling');
        
        if (selectedWords.length === 0) {
            this.showMessage('Vui lòng chọn ít nhất một bài học để luyện tập!', 'error');
            return;
        }

        // Get custom number of words with beautiful modal
        let numWords;
        try {
            const customWords = await this.showInputModal({
                title: '✏️ Tùy chỉnh Spelling Test',
                message: 'Bạn muốn kiểm tra bao nhiêu từ?',
                label: 'Số từ kiểm tra:',
                type: 'number',
                min: 1,
                max: Math.max(selectedWords.length * 2, 50),
                defaultValue: '15',
                placeholder: 'VD: 15',
                hint: `Tối đa ${selectedWords.length} từ có sẵn. Nếu nhập nhiều hơn, từ sẽ được lặp lại.`
            });
            
            numWords = parseInt(customWords);
            if (isNaN(numWords) || numWords <= 0) {
                this.showMessage('Số từ không hợp lệ!', 'error');
                return;
            }
        } catch (error) {
            return; // User cancelled
        }

        // Generate words with repetition if needed
        let testWords = [];
        if (numWords <= selectedWords.length) {
            // Enough words available
            testWords = [...selectedWords].sort(() => Math.random() - 0.5).slice(0, numWords);
        } else {
            // Need to repeat words
            testWords = [...selectedWords];
            while (testWords.length < numWords) {
                const remainingNeeded = numWords - testWords.length;
                const additionalWords = [...selectedWords].sort(() => Math.random() - 0.5).slice(0, remainingNeeded);
                testWords.push(...additionalWords);
            }
        }

        this.currentSpellingTest = {
            words: testWords,
            currentIndex: 0,
            correctAnswers: 0,
            userAnswers: []
        };

        this.renderSpellingQuestion();
    }

    renderSpellingQuestion() {
        const container = document.getElementById('spellingContent');
        const currentWord = this.currentSpellingTest.words[this.currentSpellingTest.currentIndex];
        
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
            audioWord = currentWord.vietnamese;
            hintText = `Nghĩa tiếng Việt: ${currentWord.vietnamese}`;
            placeholder = 'Nhập từ tiếng Anh...';
            correctAnswer = currentWord.english;
        }
        
        container.innerHTML = `
            <div class="spelling-progress">
                <p>Câu ${this.currentSpellingTest.currentIndex + 1} / ${this.currentSpellingTest.words.length}</p>
            </div>
            
            <div class="spelling-question">
                <p>${questionText}</p>
                <div class="spelling-audio-container">
                    ${isEnSpell ? `
                        <button class="listening-audio-btn" onclick="app.speakEnglishOnly('${currentWord.english}')" title="Nghe từ tiếng Anh">
                            <i class="fas fa-volume-up"></i> Nghe từ tiếng Anh
                        </button>
                    ` : `
                        <div class="spelling-hint-text">${hintText}</div>
                        <button class="listening-audio-btn" onclick="app.speakEnglishOnly('${currentWord.english}')" title="Gợi ý phát âm tiếng Anh">
                            <i class="fas fa-volume-up"></i> Gợi ý phát âm
                        </button>
                    `}
                </div>
                ${isEnSpell ? `<p style="color: #666; margin-bottom: 20px;">${hintText}</p>` : ''}
                <input type="text" class="spelling-input" id="spellingInput" placeholder="${placeholder}" onkeypress="app.handleSpellingKeyPress(event)">
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
                <button class="btn btn-primary" onclick="app.checkSpelling()">
                    <i class="fas fa-check"></i> Kiểm tra
                </button>
            </div>
        `;
        
        document.getElementById('spellingInput').focus();
        
        // Auto play English audio ONLY if it's English spelling
        if (isEnSpell) {
            setTimeout(() => {
                this.speakEnglishOnly(currentWord.english);
            }, 500);
        }
    }

    handleSpellingKeyPress(event) {
        if (event.key === 'Enter') {
            this.checkSpelling();
        }
    }

    checkSpelling() {
        const input = document.getElementById('spellingInput');
        const userAnswer = input.value.trim().toLowerCase();
        const correctAnswer = this.currentSpellingTest.words[this.currentSpellingTest.currentIndex].english.toLowerCase();
        
        const isCorrect = userAnswer === correctAnswer;
        this.currentSpellingTest.userAnswers.push({
            word: this.currentSpellingTest.words[this.currentSpellingTest.currentIndex],
            userAnswer: input.value.trim(),
            correct: isCorrect
        });
        
        if (isCorrect) {
            this.currentSpellingTest.correctAnswers++;
            input.classList.add('correct');
            input.classList.remove('incorrect');
        } else {
            input.classList.add('incorrect');
            input.classList.remove('correct');
        }
        
        setTimeout(() => {
            if (this.currentSpellingTest.currentIndex < this.currentSpellingTest.words.length - 1) {
                this.currentSpellingTest.currentIndex++;
                this.renderSpellingQuestion();
            } else {
                this.finishSpellingTest();
            }
        }, 1500);
    }

    finishSpellingTest() {
        const accuracy = Math.round((this.currentSpellingTest.correctAnswers / this.currentSpellingTest.words.length) * 100);
        const container = document.getElementById('spellingContent');
        
        let resultHtml = `
            <div class="practice-result">
                <h3><i class="fas fa-spell-check" style="color: #4facfe;"></i> Kết quả Spelling Test</h3>
                <div class="quiz-score">${accuracy}%</div>
                <p>Đúng ${this.currentSpellingTest.correctAnswers} / ${this.currentSpellingTest.words.length} từ</p>
                
                <div style="margin-top: 20px; text-align: left;">
                    <h4>Chi tiết:</h4>
        `;
        
        this.currentSpellingTest.userAnswers.forEach(answer => {
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
                    <button class="btn btn-primary" onclick="app.startSpellingTest()">
                        <i class="fas fa-redo"></i> Luyện lại
                    </button>
                    <button class="btn btn-secondary" onclick="app.backToModeSelector()">
                        <i class="fas fa-arrow-left"></i> Chọn chế độ khác
                    </button>
                </div>
            </div>
        `;
        
        container.innerHTML = resultHtml;
    }

    resetSpellingTest() {
        this.currentSpellingTest = null;
        const container = document.getElementById('spellingContent');
        if (container) {
            container.innerHTML = `
                <div class="spelling-start">
                    <p>Nghe và viết đúng từ vựng!</p>
                    <button id="startSpelling" class="btn btn-primary">
                        <i class="fas fa-play"></i> Bắt đầu Spelling Test
                    </button>
                </div>
            `;
            document.getElementById('startSpelling').addEventListener('click', () => this.startSpellingTest());
        }
    }

    // Matching Game Implementation - Multi-round system
    startMatchingGame() {
        const selectedWords = this.getSelectedPracticeWords('matching');
        
        if (selectedWords.length < 4) {
            this.showMessage('Cần ít nhất 4 từ vựng từ bài học đã chọn để chơi trò chơi ghép từ!', 'error');
            return;
        }

        // Initialize game session with all words
        this.currentMatchingGame = {
            allWords: [...selectedWords].sort(() => Math.random() - 0.5),
            currentRound: 0,
            totalRounds: Math.ceil(selectedWords.length / 8),
            completedWords: [],
            totalScore: 0,
            totalAttempts: 0,
            gameStarted: true
        };

        this.startMatchingRound();
    }

    startMatchingRound() {
        const game = this.currentMatchingGame;
        const wordsPerRound = 8;
        const startIndex = game.currentRound * wordsPerRound;
        const endIndex = Math.min(startIndex + wordsPerRound, game.allWords.length);
        const roundWords = game.allWords.slice(startIndex, endIndex);

        // Randomly determine column order for this round
        const isEnglishFirst = Math.random() < 0.5;
        
        game.currentRoundData = {
            words: roundWords,
            leftWords: roundWords.map(w => ({ 
                ...w, 
                type: isEnglishFirst ? 'english' : 'vietnamese', 
                matched: false,
                displayText: isEnglishFirst ? w.english : w.vietnamese
            })),
            rightWords: roundWords.map(w => ({ 
                ...w, 
                type: isEnglishFirst ? 'vietnamese' : 'english', 
                matched: false,
                displayText: isEnglishFirst ? w.vietnamese : w.english
            })).sort(() => Math.random() - 0.5),
            selectedItem: null,
            score: 0,
            attempts: 0,
            isEnglishFirst: isEnglishFirst
        };

        this.renderMatchingGame();
    }

    renderMatchingGame() {
        const container = document.getElementById('matchingContent');
        const game = this.currentMatchingGame;
        const roundData = game.currentRoundData;
        
        const leftTitle = roundData.isEnglishFirst ? 'Tiếng Anh' : 'Tiếng Việt';
        const rightTitle = roundData.isEnglishFirst ? 'Tiếng Việt' : 'Tiếng Anh';
        
        container.innerHTML = `
            <div class="matching-progress">
                <p><strong>Ván ${game.currentRound + 1} / ${game.totalRounds}</strong></p>
                <p>Ván này: ${roundData.score} / ${roundData.words.length} | Tổng: ${game.totalScore + roundData.score} / ${game.allWords.length}</p>
                <p>Số lần thử ván này: ${roundData.attempts}</p>
            </div>
            
            <div class="matching-game">
                <div class="matching-column">
                    <h4>${leftTitle}</h4>
                    ${roundData.leftWords.map((word, index) => `
                        <div class="matching-item ${word.matched ? 'matched' : ''}" 
                             onclick="app.selectMatchingItem('left', ${index})" 
                             data-id="${word.id}">
                            ${word.displayText}
                            ${word.type === 'english' ? `
                                <button class="pronunciation-btn-small" onclick="event.stopPropagation(); app.speakEnglishOnly('${word.english}')" title="Phát âm tiếng Anh">
                                    <i class="fas fa-volume-up"></i>
                                </button>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
                
                <div class="matching-column">
                    <h4>${rightTitle}</h4>
                    ${roundData.rightWords.map((word, index) => `
                        <div class="matching-item ${word.matched ? 'matched' : ''}" 
                             onclick="app.selectMatchingItem('right', ${index})" 
                             data-id="${word.id}">
                            ${word.displayText}
                            ${word.type === 'english' ? `
                                <button class="pronunciation-btn-small" onclick="event.stopPropagation(); app.speakEnglishOnly('${word.english}')" title="Phát âm tiếng Anh">
                                    <i class="fas fa-volume-up"></i>
                                </button>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    selectMatchingItem(side, index) {
        const roundData = this.currentMatchingGame.currentRoundData;
        const item = roundData[side + 'Words'][index];
        
        if (item.matched) return;
        
        // Clear previous selections
        document.querySelectorAll('.matching-item').forEach(el => {
            el.classList.remove('selected', 'wrong');
        });
        
        if (roundData.selectedItem) {
            if (roundData.selectedItem.side === side && 
                roundData.selectedItem.index === index) {
                // Deselect if clicking the same item
                roundData.selectedItem = null;
                return;
            }
            
            // Check if it's a match
            const selected = roundData.selectedItem;
            if (selected.side !== side && selected.item.id === item.id) {
                // It's a match!
                roundData.score++;
                roundData.attempts++;
                
                // Mark as matched
                roundData.leftWords.find(w => w.id === item.id).matched = true;
                roundData.rightWords.find(w => w.id === item.id).matched = true;
                
                roundData.selectedItem = null;
                
                if (roundData.score === roundData.words.length) {
                    // Round completed
                    this.currentMatchingGame.totalScore += roundData.score;
                    this.currentMatchingGame.totalAttempts += roundData.attempts;
                    this.currentMatchingGame.currentRound++;
                    
                    setTimeout(() => {
                        if (this.currentMatchingGame.currentRound < this.currentMatchingGame.totalRounds) {
                            // Start next round
                            this.showRoundTransition();
                        } else {
                            // Game completed
                            this.finishMatchingGame();
                        }
                    }, 500);
                } else {
                    this.renderMatchingGame();
                }
                return;
            } else {
                // Wrong match
                roundData.attempts++;
                
                // Show wrong animation
                document.querySelector(`[data-id="${selected.item.id}"]`).classList.add('wrong');
                document.querySelector(`[data-id="${item.id}"]`).classList.add('wrong');
                
                setTimeout(() => {
                    roundData.selectedItem = null;
                    this.renderMatchingGame();
                }, 1000);
                return;
            }
        } else {
            // First selection
            roundData.selectedItem = { side, index, item };
            document.querySelector(`[data-id="${item.id}"]`).classList.add('selected');
        }
    }

    showRoundTransition() {
        const container = document.getElementById('matchingContent');
        const game = this.currentMatchingGame;
        
        container.innerHTML = `
            <div class="round-transition">
                <h3>🎉 Hoàn thành ván ${game.currentRound}!</h3>
                <p>Điểm ván này: ${game.currentRoundData.score} / ${game.currentRoundData.words.length}</p>
                <p>Tổng điểm: ${game.totalScore} / ${(game.currentRound) * 8}</p>
                <div style="margin-top: 20px;">
                    <button class="btn btn-primary" onclick="app.startMatchingRound()">
                        <i class="fas fa-arrow-right"></i> Tiếp tục ván ${game.currentRound + 1}
                    </button>
                </div>
            </div>
        `;
    }

    finishMatchingGame() {
        const game = this.currentMatchingGame;
        const totalScore = game.totalScore;
        const totalWords = game.allWords.length;
        const totalAttempts = game.totalAttempts;
        const accuracy = Math.round((totalScore / totalAttempts) * 100);
        const container = document.getElementById('matchingContent');
        
        container.innerHTML = `
            <div class="practice-result">
                <h3><i class="fas fa-puzzle-piece" style="color: #4facfe;"></i> Hoàn thành tất cả ${game.totalRounds} ván!</h3>
                <div class="quiz-score">${accuracy}%</div>
                <p><strong>Tổng kết:</strong></p>
                <p>• Ghép đúng: ${totalScore} / ${totalWords} cặp</p>
                <p>• Số ván đã chơi: ${game.totalRounds}</p>
                <p>• Tổng số lần thử: ${totalAttempts}</p>
                <p>• Độ chính xác: ${accuracy}%</p>
                
                <div style="margin-top: 20px;">
                    <button class="btn btn-primary" onclick="app.startMatchingGame()">
                        <i class="fas fa-redo"></i> Chơi lại tất cả
                    </button>
                    <button class="btn btn-secondary" onclick="app.backToModeSelector()">
                        <i class="fas fa-arrow-left"></i> Chọn chế độ khác
                    </button>
                </div>
            </div>
        `;
    }

    resetMatchingGame() {
        this.currentMatchingGame = null;
        const container = document.getElementById('matchingContent');
        if (container) {
            container.innerHTML = `
                <div class="matching-start">
                    <p>Ghép từ tiếng Anh với nghĩa tiếng Việt!</p>
                    <button id="startMatching" class="btn btn-primary">
                        <i class="fas fa-play"></i> Bắt đầu Matching Game
                    </button>
                </div>
            `;
            document.getElementById('startMatching').addEventListener('click', () => this.startMatchingGame());
        }
    }

    // Speed Challenge Implementation
    startSpeedChallenge() {
        const selectedWords = this.getSelectedPracticeWords('speed');
        
        if (selectedWords.length === 0) {
            this.showMessage('Vui lòng chọn ít nhất một bài học để luyện tập!', 'error');
            return;
        }

        const timeLimit = parseInt(document.getElementById('speedTime').value);
        this.currentSpeedChallenge = {
            words: [...selectedWords].sort(() => Math.random() - 0.5),
            currentIndex: 0,
            score: 0,
            timeLimit: timeLimit,
            timeLeft: timeLimit,
            timer: null,
            isActive: true
        };

        this.startSpeedTimer();
        this.renderSpeedQuestion();
    }

    startSpeedTimer() {
        this.currentSpeedChallenge.timer = setInterval(() => {
            this.currentSpeedChallenge.timeLeft--;
            
            if (this.currentSpeedChallenge.timeLeft <= 0) {
                this.finishSpeedChallenge();
            } else {
                this.updateSpeedTimer();
            }
        }, 1000);
    }

    updateSpeedTimer() {
        const timerElement = document.querySelector('.speed-time');
        if (timerElement) {
            timerElement.textContent = this.currentSpeedChallenge.timeLeft;
            
            // Change color based on time left
            if (this.currentSpeedChallenge.timeLeft <= 10) {
                timerElement.style.color = '#dc3545';
            } else if (this.currentSpeedChallenge.timeLeft <= 30) {
                timerElement.style.color = '#fd7e14';
            }
        }
    }

    renderSpeedQuestion() {
        if (!this.currentSpeedChallenge.isActive) return;
        
        const container = document.getElementById('speedContent');
        const currentWord = this.currentSpeedChallenge.words[this.currentSpeedChallenge.currentIndex % this.currentSpeedChallenge.words.length];
        
        // Determine question type randomly (English to Vietnamese or Vietnamese to English)
        const isEnToVi = Math.random() < 0.5;
        let questionText, correctAnswer, questionType, isVietnamese;
        
        if (isEnToVi) {
            questionText = currentWord.english;
            correctAnswer = currentWord.vietnamese;
            questionType = 'Chọn nghĩa tiếng Việt:';
            isVietnamese = true;
        } else {
            questionText = currentWord.vietnamese;
            correctAnswer = currentWord.english;
            questionType = 'Chọn từ tiếng Anh:';
            isVietnamese = false;
        }
        
        // Generate wrong answers
        const wrongAnswers = this.generateSpeedWrongAnswers(correctAnswer, isVietnamese);
        const allOptions = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
        
        container.innerHTML = `
            <div class="speed-timer">
                <div class="speed-time">${this.currentSpeedChallenge.timeLeft}</div>
                <div class="speed-score">Điểm: ${this.currentSpeedChallenge.score}</div>
            </div>
            
            <div class="speed-question">
                <div class="question-type-label">${questionType}</div>
                <div class="speed-word-container">
                    <div class="speed-word">${questionText}</div>
                    ${isEnToVi ? `
                        <button class="pronunciation-btn" onclick="app.speakEnglishOnly('${currentWord.english}')" title="Phát âm tiếng Anh">
                            <i class="fas fa-volume-up"></i>
                        </button>
                    ` : ''}
                </div>
                <div class="speed-options">
                    ${allOptions.map(option => `
                        <div class="speed-option" onclick="app.selectSpeedAnswer('${option}', '${correctAnswer}')">
                            ${option}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    generateSpeedWrongAnswers(correctAnswer, isVietnamese) {
        // Use selected words for generating wrong answers
        const selectedWords = this.getSelectedPracticeWords('speed');
        const allAnswers = selectedWords.map(word => isVietnamese ? word.vietnamese : word.english);
        const wrongAnswers = allAnswers.filter(answer => answer !== correctAnswer);
        
        // Shuffle and take 3 random wrong answers
        return wrongAnswers.sort(() => Math.random() - 0.5).slice(0, 3);
    }

    selectSpeedAnswer(selectedAnswer, correctAnswer) {
        if (!this.currentSpeedChallenge.isActive) return;
        
        const isCorrect = selectedAnswer === correctAnswer;
        
        // Visual feedback
        document.querySelectorAll('.speed-option').forEach(option => {
            if (option.textContent.trim() === selectedAnswer) {
                option.classList.add(isCorrect ? 'correct' : 'incorrect');
            } else if (option.textContent.trim() === correctAnswer) {
                option.classList.add('correct');
            }
        });
        
        if (isCorrect) {
            this.currentSpeedChallenge.score++;
        }
        
        this.currentSpeedChallenge.currentIndex++;
        
        setTimeout(() => {
            this.renderSpeedQuestion();
        }, 500);
    }

    finishSpeedChallenge() {
        this.currentSpeedChallenge.isActive = false;
        clearInterval(this.currentSpeedChallenge.timer);
        
        const questionsAnswered = this.currentSpeedChallenge.currentIndex;
        const accuracy = questionsAnswered > 0 ? Math.round((this.currentSpeedChallenge.score / questionsAnswered) * 100) : 0;
        
        const container = document.getElementById('speedContent');
        container.innerHTML = `
            <div class="practice-result">
                <h3><i class="fas fa-bolt" style="color: #4facfe;"></i> Hoàn thành Speed Challenge!</h3>
                <div class="quiz-score">${this.currentSpeedChallenge.score}</div>
                <p>Điểm số trong ${this.currentSpeedChallenge.timeLimit} giây</p>
                <p>Trả lời đúng: ${this.currentSpeedChallenge.score} / ${questionsAnswered} (${accuracy}%)</p>
                
                <div style="margin-top: 20px;">
                    <button class="btn btn-primary" onclick="app.startSpeedChallenge()">
                        <i class="fas fa-redo"></i> Thử lại
                    </button>
                    <button class="btn btn-secondary" onclick="app.backToModeSelector()">
                        <i class="fas fa-arrow-left"></i> Chọn chế độ khác
                    </button>
                </div>
            </div>
        `;
    }

    resetSpeedChallenge() {
        if (this.currentSpeedChallenge && this.currentSpeedChallenge.timer) {
            clearInterval(this.currentSpeedChallenge.timer);
        }
        this.currentSpeedChallenge = null;
        const container = document.getElementById('speedContent');
        if (container) {
            container.innerHTML = `
                <div class="speed-start">
                    <p>Trả lời nhanh nhất có thể trong thời gian cho phép!</p>
                    <button id="startSpeed" class="btn btn-primary">
                        <i class="fas fa-play"></i> Bắt đầu Speed Challenge
                    </button>
                </div>
            `;
            document.getElementById('startSpeed').addEventListener('click', () => this.startSpeedChallenge());
        }
    }

    // Listening Practice Implementation
    async startListeningPractice() {
        const selectedWords = this.getSelectedPracticeWords('listening');
        
        if (selectedWords.length === 0) {
            this.showMessage('Vui lòng chọn ít nhất một bài học để luyện tập!', 'error');
            return;
        }

        // Get custom number of questions with beautiful modal
        let numQuestions;
        try {
            const customQuestions = await this.showInputModal({
                title: '🎧 Tùy chỉnh Listening Practice',
                message: 'Bạn muốn luyện bao nhiêu câu hỏi?',
                label: 'Số câu hỏi:',
                type: 'number',
                min: 1,
                max: Math.max(selectedWords.length * 3, 100),
                defaultValue: '20',
                placeholder: 'VD: 20',
                hint: `Tối đa ${selectedWords.length} từ có sẵn. Nếu nhập nhiều hơn, từ sẽ được lặp lại.`
            });
            
            numQuestions = parseInt(customQuestions);
            if (isNaN(numQuestions) || numQuestions <= 0) {
                this.showMessage('Số câu hỏi không hợp lệ!', 'error');
                return;
            }
        } catch (error) {
            return; // User cancelled
        }

        // Generate questions with repetition if needed
        let practiceWords = [];
        if (numQuestions <= selectedWords.length) {
            // Enough words available
            practiceWords = [...selectedWords].sort(() => Math.random() - 0.5).slice(0, numQuestions);
        } else {
            // Need to repeat words
            practiceWords = [...selectedWords];
            while (practiceWords.length < numQuestions) {
                const remainingNeeded = numQuestions - practiceWords.length;
                const additionalWords = [...selectedWords].sort(() => Math.random() - 0.5).slice(0, remainingNeeded);
                practiceWords.push(...additionalWords);
            }
        }

        this.currentListeningPractice = {
            words: practiceWords,
            currentIndex: 0,
            correctAnswers: 0
        };

        this.renderListeningQuestion();
    }

    renderListeningQuestion() {
        const container = document.getElementById('listeningContent');
        const currentWord = this.currentListeningPractice.words[this.currentListeningPractice.currentIndex];
        
        // Determine question type randomly (English to Vietnamese or Vietnamese to English)
        const isEnToVi = Math.random() < 0.5;
        let questionText, correctAnswer, questionInstruction, isVietnamese;
        
        if (isEnToVi) {
            questionText = currentWord.english;
            correctAnswer = currentWord.vietnamese;
            questionInstruction = 'Nghe từ tiếng Anh và chọn nghĩa tiếng Việt:';
            isVietnamese = true;
        } else {
            questionText = currentWord.vietnamese;
            correctAnswer = currentWord.english;
            questionInstruction = 'Nghe từ tiếng Anh và chọn từ tiếng Anh tương ứng:';
            isVietnamese = false;
        }
        
        // Generate wrong answers
        const wrongAnswers = this.generateListeningWrongAnswers(correctAnswer, isVietnamese);
        const allOptions = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
        
        container.innerHTML = `
            <div class="listening-progress">
                <p>Câu ${this.currentListeningPractice.currentIndex + 1} / ${this.currentListeningPractice.words.length}</p>
            </div>
            
            <div class="listening-question">
                <p>${questionInstruction}</p>
                <div class="listening-audio-controls">
                    <button class="listening-audio-btn" onclick="app.speakEnglishOnly('${currentWord.english}')" title="Nghe từ tiếng Anh">
                        <i class="fas fa-volume-up"></i> Nghe từ tiếng Anh
                    </button>
                    ${!isEnToVi ? `
                        <div class="listening-text-display" style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 8px;">
                            <strong>Nghĩa tiếng Việt:</strong> ${questionText}
                        </div>
                    ` : ''}
                </div>
                
                <div class="listening-options">
                    ${allOptions.map(option => `
                        <div class="listening-option" onclick="app.selectListeningAnswer('${option}', '${correctAnswer}')">
                            ${option}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Auto play the English word ONLY
        setTimeout(() => {
            this.speakEnglishOnly(currentWord.english);
        }, 500);
    }

    generateListeningWrongAnswers(correctAnswer, isVietnamese) {
        // Use selected words for generating wrong answers
        const selectedWords = this.getSelectedPracticeWords('listening');
        const allAnswers = selectedWords.map(word => isVietnamese ? word.vietnamese : word.english);
        const wrongAnswers = allAnswers.filter(answer => answer !== correctAnswer);
        
        // Shuffle and take 3 random wrong answers
        return wrongAnswers.sort(() => Math.random() - 0.5).slice(0, 3);
    }

    selectListeningAnswer(selectedAnswer, correctAnswer) {
        const isCorrect = selectedAnswer === correctAnswer;
        
        // Visual feedback
        document.querySelectorAll('.listening-option').forEach(option => {
            if (option.textContent.trim() === selectedAnswer) {
                option.classList.add(isCorrect ? 'correct' : 'incorrect');
            } else if (option.textContent.trim() === correctAnswer) {
                option.classList.add('correct');
            }
        });
        
        if (isCorrect) {
            this.currentListeningPractice.correctAnswers++;
        }
        
        setTimeout(() => {
            if (this.currentListeningPractice.currentIndex < this.currentListeningPractice.words.length - 1) {
                this.currentListeningPractice.currentIndex++;
                this.renderListeningQuestion();
            } else {
                this.finishListeningPractice();
            }
        }, 1500);
    }

    finishListeningPractice() {
        const accuracy = Math.round((this.currentListeningPractice.correctAnswers / this.currentListeningPractice.words.length) * 100);
        const container = document.getElementById('listeningContent');
        
        container.innerHTML = `
            <div class="practice-result">
                <h3><i class="fas fa-headphones" style="color: #4facfe;"></i> Hoàn thành Listening Practice!</h3>
                <div class="quiz-score">${accuracy}%</div>
                <p>Đúng ${this.currentListeningPractice.correctAnswers} / ${this.currentListeningPractice.words.length} từ</p>
                
                <div style="margin-top: 20px;">
                    <button class="btn btn-primary" onclick="app.startListeningPractice()">
                        <i class="fas fa-redo"></i> Luyện lại
                    </button>
                    <button class="btn btn-secondary" onclick="app.backToModeSelector()">
                        <i class="fas fa-arrow-left"></i> Chọn chế độ khác
                    </button>
                </div>
            </div>
        `;
    }

    resetListeningPractice() {
        this.currentListeningPractice = null;
        const container = document.getElementById('listeningContent');
        if (container) {
            container.innerHTML = `
                <div class="listening-start">
                    <p>Nghe và chọn nghĩa đúng của từ!</p>
                    <button id="startListening" class="btn btn-primary">
                        <i class="fas fa-play"></i> Bắt đầu Listening Practice
                    </button>
                </div>
            `;
            document.getElementById('startListening').addEventListener('click', () => this.startListeningPractice());
        }
    }

    // Practice Lesson Selection Methods
    renderPracticeLessonCheckboxes(mode) {
        const container = document.getElementById(`${mode}LessonCheckboxes`);
        if (!container) return;

        container.innerHTML = this.lessons.map(lesson => {
            const wordCount = this.words.filter(word => word.lessonId === lesson.id).length;
            const isSelected = this.selectedPracticeLessons[mode].includes(lesson.id);
            
            return `
                <div class="practice-lesson-checkbox-item ${isSelected ? 'selected' : ''}" 
                     onclick="app.togglePracticeLesson('${mode}', '${lesson.id}')">
                    <div class="practice-lesson-checkbox ${isSelected ? 'checked' : ''}"></div>
                    <div class="practice-lesson-checkbox-color color-${lesson.color}"></div>
                    <div class="practice-lesson-checkbox-label">${lesson.name}</div>
                    <div class="practice-lesson-checkbox-count">${wordCount} từ</div>
                </div>
            `;
        }).join('');

        this.updatePracticeInfo(mode);
    }

    togglePracticeLesson(mode, lessonId) {
        const index = this.selectedPracticeLessons[mode].indexOf(lessonId);
        
        if (index > -1) {
            this.selectedPracticeLessons[mode].splice(index, 1);
        } else {
            this.selectedPracticeLessons[mode].push(lessonId);
        }
        
        this.renderPracticeLessonCheckboxes(mode);
    }

    selectAllPracticeLessons(mode) {
        this.selectedPracticeLessons[mode] = this.lessons.map(lesson => lesson.id);
        this.renderPracticeLessonCheckboxes(mode);
    }

    deselectAllPracticeLessons(mode) {
        this.selectedPracticeLessons[mode] = [];
        this.renderPracticeLessonCheckboxes(mode);
    }

    updatePracticeInfo(mode) {
        const infoElement = document.getElementById(`${mode}SelectedInfo`);
        if (!infoElement) return;

        const selectedCount = this.selectedPracticeLessons[mode].length;
        const selectedWords = this.getSelectedPracticeWords(mode);
        
        if (selectedCount === 0) {
            infoElement.innerHTML = '<i class="fas fa-info-circle"></i> Chưa chọn bài học nào';
        } else if (selectedCount === this.lessons.length) {
            infoElement.innerHTML = `<i class="fas fa-check-circle"></i> Đã chọn tất cả ${this.lessons.length} bài học (${selectedWords.length} từ)`;
        } else {
            infoElement.innerHTML = `<i class="fas fa-check-circle"></i> Đã chọn ${selectedCount} bài học (${selectedWords.length} từ)`;
        }
    }

    getSelectedPracticeWords(mode) {
        if (this.selectedPracticeLessons[mode].length === 0) {
            return [];
        }
        
        return this.words.filter(word => 
            this.selectedPracticeLessons[mode].includes(word.lessonId)
        );
    }

    // Additional methods for onclick handlers - localStorage version
    async createManualBackup() {
        try {
            const data = {
                lessons: this.lessons,
                words: this.words,
                exportDate: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `vocabulary-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.showMessage('Tạo backup thành công!', 'success');
        } catch (error) {
            this.showMessage('Lỗi tạo backup: ' + error.message, 'error');
        }
    }

    async exportData() {
        return this.createManualBackup(); // Same as backup for localStorage
    }

    async importData(event) {
        try {
            const file = event.target.files[0];
            if (!file) return;
            
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (!data.lessons || !data.words) {
                throw new Error('File không đúng định dạng');
            }
            
            const confirmImport = confirm('Nhập dữ liệu sẽ ghi đè lên dữ liệu hiện tại. Bạn có chắc chắn?');
            if (!confirmImport) return;
            
            this.lessons = data.lessons;
            this.words = data.words;
            await this.saveToStorage();
            
            this.updateStats();
            this.renderWordsList();
            this.renderLessonsList();
            this.updateLessonSelectors();
            this.updateCurrentLessonDisplay();
            
            this.showMessage('Nhập dữ liệu thành công!', 'success');
        } catch (error) {
            this.showMessage('Lỗi nhập dữ liệu: ' + error.message, 'error');
        }
    }

    async checkMigrationStatus() {
        try {
            const statusEl = document.getElementById('migrationStatusDisplay');
            if (statusEl) {
                statusEl.innerHTML = `
                    <h4>Trạng thái Migration:</h4>
                    <p><strong>Loại storage:</strong> localStorage</p>
                    <p><strong>Số từ vựng:</strong> ${this.words?.length || 0}</p>
                    <p><strong>Số bài học:</strong> ${this.lessons?.length || 0}</p>
                    <p><strong>Dung lượng:</strong> ~${Math.round(JSON.stringify(this.words).length / 1024)} KB</p>
                `;
            }
        } catch (error) {
            this.showMessage('Lỗi kiểm tra trạng thái: ' + error.message, 'error');
        }
    }

    async verifyMigration() {
        try {
            let hasIssues = false;
            const issues = [];
            
            // Check data integrity
            if (!this.lessons || this.lessons.length === 0) {
                issues.push('Không có bài học nào');
            }
            
            if (!this.words || this.words.length === 0) {
                issues.push('Không có từ vựng nào');
            }
            
            // Check word-lesson relationships
            for (const word of this.words) {
                if (!this.lessons.find(l => l.id === word.lessonId)) {
                    issues.push(`Từ "${word.english}" không thuộc bài học nào hợp lệ`);
                    hasIssues = true;
                }
            }
            
            const statusEl = document.getElementById('migrationStatusDisplay');
            if (statusEl) {
                if (hasIssues || issues.length > 0) {
                    statusEl.innerHTML = `
                        <h4>Kết quả xác minh:</h4>
                        <div style="color: #f44336;">
                            <p><strong>❌ Phát hiện vấn đề:</strong></p>
                            <ul>${issues.map(issue => `<li>${issue}</li>`).join('')}</ul>
                        </div>
                    `;
                } else {
                    statusEl.innerHTML = `
                        <h4>Kết quả xác minh:</h4>
                        <div style="color: #4CAF50;">
                            <p><strong>✅ Dữ liệu hoàn hảo!</strong></p>
                            <p>Tất cả dữ liệu đều nhất quán và hợp lệ.</p>
                        </div>
                    `;
                }
            }
            
        } catch (error) {
            this.showMessage('Lỗi xác minh: ' + error.message, 'error');
        }
    }

    // Backup methods that don't exist for localStorage
    async createBackup(description) {
        throw new Error('Backup chỉ có với IndexedDB. Vui lòng dùng "Tạo sao lưu ngay" thay thế.');
    }

    async restoreFromBackup(backupId) {
        this.showMessage('Backup chỉ có với IndexedDB', 'error');
    }

    async deleteBackup(backupId) {
        this.showMessage('Backup chỉ có với IndexedDB', 'error');
    }
}

// Extended VocabularyApp class with IndexedDB support
class VocabularyAppIndexedDB extends VocabularyApp {
    constructor() {
        // Initialize basic properties first
        super();
        
        // Override with storage adapter
        if (typeof StorageAdapter !== 'undefined') {
            this.storage = new StorageAdapter();
        } else {
            console.warn('StorageAdapter not available, falling back to localStorage');
            this.storage = null;
        }
        
        // Setup auto-backup for IndexedDB (different from localStorage)
        this.setupIndexedDBAutoBackup();
    }

    // Auto-backup system for IndexedDB
    setupIndexedDBAutoBackup() {
        // Create backup every 10 minutes for IndexedDB (less frequent than localStorage)
        setInterval(() => {
            this.createIndexedDBAutoBackup();
        }, 10 * 60 * 1000); // 10 minutes

        // Create backup on page unload
        window.addEventListener('beforeunload', () => {
            this.createIndexedDBAutoBackup();
        });

        // Auto-backup flag
        this.indexedDBAutoBackupEnabled = true;
    }

    async createIndexedDBAutoBackup() {
        if (!this.indexedDBAutoBackupEnabled || !this.storage) return;
        
        try {
            // Create auto backup with timestamp
            const timestamp = new Date().toLocaleString('vi-VN');
            const description = `Auto-backup ${timestamp}`;
            
            await this.storage.createBackup(description);
            console.log('🔄 IndexedDB auto-backup created:', description);
            
            // Keep only last 5 auto-backups (cleanup old ones)
            await this.cleanupOldAutoBackups();
            
        } catch (error) {
            console.error('❌ IndexedDB auto-backup failed:', error);
        }
    }

    async cleanupOldAutoBackups() {
        try {
            if (!this.storage || !this.storage.indexedDBStorage) return;
            
            const backups = await this.storage.indexedDBStorage.getAllBackups();
            
            // Filter auto-backups and sort by date
            const autoBackups = backups
                .filter(backup => backup.description.startsWith('Auto-backup'))
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Keep only 5 most recent auto-backups
            const backupsToDelete = autoBackups.slice(5);
            
            for (const backup of backupsToDelete) {
                await this.storage.indexedDBStorage.deleteBackup(backup.id);
                console.log('🗑️ Deleted old auto-backup:', backup.description);
            }
            
        } catch (error) {
            console.error('❌ Cleanup old backups failed:', error);
        }
    }

    async init() {
        try {
            if (this.storage) {
                // Initialize storage and load data
                await this.storage.init();
                await this.loadData();
            } else {
                // Fallback to parent init
                return super.init();
            }
            
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
            
            // Load sample data if no lessons exist AND storage is empty
            if (this.lessons.length === 0 && this.words.length === 0) {
                console.log('🔄 No data found, loading sample data...');
                await this.loadSampleData();
            } else {
                console.log('✅ Data loaded from IndexedDB:', {
                    lessons: this.lessons.length,
                    words: this.words.length
                });
            }
            
            console.log('✅ VocabularyAppIndexedDB initialized successfully');
            
            // Debug storage after initialization
            await this.debugStorage();
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.showMessage('Lỗi khởi tạo ứng dụng: ' + error.message, 'error');
            throw error;
        }
    }

    // Backup and restore methods for IndexedDB
    async createBackup(description) {
        if (this.storage && this.storage.createBackup) {
            return await this.storage.createBackup(description);
        }
        throw new Error('Backup chỉ có với IndexedDB');
    }

    async restoreFromBackup(backupId) {
        if (this.storage && this.storage.restoreFromBackup) {
            await this.storage.restoreFromBackup(backupId);
            // Reload data after restore
            await this.loadData();
            this.updateStats();
            this.renderWordsList();
            this.renderLessonsList();
            this.updateLessonSelectors();
            this.updateCurrentLessonDisplay();
            this.renderReviewLessonCheckboxes();
            this.showMessage('Đã khôi phục từ backup thành công!', 'success');
            return;
        }
        throw new Error('Restore chỉ có với IndexedDB');
    }

    async deleteBackup(backupId) {
        if (this.storage && this.storage.deleteBackup) {
            await this.storage.deleteBackup(backupId);
            // Update backups list in UI
            if (typeof updateBackupsList === 'function') {
                await updateBackupsList();
            }
            this.showMessage('Đã xóa backup thành công!', 'success');
            return;
        }
        throw new Error('Delete backup chỉ có với IndexedDB');
    }



    async loadData() {
        try {
            console.log('🔄 Loading data from IndexedDB...');
            
            // Load all data from storage
            this.lessons = await this.storage.getAllLessons() || [];
            this.words = await this.storage.getAllWords() || [];
            this.quizProgress = await this.storage.getProgress() || {
                totalQuestions: 0,
                correctAnswers: 0,
                streakCount: 0,
                bestStreak: 0
            };
            this.currentLessonId = await this.storage.getSetting('currentLessonId') || null;
            
            console.log('📊 IndexedDB data loaded:', {
                lessons: this.lessons.length,
                words: this.words.length,
                currentLessonId: this.currentLessonId
            });
            
            // Load practice lesson selections
            const savedPracticeLessons = await this.storage.getSetting('selectedPracticeLessons');
            if (savedPracticeLessons) {
                this.selectedPracticeLessons = typeof savedPracticeLessons === 'string' 
                    ? JSON.parse(savedPracticeLessons) 
                    : savedPracticeLessons;
            } else if (this.lessons.length > 0) {
                // Initialize with all lessons selected
                const allLessonIds = this.lessons.map(lesson => lesson.id);
                this.selectedPracticeLessons = {
                    quiz: [...allLessonIds],
                    flashcards: [...allLessonIds],
                    spelling: [...allLessonIds],
                    matching: [...allLessonIds],
                    speed: [...allLessonIds],
                    listening: [...allLessonIds]
                };
                await this.saveToStorage();
                console.log('🔧 Initialized practice lesson selections');
            }
            
            console.log('✅ Data loaded successfully from IndexedDB');
            
        } catch (error) {
            console.error('❌ Error loading data from IndexedDB:', error);
            
            // Initialize with empty data if loading fails
            this.lessons = [];
            this.words = [];
            this.quizProgress = {
                totalQuestions: 0,
                correctAnswers: 0,
                streakCount: 0,
                bestStreak: 0
            };
            this.currentLessonId = null;
            this.selectedPracticeLessons = {
                quiz: [],
                flashcards: [],
                spelling: [],
                matching: [],
                speed: [],
                listening: []
            };
            
            console.log('⚠️ Using empty data due to load error');
        }
    }

    // Backup and management methods
    async createManualBackup() {
        try {
            const description = await this.showInputModal({
            title: '💾 Tạo Backup',
            message: 'Nhập mô tả cho bản sao lưu của bạn:',
            label: 'Mô tả backup:',
            type: 'text',
            defaultValue: 'Sao lưu thủ công',
            placeholder: 'VD: Backup trước khi cập nhật...',
            hint: 'Mô tả sẽ giúp bạn nhận biết backup sau này.'
        });
            const backupId = await this.storage.createBackup(description);
            this.showMessage('Tạo sao lưu thành công!', 'success');
            
            // Update backups list if on backup tab
            if (typeof updateBackupsList === 'function') {
                updateBackupsList();
            }
            
            return backupId;
        } catch (error) {
            console.error('Backup creation failed:', error);
            this.showMessage('Lỗi tạo sao lưu: ' + error.message, 'error');
        }
    }

    async restoreFromBackup(backupId) {
        try {
            const confirmed = confirm('Bạn có chắc chắn muốn khôi phục từ bản sao lưu này? Dữ liệu hiện tại sẽ bị ghi đè.');
            if (!confirmed) return;

            await this.storage.indexedDBStorage.restoreFromBackup(backupId);
            
            // Reload data
            await this.loadData();
            this.updateStats();
            this.renderWordsList();
            this.renderLessonsList();
            this.updateLessonSelectors();
            this.updateCurrentLessonDisplay();
            this.renderReviewLessonCheckboxes();
            
            this.showMessage('Khôi phục dữ liệu thành công!', 'success');
            
        } catch (error) {
            console.error('Restore failed:', error);
            this.showMessage('Lỗi khôi phục: ' + error.message, 'error');
        }
    }

    async deleteBackup(backupId) {
        try {
            const confirmed = confirm('Bạn có chắc chắn muốn xóa bản sao lưu này?');
            if (!confirmed) return;

            await this.storage.indexedDBStorage.deleteBackup(backupId);
            this.showMessage('Xóa sao lưu thành công!', 'success');
            
            // Update backups list
            if (typeof updateBackupsList === 'function') {
                updateBackupsList();
            }
            
        } catch (error) {
            console.error('Delete backup failed:', error);
            this.showMessage('Lỗi xóa sao lưu: ' + error.message, 'error');
        }
    }

    async exportData() {
        try {
            const data = await this.storage.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `vocabulary-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showMessage('Xuất dữ liệu thành công!', 'success');
            
        } catch (error) {
            console.error('Export failed:', error);
            this.showMessage('Lỗi xuất dữ liệu: ' + error.message, 'error');
        }
    }

    async checkMigrationStatus() {
        try {
            const status = this.storage.getMigrationStatus();
            const verification = await this.storage.verifyMigration();
            
            const statusDisplay = document.getElementById('migrationStatusDisplay');
            if (statusDisplay) {
                statusDisplay.innerHTML = `
                    <h4>Trạng thái Migration:</h4>
                    <div class="status-item">
                        <span>Hoàn thành:</span>
                        <span class="${status?.completed ? 'success' : 'warning'}">${status?.completed ? 'Có' : 'Không'}</span>
                    </div>
                    <div class="status-item">
                        <span>Tiến độ:</span>
                        <span>${status?.progress || 0}%</span>
                    </div>
                    <div class="status-item">
                        <span>Xác minh dữ liệu:</span>
                        <span class="${verification?.success ? 'success' : 'error'}">${verification?.success ? 'Thành công' : 'Thất bại'}</span>
                    </div>
                    ${status?.errors?.length > 0 ? `
                    <div class="status-item">
                        <span>Lỗi:</span>
                        <span class="error">${status.errors.join(', ')}</span>
                    </div>
                    ` : ''}
                `;
            }
            
        } catch (error) {
            console.error('Check migration status failed:', error);
            this.showMessage('Lỗi kiểm tra trạng thái: ' + error.message, 'error');
        }
    }

    async verifyMigration() {
        try {
            const verification = await this.storage.verifyMigration();
            
            if (verification.success) {
                this.showMessage('Xác minh dữ liệu thành công! Tất cả dữ liệu đã được migration đúng.', 'success');
            } else {
                this.showMessage('Xác minh thất bại: ' + (verification.error || 'Dữ liệu không khớp'), 'error');
                console.log('Verification details:', verification.details);
            }
            
        } catch (error) {
            console.error('Verification failed:', error);
            this.showMessage('Lỗi xác minh: ' + error.message, 'error');
        }
    }

    // Export data to file for GitHub Pages backup (IndexedDB version)
    async exportDataToFile() {
        try {
            const exportData = {
                words: this.words,
                lessons: this.lessons,
                currentLessonId: this.currentLessonId,
                quizProgress: this.quizProgress,
                selectedPracticeLessons: this.selectedPracticeLessons,
                exportDate: new Date().toISOString(),
                version: '1.0',
                storageType: 'IndexedDB'
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `vocabulary-indexeddb-backup-${new Date().toISOString().split('T')[0]}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showMessage('📁 Đã xuất file backup IndexedDB thành công!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showMessage('❌ Lỗi xuất file backup!', 'error');
        }
    }

    // Import data from file (IndexedDB version)
    async importDataFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importData = JSON.parse(e.target.result);
                
                // Validate imported data
                if (!importData.words || !importData.lessons) {
                    throw new Error('File backup không hợp lệ');
                }

                // Confirm import
                if (confirm('Bạn có chắc chắn muốn nhập dữ liệu này? Dữ liệu hiện tại sẽ bị thay thế.')) {
                    this.words = importData.words;
                    this.lessons = importData.lessons;
                    this.currentLessonId = importData.currentLessonId;
                    this.quizProgress = importData.quizProgress || this.quizProgress;
                    this.selectedPracticeLessons = importData.selectedPracticeLessons || this.selectedPracticeLessons;
                    
                    // Save to IndexedDB
                    await this.saveToStorage();
                    this.updateStats();
                    this.renderWordsList();
                    this.renderLessonsList();
                    this.updateCurrentLessonDisplay();
                    
                    this.showMessage('✅ Đã nhập dữ liệu vào IndexedDB thành công!', 'success');
                }
            } catch (error) {
                console.error('Import error:', error);
                this.showMessage('❌ Lỗi nhập file backup!', 'error');
            }
        };
        
        reader.readAsText(file);
        event.target.value = ''; // Reset file input
    }

    // Manual trigger for auto-backup
    async createAutoBackup() {
        await this.createIndexedDBAutoBackup();
        this.showMessage('🔄 Đã tạo backup tự động!', 'success');
    }

    // Debug method to check IndexedDB status
    async debugStorage() {
        console.log('🔍 DEBUG: Checking IndexedDB storage...');
        
        if (!this.storage) {
            console.error('❌ Storage adapter not available');
            return;
        }

        try {
            const lessons = await this.storage.getAllLessons();
            const words = await this.storage.getAllWords();
            const progress = await this.storage.getProgress();
            const currentLessonId = await this.storage.getSetting('currentLessonId');
            
            console.log('📊 IndexedDB Debug Info:', {
                storage: !!this.storage,
                storageReady: this.storage.isReady,
                lessonsCount: lessons?.length || 0,
                wordsCount: words?.length || 0,
                currentLessonId: currentLessonId,
                progress: progress
            });
            
            if (lessons && lessons.length > 0) {
                console.log('📚 Lessons in IndexedDB:', lessons.map(l => ({ id: l.id, name: l.name, wordCount: words?.filter(w => w.lessonId === l.id).length || 0 })));
            }
            
            if (words && words.length > 0) {
                console.log('📖 Sample words in IndexedDB:', words.slice(0, 5).map(w => ({ english: w.english, vietnamese: w.vietnamese, lessonId: w.lessonId })));
            }
            
        } catch (error) {
            console.error('❌ Debug storage error:', error);
        }
    }
} 
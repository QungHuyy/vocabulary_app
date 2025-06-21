// Speech Manager - English Only
class SpeechManager {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.englishVoice = null;
        this.isSupported = 'speechSynthesis' in window;
        
        this.init();
    }

    async init() {
        if (!this.isSupported) {
            console.warn('Speech synthesis not supported');
            return;
        }

        await this.loadVoices();
    }

    async loadVoices() {
        return new Promise((resolve) => {
            const loadVoicesWhenAvailable = () => {
                this.voices = this.synth.getVoices();
                
                if (this.voices.length === 0) {
                    setTimeout(loadVoicesWhenAvailable, 100);
                    return;
                }

                // Find best English voice
                this.findBestEnglishVoice();
                resolve(this.voices);
            };

            if (this.voices.length === 0) {
                this.synth.addEventListener('voiceschanged', loadVoicesWhenAvailable);
                loadVoicesWhenAvailable();
            } else {
                this.findBestEnglishVoice();
                resolve(this.voices);
            }
        });
    }

    findBestEnglishVoice() {
        // Priority: US English > UK English > Any English > Default
        const englishVoices = this.voices.filter(voice => 
            voice.lang.toLowerCase().startsWith('en')
        );

        if (englishVoices.length === 0) {
            console.warn('No English voices available');
            return;
        }

        // Prefer US English
        this.englishVoice = englishVoices.find(voice => 
            voice.lang.toLowerCase().includes('en-us')
        ) || 
        // Then UK English
        englishVoices.find(voice => 
            voice.lang.toLowerCase().includes('en-gb')
        ) || 
        // Then any English
        englishVoices[0];

        console.log('Selected English voice:', this.englishVoice?.name);
    }

    /**
     * Check if text is English (basic check)
     * @param {string} text 
     * @returns {boolean}
     */
    isEnglishText(text) {
        if (!text || typeof text !== 'string') return false;
        
        // Remove spaces and check if text contains mainly ASCII characters
        const cleanText = text.trim();
        
        // Basic Vietnamese detection - contains Vietnamese characters
        const vietnamesePattern = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/;
        
        if (vietnamesePattern.test(cleanText)) {
            return false;
        }

        // If text is mostly ASCII and doesn't contain Vietnamese chars, consider it English
        return true;
    }

    /**
     * Speak text - Only English text will be spoken
     * @param {string} text 
     * @param {Object} options 
     */
    speak(text, options = {}) {
        if (!this.isSupported) {
            console.warn('Speech synthesis not supported');
            return;
        }

        if (!text || text.trim() === '') {
            console.warn('No text to speak');
            return;
        }

        // IMPORTANT: Only speak English text
        if (!this.isEnglishText(text)) {
            console.log('Skipping non-English text:', text);
            return;
        }

        // Cancel any ongoing speech
        this.stop();

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(text.trim());
        
        // Set voice properties
        utterance.lang = 'en-US';
        utterance.rate = options.rate || 0.8; // Slightly slower for learning
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume || 1;

        // Use English voice if available
        if (this.englishVoice) {
            utterance.voice = this.englishVoice;
        }

        // Event handlers
        utterance.onstart = () => {
            console.log('Speaking:', text);
            this.highlightSpeakingButton(text);
        };

        utterance.onend = () => {
            console.log('Finished speaking:', text);
            this.resetSpeakingButton();
        };

        utterance.onerror = (event) => {
            console.error('Speech error:', event.error);
            this.resetSpeakingButton();
        };

        // Speak
        this.synth.speak(utterance);
    }

    /**
     * Stop any ongoing speech
     */
    stop() {
        if (this.synth.speaking) {
            this.synth.cancel();
        }
    }

    /**
     * Check if currently speaking
     */
    isSpeaking() {
        return this.synth.speaking;
    }

    /**
     * Get available English voices
     */
    getEnglishVoices() {
        return this.voices.filter(voice => 
            voice.lang.toLowerCase().startsWith('en')
        );
    }

    /**
     * Set specific English voice
     */
    setEnglishVoice(voiceName) {
        const voice = this.voices.find(v => v.name === voiceName);
        if (voice && voice.lang.toLowerCase().startsWith('en')) {
            this.englishVoice = voice;
            console.log('English voice set to:', voice.name);
        } else {
            console.warn('Voice not found or not English:', voiceName);
        }
    }

    /**
     * Visual feedback for speaking buttons
     */
    highlightSpeakingButton(text) {
        const buttons = document.querySelectorAll('.pronunciation-btn, .btn-pronunciation, .listening-audio-btn');
        buttons.forEach(btn => {
            if (btn.onclick && btn.onclick.toString().includes(text)) {
                btn.style.background = 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)';
                btn.style.transform = 'scale(1.1)';
                btn.classList.add('speaking');
            }
        });
    }

    resetSpeakingButton() {
        const buttons = document.querySelectorAll('.pronunciation-btn, .btn-pronunciation, .listening-audio-btn');
        buttons.forEach(btn => {
            btn.style.background = '';
            btn.style.transform = '';
            btn.classList.remove('speaking');
        });
    }

    /**
     * Pronounce English word safely (helper method)
     */
    pronounceEnglish(englishWord) {
        if (!englishWord) return;
        
        // Ensure we only speak English
        if (this.isEnglishText(englishWord)) {
            this.speak(englishWord);
        } else {
            console.log('Word is not English, skipping pronunciation:', englishWord);
        }
    }

    /**
     * For practice modes - get the English text from a word object
     */
    speakWordObject(wordObj) {
        if (!wordObj) return;
        
        // Always speak the English part only
        if (wordObj.english) {
            this.pronounceEnglish(wordObj.english);
        }
    }
}

export { SpeechManager }; 
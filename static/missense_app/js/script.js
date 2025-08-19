document.addEventListener('DOMContentLoaded', function() {
    initializeModal();
    initializeTabs();
    initializeFileUpload();
    initializeFormValidation();
    initializeResultsAccordion();
    initializeCopyButtons();
    initializeExpandCollapse();
    initializeMobileMenu();

    const modal = document.getElementById('help-modal');
    if (modal) {
        trapFocus(modal);
    }
    addUIFeedback();
});

function initializeModal() {
    const helpButton = document.getElementById('help-button');
    const helpModal = document.getElementById('help-modal');
    const closeModalButton = document.getElementById('close-modal-button');
    const closeModalX = document.getElementById('close-modal');
    
    if (!helpButton || !helpModal) return;
    
    helpButton.addEventListener('click', function() {
        helpModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        const focusableElements = helpModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusableElements.length) {
            focusableElements[0].focus();
        }
        
        helpModal.setAttribute('aria-hidden', 'false');
    });
    
    if (closeModalX) {
        closeModalX.addEventListener('click', closeModal);
    }
    
    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeModal);
    }
    
    helpModal.addEventListener('click', function(e) {
        if (e.target === helpModal) {
            closeModal();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && helpModal.style.display === 'flex') {
            closeModal();
        }
    });
    
    function closeModal() {
        helpModal.style.display = 'none';
        document.body.style.overflow = '';
        
        helpButton.focus();        
        helpModal.setAttribute('aria-hidden', 'true');
    }
}

function initializeTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const inputTypeField = document.getElementById('input-type');
    
    if (!tabs.length || !tabContents.length || !inputTypeField) return;
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            this.classList.add('active');
            this.setAttribute('aria-selected', 'true');
            
            tabContents.forEach(content => content.classList.remove('active'));
            const activeContent = document.getElementById(tabId + '-content');
            if (activeContent) {
                activeContent.classList.add('active');
            }
            inputTypeField.value = tabId;
        });
        
        tab.addEventListener('keydown', function(e) {
            let index = Array.from(tabs).indexOf(this);
            
            if (e.key === 'ArrowRight') {
                index = (index + 1) % tabs.length;
                tabs[index].focus();
                tabs[index].click();
                e.preventDefault();
            } else if (e.key === 'ArrowLeft') {
                index = (index - 1 + tabs.length) % tabs.length;
                tabs[index].focus();
                tabs[index].click();
                e.preventDefault();
            }
        });
    });
}

function initializeFileUpload() {
    const fileInput = document.getElementById('file-input');
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const removeFileButton = document.getElementById('remove-file');
    
    if (!fileInput || !fileUploadArea || !fileInfo) return;
    
    fileUploadArea.addEventListener('click', function() {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            handleFile(this.files[0]);
        }
    });
    
    fileUploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('dragover');
    });
    
    fileUploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragover');
    });
    
    fileUploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
    
    if (removeFileButton) {
        removeFileButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            fileInput.value = '';
            fileInfo.style.display = 'none';
            fileName.textContent = '';
            
            fileUploadArea.classList.add('highlight');
            setTimeout(() => {
                fileUploadArea.classList.remove('highlight');
            }, 500);
        });
    }
    
    function handleFile(file) {
        const validTypes = ['.txt', '.fasta', '.csv', '.tsv', 'text/plain', 'text/csv', 'text/tab-separated-values'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')); 
        
        if (!validTypes.some(type => file.type === type || fileExtension.toLowerCase() === type)) {
            alert('Invalid file type. Please upload a .txt, .fasta, .csv, or .tsv file.');
            return;
        }
        
        fileName.textContent = `${file.name} (${formatFileSize(file.size)})`;
        fileInfo.style.display = 'flex';
        
        fileUploadArea.classList.add('highlight');
        setTimeout(() => {
            fileUploadArea.classList.remove('highlight');
        }, 500);
    }
    
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' bytes';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    }
}

function initializeFormValidation() {
    const form = document.getElementById('mutation-form');
    const resetButton = document.getElementById('reset-button');
    
    if (!form) return;
    
    form.addEventListener('submit', function(event) {
        const activeTab = document.querySelector('.tab.active').getAttribute('data-tab');
        let isValid = true;
        
        if (activeTab === 'text') {
            const textInput = document.getElementById('peptide-input');
            if (!textInput || textInput.value.trim() === '') {
                showValidationError(textInput, 'Please enter a peptide sequence');
                isValid = false;
            } else {
                clearValidationError(textInput);
            }
        }
        
        if (activeTab === 'file') {
            const fileInput = document.getElementById('file-input');
            if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                showValidationError(document.getElementById('file-upload-area'), 'Please select a file');
                isValid = false;
            } else {
                clearValidationError(document.getElementById('file-upload-area'));
            }
        }
        
        if (!isValid) {
            event.preventDefault();
        }
    });
    
    // Reset form button
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            const inputArea = document.querySelectorAll('.input-area');
            inputArea.forEach(area => {
                clearValidationError(area);
            });
            
            const fileInfo = document.getElementById('file-info');
            if (fileInfo) {
                fileInfo.style.display = 'none';
            }
        });
    }
    
    function showValidationError(element, message) {
        clearValidationError(element);
        
        const errorElement = document.createElement('div');
        errorElement.className = 'validation-error';
        errorElement.textContent = message;
        errorElement.setAttribute('role', 'alert');
        
        element.closest('.input-area').classList.add('error');
        element.closest('.input-area').after(errorElement);
    }
    
    function clearValidationError(element) {
        if (!element) return;
        
        const inputArea = element.closest('.input-area');
        if (inputArea) {
            inputArea.classList.remove('error');
            
            const errorElement = inputArea.nextElementSibling;
            if (errorElement && errorElement.classList.contains('validation-error')) {
                errorElement.remove();
            }
        }
    }
}

function initializeResultsAccordion() {
    const resultHeaders = document.querySelectorAll('.result-header');
    
    resultHeaders.forEach(header => {
        header.addEventListener('click', function() {
            toggleResultSection(this);
        });
        
        header.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleResultSection(this);
            }
        });
    });
    
    function toggleResultSection(header) {
        const resultId = header.getAttribute('data-result');
        const content = document.getElementById(resultId + '-content');
        const toggleIcon = header.querySelector('.toggle-icon i');
        
        if (content.style.display === 'none' || !content.style.display) {
            content.style.display = 'block';
            toggleIcon.className = 'fas fa-chevron-up';
            header.setAttribute('aria-expanded', 'true');
        } else {
            content.style.display = 'none';
            toggleIcon.className = 'fas fa-chevron-down';
            header.setAttribute('aria-expanded', 'false');
        }
    }
}
function initializeCopyButtons() {
    const copyButtons = document.querySelectorAll('.copy-button');
    
    copyButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const contentId = this.getAttribute('data-content');
            const content = document.getElementById(contentId + '-content').querySelector('pre').textContent;
            
            navigator.clipboard.writeText(content)
                .then(() => {
                    // Save original icon
                    const originalIcon = this.querySelector('i').className;
                    
                    // Change to check icon
                    this.querySelector('i').className = 'fas fa-check';
                    
                    // Make button green briefly
                    this.style.color = 'var(--success-color)';
                    this.style.borderColor = 'var(--success-color)';
                    
                    // Reset after animation
                    setTimeout(() => {
                        this.querySelector('i').className = originalIcon;
                        this.style.color = '';
                        this.style.borderColor = '';
                    }, 2000);
                })
                .catch(err => {
                    console.error('Failed to copy text: ', err);
                    alert('Failed to copy text. Please try again.');
                });
        });
    });
}

function initializeExpandCollapse() {
    const expandAllBtn = document.getElementById('expand-all');
    const collapseAllBtn = document.getElementById('collapse-all');
    
    if (expandAllBtn) {
        expandAllBtn.addEventListener('click', function() {
            const resultContents = document.querySelectorAll('.result-content');
            const resultHeaders = document.querySelectorAll('.result-header');
            
            resultContents.forEach(content => {
                content.style.display = 'block';
            });
            
            resultHeaders.forEach(header => {
                header.setAttribute('aria-expanded', 'true');
                const toggleIcon = header.querySelector('.toggle-icon i');
                if (toggleIcon) {
                    toggleIcon.className = 'fas fa-chevron-up';
                }
            });
        });
    }
    
    if (collapseAllBtn) {
        collapseAllBtn.addEventListener('click', function() {
            const resultContents = document.querySelectorAll('.result-content');
            const resultHeaders = document.querySelectorAll('.result-header');
            
            resultContents.forEach(content => {
                content.style.display = 'none';
            });
            
            resultHeaders.forEach(header => {
                header.setAttribute('aria-expanded', 'false');
                const toggleIcon = header.querySelector('.toggle-icon i');
                if (toggleIcon) {
                    toggleIcon.className = 'fas fa-chevron-down';
                }
            });
        });
    }
}

function initializeMobileMenu() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navbarLinks = document.querySelector('.navbar-links');
    
    if (mobileMenuToggle && navbarLinks) {
        mobileMenuToggle.addEventListener('click', function() {
            navbarLinks.classList.toggle('show');
            
            const isExpanded = navbarLinks.classList.contains('show');
            mobileMenuToggle.setAttribute('aria-expanded', isExpanded);
            
            const icon = mobileMenuToggle.querySelector('i');
            if (icon) {
                icon.className = isExpanded ? 'fas fa-times' : 'fas fa-bars';
            }
        });
    }
}

function trapFocus(modal) {
    const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    modal.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } 
            else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    });
}

function addUIFeedback() {
    const buttons = document.querySelectorAll('button, .button, .download-button');
    
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            this.classList.add('clicked');
            setTimeout(() => {
                this.classList.remove('clicked');
            }, 200);
        });
    });
    
    const inputs = document.querySelectorAll('input, textarea');
    
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.closest('.input-area')?.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.closest('.input-area')?.classList.remove('focused');
        });
    });
}
// checklist-flow.js
// Park Avenue Bakery - Checklist Completion Flow

class ChecklistFlow {
    constructor() {
        this.templateId = null;
        this.template = null;
        this.completion = null;
        this.currentSectionIndex = 0;
        this.responses = {};
        this.staffName = '';
        this.alerts = [];
        this.init();
    }

    async init() {
        // Get template ID from URL
        const params = new URLSearchParams(window.location.search);
        this.templateId = params.get('id');

        if (!this.templateId) {
            window.location.href = '/dashboard/checklists.html';
            return;
        }

        // Check authentication
        const isAuthenticated = await this.checkAuth();
        if (!isAuthenticated) {
            window.location.href = '/dashboard/login.html';
            return;
        }

        // Load saved staff name
        this.staffName = localStorage.getItem('checklistStaffName') || '';

        this.hideLoading();
        this.setupEventListeners();

        await this.loadChecklist();
    }

    async checkAuth() {
        try {
            const response = await fetch('/api/prep-dashboard/auth');
            const data = await response.json();
            return data.authenticated === true;
        } catch (e) {
            return false;
        }
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const dashboardContent = document.getElementById('dashboardContent');
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        if (dashboardContent) dashboardContent.style.display = 'block';
    }

    setupEventListeners() {
        document.getElementById('prevBtn')?.addEventListener('click', () => this.prevSection());
        document.getElementById('nextBtn')?.addEventListener('click', () => this.nextSection());
        document.getElementById('saveExitBtn')?.addEventListener('click', () => this.saveAndExit());
        document.getElementById('cancelCompleteBtn')?.addEventListener('click', () => this.hideCompleteModal());
        document.getElementById('confirmCompleteBtn')?.addEventListener('click', () => this.confirmComplete());

        // Section nav clicks
        document.getElementById('sectionNav')?.addEventListener('click', (e) => {
            const navItem = e.target.closest('.section-nav-item');
            if (navItem) {
                const index = parseInt(navItem.dataset.index, 10);
                if (!isNaN(index)) {
                    this.goToSection(index);
                }
            }
        });
    }

    async loadChecklist() {
        try {
            const response = await fetch(`/api/prep-dashboard/checklists/${this.templateId}`);

            if (response.status === 401) {
                window.location.href = '/dashboard/login.html';
                return;
            }

            if (response.status === 404) {
                alert('Checklist not found');
                window.location.href = '/dashboard/checklists.html';
                return;
            }

            if (!response.ok) {
                throw new Error(`Failed to load checklist: ${response.status}`);
            }

            const data = await response.json();

            this.template = data.template;
            this.completion = data.completion;

            // Load existing responses
            if (this.completion && this.completion.responses) {
                this.responses = {};
                for (const [key, val] of Object.entries(this.completion.responses)) {
                    this.responses[key] = val.value;
                }
                if (this.completion.completedBy) {
                    this.staffName = this.completion.completedBy;
                }
            }

            this.render();

        } catch (error) {
            console.error('Error loading checklist:', error);
            alert('Failed to load checklist. Please try again.');
            window.location.href = '/dashboard/checklists.html';
        }
    }

    render() {
        if (!this.template) return;

        // Set title
        document.getElementById('checklistTitle').textContent = this.template.name;

        // Render section navigation
        this.renderSectionNav();

        // Render current section
        this.renderCurrentSection();

        // Update progress
        this.updateProgress();
    }

    renderSectionNav() {
        const nav = document.getElementById('sectionNav');
        if (!nav) return;

        nav.innerHTML = this.template.sections.map((section, index) => {
            const completedItems = this.countCompletedInSection(index);
            const totalItems = section.items.length;
            const isComplete = completedItems === totalItems;
            const isCurrent = index === this.currentSectionIndex;

            return `
                <button class="section-nav-item ${isCurrent ? 'current' : ''} ${isComplete ? 'complete' : ''}"
                        data-index="${index}">
                    <span class="nav-number">${index + 1}</span>
                    <span class="nav-title">${this.escapeHtml(section.title)}</span>
                    <span class="nav-status">${completedItems}/${totalItems}</span>
                </button>
            `;
        }).join('');
    }

    countCompletedInSection(sectionIndex) {
        const section = this.template.sections[sectionIndex];
        if (!section) return 0;
        return section.items.filter(item => this.responses[item.id] !== undefined).length;
    }

    renderCurrentSection() {
        const section = this.template.sections[this.currentSectionIndex];
        if (!section) return;

        // Update section title
        document.getElementById('currentSectionTitle').textContent = section.title;

        // Update section progress indicator
        document.getElementById('sectionProgress').textContent =
            `Section ${this.currentSectionIndex + 1} of ${this.template.sections.length}`;

        // Render items
        const container = document.getElementById('itemsContainer');
        if (!container) return;

        container.innerHTML = section.items.map(item => this.renderItem(item)).join('');

        // Attach event listeners to inputs
        this.attachInputListeners();

        // Update nav buttons
        this.updateNavButtons();
    }

    renderItem(item) {
        const value = this.responses[item.id];
        const hasAlert = this.checkItemAlert(item, value);

        let inputHtml = '';

        switch (item.type) {
            case 'checkbox':
                inputHtml = `
                    <label class="checkbox-item ${value ? 'checked' : ''}">
                        <input type="checkbox"
                               data-item-id="${item.id}"
                               ${value ? 'checked' : ''}>
                        <span class="checkbox-label">${this.escapeHtml(item.label)}</span>
                        ${item.required ? '<span class="required-indicator">*</span>' : ''}
                    </label>
                `;
                break;

            case 'number':
                inputHtml = `
                    <div class="input-item ${hasAlert ? 'has-alert' : ''}">
                        <label for="item-${item.id}">${this.escapeHtml(item.label)}
                            ${item.required ? '<span class="required-indicator">*</span>' : ''}
                        </label>
                        <div class="number-input-wrapper">
                            <input type="number"
                                   id="item-${item.id}"
                                   data-item-id="${item.id}"
                                   value="${value !== undefined ? value : ''}"
                                   placeholder="Enter value"
                                   inputmode="decimal"
                                   step="any">
                            ${item.unit ? `<span class="unit">${item.unit}</span>` : ''}
                        </div>
                        ${hasAlert ? `<div class="input-alert">${this.getAlertMessage(item, value)}</div>` : ''}
                    </div>
                `;
                break;

            case 'select':
                inputHtml = `
                    <div class="input-item">
                        <label for="item-${item.id}">${this.escapeHtml(item.label)}
                            ${item.required ? '<span class="required-indicator">*</span>' : ''}
                        </label>
                        <select id="item-${item.id}" data-item-id="${item.id}">
                            <option value="">Select...</option>
                            ${(item.options || []).map(opt => `
                                <option value="${this.escapeHtml(opt)}" ${value === opt ? 'selected' : ''}>
                                    ${this.escapeHtml(opt)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                `;
                break;

            case 'text':
                inputHtml = `
                    <div class="input-item">
                        <label for="item-${item.id}">${this.escapeHtml(item.label)}
                            ${item.required ? '<span class="required-indicator">*</span>' : ''}
                        </label>
                        <input type="text"
                               id="item-${item.id}"
                               data-item-id="${item.id}"
                               value="${value !== undefined ? this.escapeHtml(value) : ''}"
                               placeholder="Enter text">
                    </div>
                `;
                break;

            case 'photo':
                inputHtml = `
                    <div class="input-item photo-item">
                        <label>${this.escapeHtml(item.label)}
                            ${item.required ? '<span class="required-indicator">*</span>' : ''}
                        </label>
                        <div class="photo-input-wrapper">
                            ${value ? `
                                <div class="photo-preview">
                                    <img src="${value}" alt="Captured photo">
                                    <button type="button" class="btn-remove-photo" data-item-id="${item.id}">
                                        &#10005; Remove
                                    </button>
                                </div>
                            ` : `
                                <label class="photo-capture-btn">
                                    <input type="file"
                                           accept="image/*"
                                           capture="environment"
                                           data-item-id="${item.id}"
                                           data-type="photo"
                                           style="display: none;">
                                    <span class="capture-icon">&#128247;</span>
                                    <span>Take Photo</span>
                                </label>
                            `}
                        </div>
                    </div>
                `;
                break;

            default:
                inputHtml = `<div class="input-item">Unknown item type: ${item.type}</div>`;
        }

        return `<div class="checklist-item" data-item-id="${item.id}">${inputHtml}</div>`;
    }

    attachInputListeners() {
        const container = document.getElementById('itemsContainer');
        if (!container) return;

        // Checkbox changes
        container.querySelectorAll('input[type="checkbox"]').forEach(input => {
            input.addEventListener('change', (e) => {
                const itemId = e.target.dataset.itemId;
                this.saveResponse(itemId, e.target.checked);
                e.target.closest('.checkbox-item')?.classList.toggle('checked', e.target.checked);
            });
        });

        // Number inputs
        container.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('blur', (e) => {
                const itemId = e.target.dataset.itemId;
                const value = e.target.value ? parseFloat(e.target.value) : undefined;
                if (value !== undefined) {
                    this.saveResponse(itemId, value);
                }
            });
        });

        // Select changes
        container.querySelectorAll('select').forEach(select => {
            select.addEventListener('change', (e) => {
                const itemId = e.target.dataset.itemId;
                if (e.target.value) {
                    this.saveResponse(itemId, e.target.value);
                }
            });
        });

        // Text inputs
        container.querySelectorAll('input[type="text"]').forEach(input => {
            input.addEventListener('blur', (e) => {
                const itemId = e.target.dataset.itemId;
                if (e.target.value) {
                    this.saveResponse(itemId, e.target.value);
                }
            });
        });

        // Photo inputs
        container.querySelectorAll('input[data-type="photo"]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.handlePhotoCapture(e);
            });
        });

        // Remove photo buttons
        container.querySelectorAll('.btn-remove-photo').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.dataset.itemId;
                delete this.responses[itemId];
                this.renderCurrentSection();
                this.updateProgress();
            });
        });
    }

    async handlePhotoCapture(e) {
        const file = e.target.files[0];
        if (!file) return;

        const itemId = e.target.dataset.itemId;

        // Compress and convert to data URL
        try {
            const dataUrl = await this.compressImage(file, 1200);
            this.responses[itemId] = dataUrl;
            this.renderCurrentSection();
            this.updateProgress();

            // Save to server (MVP: just saves the data URL as value)
            this.saveResponse(itemId, dataUrl);
        } catch (error) {
            console.error('Error processing photo:', error);
            this.showAlert('Failed to process photo. Please try again.');
        }
    }

    compressImage(file, maxWidth) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async saveResponse(itemId, value) {
        this.responses[itemId] = value;
        this.updateProgress();
        this.renderSectionNav();

        // Check for alert
        const item = this.findItem(itemId);
        if (item) {
            const hasAlert = this.checkItemAlert(item, value);
            if (hasAlert) {
                this.showAlert(this.getAlertMessage(item, value));
            }
        }

        // Save to server
        try {
            const response = await fetch(`/api/prep-dashboard/checklists/${this.templateId}/response`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemId,
                    value,
                    completedBy: this.staffName || 'Staff'
                })
            });

            if (!response.ok) {
                console.error('Failed to save response');
            }
        } catch (error) {
            console.error('Error saving response:', error);
        }
    }

    findItem(itemId) {
        for (const section of this.template.sections) {
            const item = section.items.find(i => i.id === itemId);
            if (item) return item;
        }
        return null;
    }

    checkItemAlert(item, value) {
        if (!item.alertIf || value === undefined) return false;
        if (typeof value !== 'number') return false;

        if (item.alertIf.above !== undefined && value > item.alertIf.above) return true;
        if (item.alertIf.below !== undefined && value < item.alertIf.below) return true;

        return false;
    }

    getAlertMessage(item, value) {
        if (!item.alertIf) return '';

        if (item.alertIf.above !== undefined && value > item.alertIf.above) {
            return `Warning: Value exceeds ${item.alertIf.above}${item.unit || ''} limit!`;
        }
        if (item.alertIf.below !== undefined && value < item.alertIf.below) {
            return `Warning: Value is below ${item.alertIf.below}${item.unit || ''} minimum!`;
        }
        return '';
    }

    showAlert(message) {
        const toast = document.getElementById('alertToast');
        const messageEl = document.getElementById('alertMessage');

        if (toast && messageEl) {
            messageEl.textContent = message;
            toast.style.display = 'flex';

            setTimeout(() => {
                toast.style.display = 'none';
            }, 4000);
        }
    }

    updateProgress() {
        let completed = 0;
        let total = 0;

        for (const section of this.template.sections) {
            total += section.items.length;
            completed += section.items.filter(item => this.responses[item.id] !== undefined).length;
        }

        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        document.getElementById('progressCounter').textContent = `${completed} / ${total}`;
        document.getElementById('progressFill').style.width = `${percent}%`;
    }

    updateNavButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        if (prevBtn) {
            prevBtn.disabled = this.currentSectionIndex === 0;
        }

        if (nextBtn) {
            const isLastSection = this.currentSectionIndex === this.template.sections.length - 1;
            nextBtn.textContent = isLastSection ? 'Complete' : 'Next \u2192';
        }
    }

    prevSection() {
        if (this.currentSectionIndex > 0) {
            this.currentSectionIndex--;
            this.renderCurrentSection();
            this.renderSectionNav();
            window.scrollTo(0, 0);
        }
    }

    nextSection() {
        if (this.currentSectionIndex < this.template.sections.length - 1) {
            this.currentSectionIndex++;
            this.renderCurrentSection();
            this.renderSectionNav();
            window.scrollTo(0, 0);
        } else {
            // Last section - show complete modal
            this.showCompleteModal();
        }
    }

    goToSection(index) {
        if (index >= 0 && index < this.template.sections.length) {
            this.currentSectionIndex = index;
            this.renderCurrentSection();
            this.renderSectionNav();
            window.scrollTo(0, 0);
        }
    }

    showCompleteModal() {
        // Check for missing required items
        const missingItems = [];
        for (const section of this.template.sections) {
            for (const item of section.items) {
                if (item.required && this.responses[item.id] === undefined) {
                    missingItems.push(item.label);
                }
            }
        }

        const modal = document.getElementById('completeModal');
        const message = document.getElementById('completionMessage');
        const staffInput = document.getElementById('staffName');

        if (missingItems.length > 0) {
            message.innerHTML = `
                <strong>Missing required items:</strong>
                <ul class="missing-items-list">
                    ${missingItems.map(item => `<li>${this.escapeHtml(item)}</li>`).join('')}
                </ul>
                <p>Please complete all required items before submitting.</p>
            `;
            document.getElementById('confirmCompleteBtn').disabled = true;
        } else {
            message.textContent = 'All items have been completed. Ready to submit?';
            document.getElementById('confirmCompleteBtn').disabled = false;
        }

        // Show alerts summary if any
        const alertsDiv = document.getElementById('alertsSummary');
        const alertItems = this.getAlertItems();
        if (alertItems.length > 0) {
            alertsDiv.innerHTML = `
                <div class="alerts-warning">
                    <strong>&#9888; Alerts:</strong>
                    <ul>
                        ${alertItems.map(a => `<li>${this.escapeHtml(a)}</li>`).join('')}
                    </ul>
                </div>
            `;
            alertsDiv.style.display = 'block';
        } else {
            alertsDiv.style.display = 'none';
        }

        staffInput.value = this.staffName;
        modal.style.display = 'flex';
    }

    getAlertItems() {
        const alerts = [];
        for (const section of this.template.sections) {
            for (const item of section.items) {
                const value = this.responses[item.id];
                if (this.checkItemAlert(item, value)) {
                    alerts.push(`${item.label}: ${value}${item.unit || ''}`);
                }
            }
        }
        return alerts;
    }

    hideCompleteModal() {
        document.getElementById('completeModal').style.display = 'none';
    }

    async confirmComplete() {
        const staffInput = document.getElementById('staffName');
        this.staffName = staffInput.value.trim() || 'Staff';

        // Save staff name for future use
        localStorage.setItem('checklistStaffName', this.staffName);

        try {
            const response = await fetch(`/api/prep-dashboard/checklists/${this.templateId}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    completedBy: this.staffName
                })
            });

            if (!response.ok) {
                const data = await response.json();
                if (data.missingItems) {
                    alert(`Missing required items: ${data.missingItems.map(i => i.label).join(', ')}`);
                } else {
                    throw new Error(data.error || 'Failed to complete checklist');
                }
                return;
            }

            // Success - redirect to checklists page
            window.location.href = '/dashboard/checklists.html';

        } catch (error) {
            console.error('Error completing checklist:', error);
            alert('Failed to complete checklist. Please try again.');
        }
    }

    saveAndExit() {
        // Responses are already saved on blur/change
        // Just redirect back
        window.location.href = '/dashboard/checklists.html';
    }

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChecklistFlow();
});

// Admin Panel JavaScript
(function() {
    'use strict';
    
    let allTemplates = [];
    let filteredTemplates = [];
    let categories = [];
    let currentEditId = null;
    
    // Pagination
    let currentPage = 1;
    const itemsPerPage = 10;
    
    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
        checkAuth();
        initNavigation();
    });
    
    // Check authentication via API
    async function checkAuth() {
        try {
            const response = await fetch('api/auth.php', {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.is_admin) {
                document.getElementById('loginScreen').style.display = 'none';
                loadTemplates();
            } else {
                document.getElementById('loginScreen').style.display = 'flex';
            }
        } catch (error) {
            console.error('Auth check error:', error);
            document.getElementById('loginScreen').style.display = 'flex';
        }
    }
    
    // Handle login form
    window.handleLogin = async function(event) {
        event.preventDefault();
        
        const password = document.getElementById('passwordInput').value;
        const errorEl = document.getElementById('loginError');
        
        try {
            const response = await fetch('api/auth.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ password: password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                const redirectUrl = new URLSearchParams(window.location.search).get('redirect');
                if (redirectUrl) {
                    window.location.href = redirectUrl;
                    return;
                }

                document.getElementById('loginScreen').style.display = 'none';
                loadTemplates();
            } else {
                errorEl.textContent = '❌ ' + (data.error || 'Неверный пароль');
                errorEl.style.display = 'block';
            }
        } catch (error) {
            errorEl.textContent = '❌ Ошибка подключения';
            errorEl.style.display = 'block';
        }
    };
    
    // Logout function
    window.logout = async function() {
        try {
            await fetch('api/auth.php', { 
                method: 'DELETE',
                credentials: 'include'
            });
            window.location.reload();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };
    
    // Load templates from MySQL
    async function loadTemplates() {
        try {
            // Load from MySQL API
            const response = await fetch('api/templates.php', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            allTemplates = await response.json();
            
            // Load categories from API
            await loadCategoriesForSidebar();
            
            filteredTemplates = allTemplates;
            
            updateStatistics();
            renderCategories();
            renderTemplatesTable();
            populateCategoryFilter();
            
            console.log(`✓ Загружено ${allTemplates.length} шаблонов из MySQL`);
            
        } catch (error) {
            console.error('Ошибка загрузки шаблонов:', error);
            alert(`Ошибка загрузки данных: ${error.message}`);
            
            // Fallback to empty array
            allTemplates = [];
            filteredTemplates = [];
        }
    }
    
    // Load categories for sidebar
    async function loadCategoriesForSidebar() {
        try {
            const response = await fetch('api/categories.php?active=true');
            const result = await response.json();
            
            // Поддержка формата {success: true, data: [...]}
            const apiCategories = result.success && result.data ? result.data : (Array.isArray(result) ? result : []);
            
            categories = apiCategories.map(cat => ({
                id: cat.id,
                name: cat.name,
                emoji: cat.emoji,
                count: allTemplates.filter(t => t.category === cat.id).length
            }));
            
            console.log('[Sidebar] Categories loaded:', categories.length);
            console.log('[Admin] Categories synced with API'); // Sync marker
        } catch (error) {
            console.error('[Sidebar] Error loading categories:', error);
            categories = []; // Пустой массив при ошибке
        }
    }
    
    // Update statistics
    function updateStatistics() {
        const freeCount = allTemplates.filter(t => t.status === 'free').length;
        const paidCount = allTemplates.filter(t => t.status === 'paid').length;
        const totalDownloads = allTemplates.reduce((sum, t) => sum + (t.downloads || 0), 0);
        
        document.getElementById('statTotal').textContent = allTemplates.length;
        document.getElementById('statFree').textContent = freeCount;
        document.getElementById('statPaid').textContent = paidCount;
        document.getElementById('statDownloads').textContent = totalDownloads;
    }
    
    // Render categories in sidebar
    function renderCategories() {
        const container = document.getElementById('categoriesList');
        container.innerHTML = categories.map(cat => {
            const count = allTemplates.filter(t => t.category === cat.id).length;
            return `
                <div class="stat-item">
                    <span class="stat-label">${cat.emoji} ${cat.name}</span>
                    <span class="stat-value">${count}</span>
                </div>
            `;
        }).join('');
    }
    
    // Populate category filter
    function populateCategoryFilter() {
        const select = document.getElementById('filterCategory');
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = `${cat.emoji} ${cat.name}`;
            select.appendChild(option);
        });
    }
    
    // Render templates table
    function renderTemplatesTable() {
        const tbody = document.getElementById('templatesTableBody');
        
        if (filteredTemplates.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="table-empty">
                        <i class="fas fa-search"></i>
                        <p>Шаблоны не найдены</p>
                    </td>
                </tr>
            `;
            updatePagination();
            return;
        }
        
        // Calculate pagination
        const totalPages = Math.ceil(filteredTemplates.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageTemplates = filteredTemplates.slice(startIndex, endIndex);
        
        tbody.innerHTML = pageTemplates.map(template => {
            const category = categories.find(c => c.id === template.category);
            const categoryName = category ? `${category.emoji} ${category.name}` : template.category;
            
            const priceHTML = template.status === 'free' ?
                '<span class="price-badge price-free">Бесплатно</span>' :
                `<span class="price-badge price-paid">${template.price} ₽</span>`;
            
            return `
                <tr>
                    <td>
                        <img src="${template.thumbnail}" alt="${template.title}" class="template-thumb">
                    </td>
                    <td>
                        <strong>${template.title}</strong>
                        <span class="template-id">${template.id}</span>
                    </td>
                    <td>${categoryName}</td>
                    <td>${priceHTML}</td>
                    <td>${template.downloads || 0}</td>
                    <td class="table-actions">
                        <button class="action-btn action-btn-edit" onclick="editTemplate('${template.id}')" title="Редактировать">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn action-btn-copy" onclick="copyTemplateLink('${template.id}')" title="Копировать ссылку">
                            <i class="fas fa-link"></i>
                        </button>
                        <button class="action-btn action-btn-delete" onclick="deleteTemplate('${template.id}')" title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        updatePagination();
    }
    
    // Update pagination controls
    function updatePagination() {
        const totalPages = Math.ceil(filteredTemplates.length / itemsPerPage);
        const info = document.getElementById('paginationInfo');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        
        info.textContent = `Страница ${currentPage} из ${totalPages || 1} (${filteredTemplates.length} шаблонов)`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    }
    
    // Change page
    window.changePage = function(direction) {
        const totalPages = Math.ceil(filteredTemplates.length / itemsPerPage);
        const newPage = currentPage + direction;
        
        if (newPage >= 1 && newPage <= totalPages) {
            currentPage = newPage;
            renderTemplatesTable();
        }
    };
    
    // Filter templates
    window.filterTemplates = function() {
        const categoryFilter = document.getElementById('filterCategory').value;
        const statusFilter = document.getElementById('filterStatus').value;
        const searchQuery = document.getElementById('searchInput').value.toLowerCase();
        
        filteredTemplates = allTemplates.filter(template => {
            // Category filter
            if (categoryFilter !== 'all' && template.category !== categoryFilter) {
                return false;
            }
            
            // Status filter
            if (statusFilter !== 'all' && template.status !== statusFilter) {
                return false;
            }
            
            // Search filter
            if (searchQuery) {
                const matchTitle = template.title.toLowerCase().includes(searchQuery);
                const matchId = template.id.toLowerCase().includes(searchQuery);
                const matchDesc = (template.description || '').toLowerCase().includes(searchQuery);
                if (!matchTitle && !matchId && !matchDesc) {
                    return false;
                }
            }
            
            return true;
        });
        
        renderTemplatesTable();
    };
    
    // Open template modal
    window.openTemplateModal = function(templateId = null) {
        currentEditId = templateId;
        
        if (templateId) {
            // Edit mode
            const template = allTemplates.find(t => t.id === templateId);
            if (!template) return;
            
            document.getElementById('modalTitle').textContent = 'Редактировать шаблон';
            document.getElementById('templateId').value = template.id;
            document.getElementById('templateCategory').value = template.category;
            document.getElementById('templateTitle').value = template.title;
            document.getElementById('templateDescription').value = template.description || '';
            document.getElementById('templateStatus').value = template.status;
            document.getElementById('templatePrice').value = template.price || '';
            document.getElementById('templateBadge').value = template.badge || '';
            document.getElementById('templateTags').value = (template.tags || []).join(', ');
            document.getElementById('templateThumbnail').value = template.thumbnail || '';
            document.getElementById('templatePreview').value = template.preview || '';
            document.getElementById('templateData').value = template.data ? JSON.stringify(template.data, null, 2) : '';
            
            togglePriceField();
        } else {
            // Create mode
            document.getElementById('modalTitle').textContent = 'Создать шаблон';
            document.getElementById('templateForm').reset();
            generateTemplateId();
        }
        
        document.getElementById('templateModal').style.display = 'flex';
    };
    
    // Close template modal
    window.closeTemplateModal = function() {
        document.getElementById('templateModal').style.display = 'none';
        currentEditId = null;
    };
    
    // Edit template
    window.editTemplate = function(templateId) {
        openTemplateModal(templateId);
    };
    
    // Generate unique template ID
    window.generateTemplateId = function() {
        const category = document.getElementById('templateCategory').value;
        const title = document.getElementById('templateTitle').value;
        
        if (!category || !title) return;
        
        // Create slug from title
        const slug = title
            .toLowerCase()
            .replace(/[^a-z0-9а-я\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 30);
        
        // Add random suffix for uniqueness
        const random = Math.random().toString(36).substring(2, 6);
        const id = `${category}-${slug}-${random}`;
        
        document.getElementById('templateId').value = id;
    };
    
    // Toggle price field
    window.togglePriceField = function() {
        const status = document.getElementById('templateStatus').value;
        const priceGroup = document.getElementById('priceGroup');
        const priceInput = document.getElementById('templatePrice');
        
        if (status === 'paid') {
            priceGroup.style.display = 'block';
            priceInput.required = true;
        } else {
            priceGroup.style.display = 'none';
            priceInput.required = false;
        }
    };
    
    // Handle image upload (convert to base64 or upload to server)
    window.handleImageUpload = function(event, type) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result;
            
            if (type === 'thumbnail') {
                document.getElementById('templateThumbnail').value = dataUrl;
            } else if (type === 'preview') {
                document.getElementById('templatePreview').value = dataUrl;
            }
        };
        reader.readAsDataURL(file);
    };
    
    // Save template
    window.saveTemplate = async function(event) {
        event.preventDefault();
        
        const template = {
            id: document.getElementById('templateId').value,
            title: document.getElementById('templateTitle').value,
            description: document.getElementById('templateDescription').value,
            category: document.getElementById('templateCategory').value,
            status: document.getElementById('templateStatus').value,
            thumbnail: document.getElementById('templateThumbnail').value,
            preview: document.getElementById('templatePreview').value || document.getElementById('templateThumbnail').value,
            badge: document.getElementById('templateBadge').value || null,
            tags: document.getElementById('templateTags').value.split(',').map(t => t.trim()).filter(t => t)
        };
        
        if (template.status === 'paid') {
            template.price = parseInt(document.getElementById('templatePrice').value);
        } else {
            template.price = 0;
        }
        
        // Parse template data if provided
        const dataText = document.getElementById('templateData').value;
        if (dataText) {
            try {
                template.canvasData = JSON.parse(dataText);
            } catch (e) {
                alert('Ошибка в JSON данных шаблона');
                return;
            }
        }
        
        try {
            // Отправить на сервер MySQL
            const response = await fetch('api/templates.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(template)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                alert(`✓ Шаблон "${template.title}" сохранён`);
                closeTemplateModal();
                loadTemplates(); // Перезагрузить список
            } else {
                throw new Error(result.error || 'Не удалось сохранить');
            }
            
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            alert(`❌ Ошибка сохранения: ${error.message}`);
        }
        
        // Update categories count
        categories.forEach(cat => {
            cat.count = allTemplates.filter(t => t.category === cat.id).length;
        });
        
        saveToJSON();
        closeTemplateModal();
        filterTemplates();
        updateStatistics();
        renderCategories();
    };
    
    // Delete template
    window.deleteTemplate = async function(templateId) {
        if (!confirm('Удалить этот шаблон?')) return;
        
        try {
            // Отправить DELETE запрос на сервер
            const response = await fetch('api/templates.php', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ id: templateId })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Удалить из локального массива
                allTemplates = allTemplates.filter(t => t.id !== templateId);
                
                // Update categories count
                categories.forEach(cat => {
                    cat.count = allTemplates.filter(t => t.category === cat.id).length;
                });
                
                filterTemplates();
                updateStatistics();
                renderCategories();
                
                alert('✓ Шаблон успешно удалён');
            } else {
                throw new Error(result.error || 'Не удалось удалить');
            }
            
        } catch (error) {
            console.error('Ошибка удаления:', error);
            alert(`❌ Ошибка удаления: ${error.message}`);
        }
    };
    
    // Copy template link
    window.copyTemplateLink = function(templateId) {
        const url = `${window.location.origin}${window.location.pathname.replace('admin.html', 'editor.html')}?template=${templateId}`;
        
        navigator.clipboard.writeText(url).then(() => {
            alert(`Ссылка скопирована:\n${url}`);
        }).catch(err => {
            prompt('Скопируйте ссылку:', url);
        });
    };
    
    // Save to JSON (download file)
    function saveToJSON() {
        const data = {
            meta: {
                lastUpdate: new Date().toISOString().split('T')[0],
                total: allTemplates.length,
                version: '1.0.0'
            },
            categories: categories,
            templates: allTemplates
        };
        
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'templates.json';
        a.click();
        
        URL.revokeObjectURL(url);
        
        alert('Файл templates.json сохранён!\n\nЗамените файл data/templates.json для применения изменений.');
    }
    
    // Export templates to JSON
    window.exportTemplates = function() {
        saveToJSON();
    };
    
    // Sync localStorage templates to JSON
    window.syncTemplates = function() {
        const savedTemplates = JSON.parse(localStorage.getItem('savedTemplates') || '[]');
        
        if (savedTemplates.length === 0) {
            alert('❌ Нет шаблонов в localStorage для синхронизации');
            return;
        }
        
        if (!confirm(`Добавить ${savedTemplates.length} шаблонов из localStorage в data/templates.json?`)) {
            return;
        }
        
        // Merge with existing templates (avoid duplicates)
        const existingIds = allTemplates.map(t => t.id);
        const newTemplates = savedTemplates.filter(t => !existingIds.includes(t.id));
        
        if (newTemplates.length === 0) {
            alert('✅ Все шаблоны уже есть в JSON файле');
            return;
        }
        
        allTemplates = [...allTemplates, ...newTemplates];
        filteredTemplates = allTemplates;
        
        // Update counts
        updateStatistics();
        renderTemplatesTable();
        
        // Download updated JSON
        saveToJSON();
        
        alert(`✅ Добавлено ${newTemplates.length} новых шаблонов!\n\n💡 Скачайте JSON файл и замените data/templates.json`);
    };
    
    // Import templates
    window.importTemplates = function() {
        document.getElementById('importFileInput').click();
    };
    
    window.handleImportFile = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                if (confirm('Загрузить данные из файла? Текущие данные будут заменены.')) {
                    allTemplates = data.templates || [];
                    categories = data.categories || [];
                    filteredTemplates = allTemplates;
                    
                    updateStatistics();
                    renderCategories();
                    renderTemplatesTable();
                    populateCategoryFilter();
                }
            } catch (err) {
                alert('Ошибка чтения файла: ' + err.message);
            }
        };
        reader.readAsText(file);
    };
    
    // Load from editor
    window.loadFromEditor = function() {
        alert('Откройте редактор, создайте дизайн, затем сохраните JSON через "Сохранить проект".\nСкопируйте JSON и вставьте в поле "JSON данные шаблона".');
    };
    
    // Open in editor
    window.openInEditor = function() {
        const templateId = document.getElementById('templateId').value;
        if (!templateId) {
            alert('Сначала сохраните шаблон');
            return;
        }
        
        window.open(`editor.html?template=${templateId}`, '_blank');
    };
    
    // Close modal on background click
    document.addEventListener('click', function(e) {
        const modal = document.getElementById('templateModal');
        if (e.target === modal) {
            closeTemplateModal();
        }
        
        const categoriesModal = document.getElementById('categoriesModal');
        if (e.target === categoriesModal) {
            closeCategoriesModal();
        }
        
        const categoryFormModal = document.getElementById('categoryFormModal');
        if (e.target === categoryFormModal) {
            closeCategoryForm();
        }
    });
    
    // ==========================================
    // CATEGORIES MANAGEMENT
    // ==========================================
    
    let allCategories = [];
    
    // Open categories manager modal
    window.openCategoriesManager = async function() {
        document.getElementById('categoriesModal').style.display = 'flex';
        await loadCategoriesForManager();
    };
    
    // Close categories manager modal
    window.closeCategoriesModal = function() {
        document.getElementById('categoriesModal').style.display = 'none';
    };
    
    // Load categories into manager table
    async function loadCategoriesForManager() {
        try {
            const response = await fetch('api/categories.php', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            // Поддержка нового формата API: {success: true, data: [...]}
            if (result.success && result.data) {
                allCategories = result.data;
            } else if (Array.isArray(result)) {
                // Старый формат (массив напрямую)
                allCategories = result;
            } else {
                throw new Error(result.error || 'Invalid response format');
            }
            
            console.log('[Categories] Loaded:', allCategories.length);
            renderCategoriesTable();
        } catch (error) {
            console.error('[Categories] Error loading:', error);
            document.getElementById('categoriesTableBody').innerHTML = `
                <tr>
                    <td colspan="7" class="table-empty">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Ошибка загрузки категорий: ${error.message}</p>
                        <small>Проверьте консоль для деталей</small>
                    </td>
                </tr>
            `;
        }
    }
    
    // Render categories table
    function renderCategoriesTable() {
        const tbody = document.getElementById('categoriesTableBody');
        
        if (allCategories.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="table-empty">
                        <i class="fas fa-inbox"></i>
                        <p>Нет категорий</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = allCategories.map(cat => `
            <tr>
                <td style="font-size: 32px; text-align: center;">${cat.emoji}</td>
                <td><code>${cat.id}</code></td>
                <td><strong>${cat.name}</strong></td>
                <td>${cat.description || '—'}</td>
                <td style="text-align: center;">${cat.sort_order}</td>
                <td style="text-align: center;">
                    ${cat.is_active ? '<span style="color: #a6e3a1;">✓</span>' : '<span style="color: #f38ba8;">✗</span>'}
                </td>
                <td>
                    <button class="button button-sm" onclick="editCategory('${cat.id}')" title="Редактировать">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="button button-sm button-danger" onclick="deleteCategory('${cat.id}')" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    // Open category form (create)
    window.openCategoryForm = function() {
        document.getElementById('categoryFormTitle').textContent = 'Создать категорию';
        document.getElementById('categoryForm').reset();
        document.getElementById('categoryEditId').value = '';
        document.getElementById('categoryId').readOnly = false;
        document.getElementById('categoryFormModal').style.display = 'flex';
    };
    
    // Close category form
    window.closeCategoryForm = function() {
        document.getElementById('categoryFormModal').style.display = 'none';
    };
    
    // Edit category
    window.editCategory = function(id) {
        const category = allCategories.find(c => c.id === id);
        if (!category) return;
        
        document.getElementById('categoryFormTitle').textContent = 'Редактировать категорию';
        document.getElementById('categoryEditId').value = category.id;
        document.getElementById('categoryId').value = category.id;
        document.getElementById('categoryId').readOnly = true;
        document.getElementById('categoryName').value = category.name;
        document.getElementById('categoryEmoji').value = category.emoji;
        document.getElementById('categoryDescription').value = category.description || '';
        document.getElementById('categorySortOrder').value = category.sort_order || 0;
        document.getElementById('categoryIsActive').value = category.is_active ? 'true' : 'false';
        
        document.getElementById('categoryFormModal').style.display = 'flex';
    };
    
    // Save category (create or update)
    window.saveCategory = async function(event) {
        event.preventDefault();
        
        const editId = document.getElementById('categoryEditId').value;
        const isEdit = editId !== '';
        
        const categoryData = {
            id: document.getElementById('categoryId').value.trim().toLowerCase(),
            name: document.getElementById('categoryName').value.trim(),
            emoji: document.getElementById('categoryEmoji').value.trim(),
            description: document.getElementById('categoryDescription').value.trim(),
            sort_order: parseInt(document.getElementById('categorySortOrder').value),
            is_active: document.getElementById('categoryIsActive').value === 'true'
        };
        
        try {
            const url = isEdit ? 'api/categories.php' : 'api/categories.php';
            const method = isEdit ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(categoryData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert(isEdit ? '✅ Категория обновлена!' : '✅ Категория создана!');
                closeCategoryForm();
                await loadCategoriesForManager();
                await loadTemplates(); // Reload templates to update category filter
            } else {
                alert('❌ Ошибка: ' + (result.error || 'Неизвестная ошибка'));
            }
        } catch (error) {
            console.error('Error saving category:', error);
            alert('❌ Ошибка сохранения категории');
        }
    };
    
    // Delete category
    window.deleteCategory = async function(id) {
        if (!confirm(`Удалить категорию "${id}"?\n\nВнимание: шаблоны с этой категорией не будут удалены, но могут отображаться некорректно.`)) {
            return;
        }
        
        try {
            const response = await fetch(`api/categories.php?id=${encodeURIComponent(id)}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('✅ Категория удалена!');
                await loadCategoriesForManager();
                await loadTemplates();
            } else {
                alert('❌ Ошибка: ' + (result.error || 'Неизвестная ошибка'));
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            alert('❌ Ошибка удаления категории');
        }
    };

    // ============================================
    // PAYMENT SETTINGS SECTION
    // ============================================

    // Initialize navigation handlers
    function initNavigation() {
        document.getElementById('navTemplates')?.addEventListener('click', function() {
            showSection('templatesSection');
            setActiveNav('navTemplates');
            loadTemplates(); // Загрузить шаблоны при переключении
        });

        document.getElementById('navNews')?.addEventListener('click', function() {
            showSection('newsSection');
            setActiveNav('navNews');
        });

        document.getElementById('navPayment')?.addEventListener('click', function() {
            showSection('paymentSection');
            setActiveNav('navPayment');
            loadPaymentSettings();
        });

        document.getElementById('navStats')?.addEventListener('click', function() {
            showSection('statsSection');
            setActiveNav('navStats');
            loadStatistics();
        });
    }

    function showSection(sectionId) {
        const sections = ['templatesSection', 'newsSection', 'paymentSection', 'statsSection'];
        sections.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        
        const targetSection = document.getElementById(sectionId);
        if (targetSection) targetSection.style.display = 'block';
    }

    function setActiveNav(navId) {
        ['navTemplates', 'navNews', 'navPayment', 'navStats'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.background = id === navId ? 'rgba(116, 199, 236, 0.15)' : 'none';
            }
        });
    }

    // Load payment settings from config file
    window.loadPaymentSettings = async function() {
        try {
            const response = await fetch('api/payment-config.php', {
                credentials: 'include'
            });
            const config = await response.json();

            if (config.success) {
                document.getElementById('paymentShopId').value = config.data.shop_id || '';
                document.getElementById('paymentSecretKey').value = config.data.secret_key || '';
                document.getElementById('paymentTestMode').checked = config.data.test_mode || false;
                document.getElementById('paymentDevMode').checked = config.data.dev_mode || false;
                document.getElementById('paymentTemplatePrice').value = config.data.template_price || 700;
                document.getElementById('paymentSubscriptionMonthly').value = config.data.subscription_monthly || 700;
                document.getElementById('paymentSubscriptionYearly').value = config.data.subscription_yearly || 7000;
            }
        } catch (error) {
            console.error('Error loading payment settings:', error);
        }
    };

    // Save payment settings
    window.savePaymentSettings = async function() {
        const statusEl = document.getElementById('paymentSaveStatus');
        
        const data = {
            shop_id: document.getElementById('paymentShopId').value.trim(),
            secret_key: document.getElementById('paymentSecretKey').value.trim(),
            test_mode: document.getElementById('paymentTestMode').checked,
            dev_mode: document.getElementById('paymentDevMode').checked,
            template_price: parseInt(document.getElementById('paymentTemplatePrice').value) || 700,
            subscription_monthly: parseInt(document.getElementById('paymentSubscriptionMonthly').value) || 700,
            subscription_yearly: parseInt(document.getElementById('paymentSubscriptionYearly').value) || 7000
        };

        // Validation
        if (!data.shop_id || !data.secret_key) {
            statusEl.innerHTML = '<div style="background: rgba(243, 139, 168, 0.2); border: 1px solid #f38ba8; color: #f38ba8; padding: 1rem; border-radius: 8px;"><i class="fas fa-exclamation-circle"></i> Заполните все обязательные поля</div>';
            statusEl.style.display = 'block';
            return;
        }

        try {
            statusEl.innerHTML = '<div style="background: rgba(116, 199, 236, 0.2); border: 1px solid #74c7ec; color: #74c7ec; padding: 1rem; border-radius: 8px;"><i class="fas fa-spinner fa-spin"></i> Сохранение настроек...</div>';
            statusEl.style.display = 'block';

            const response = await fetch('api/payment-config.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                statusEl.innerHTML = '<div style="background: rgba(166, 227, 161, 0.2); border: 1px solid #a6e3a1; color: #a6e3a1; padding: 1rem; border-radius: 8px; animation: slideIn 0.3s ease-out;"><i class="fas fa-check-circle"></i> ✅ Настройки успешно сохранены! Изменения применены.</div>';
                statusEl.style.display = 'block';
                
                // Scroll to notification
                statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                
                setTimeout(() => {
                    statusEl.style.opacity = '0';
                    statusEl.style.transition = 'opacity 0.5s';
                    setTimeout(() => {
                        statusEl.style.display = 'none';
                        statusEl.style.opacity = '1';
                    }, 500);
                }, 5000);
            } else {
                statusEl.innerHTML = `<div style="background: rgba(243, 139, 168, 0.2); border: 1px solid #f38ba8; color: #f38ba8; padding: 1rem; border-radius: 8px; animation: slideIn 0.3s ease-out;"><i class="fas fa-times-circle"></i> ❌ Ошибка: ${result.error || 'Неизвестная ошибка'}</div>`;
                statusEl.style.display = 'block';
                statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } catch (error) {
            console.error('Error saving payment settings:', error);
            statusEl.innerHTML = '<div style="background: rgba(243, 139, 168, 0.2); border: 1px solid #f38ba8; color: #f38ba8; padding: 1rem; border-radius: 8px; animation: slideIn 0.3s ease-out;"><i class="fas fa-times-circle"></i> ❌ Ошибка сохранения настроек. Проверьте консоль.</div>';
            statusEl.style.display = 'block';
            statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    };

    // Test payment connection
    window.testPaymentConnection = async function() {
        const statusEl = document.getElementById('paymentSaveStatus');
        
        statusEl.innerHTML = '<div style="background: rgba(116, 199, 236, 0.2); border: 1px solid #74c7ec; color: #74c7ec; padding: 1rem; border-radius: 8px;"><i class="fas fa-spinner fa-spin"></i> Проверка подключения...</div>';
        statusEl.style.display = 'block';

        try {
            const response = await fetch('api/payment-test.php', {
                credentials: 'include'
            });
            const result = await response.json();

            if (result.success) {
                statusEl.innerHTML = `<div style="background: rgba(166, 227, 161, 0.2); border: 1px solid #a6e3a1; color: #a6e3a1; padding: 1rem; border-radius: 8px;">
                    <i class="fas fa-check-circle"></i> Подключение успешно!<br>
                    <small>Shop ID: ${result.shop_id}, Режим: ${result.test_mode ? 'TEST' : 'LIVE'}</small>
                </div>`;
            } else {
                statusEl.innerHTML = `<div style="background: rgba(243, 139, 168, 0.2); border: 1px solid #f38ba8; color: #f38ba8; padding: 1rem; border-radius: 8px;">
                    <i class="fas fa-times-circle"></i> Ошибка подключения<br>
                    <small>${result.error || 'Проверьте настройки ЮKassa'}</small>
                </div>`;
            }
        } catch (error) {
            console.error('Error testing connection:', error);
            statusEl.innerHTML = '<div style="background: rgba(243, 139, 168, 0.2); border: 1px solid #f38ba8; color: #f38ba8; padding: 1rem; border-radius: 8px;"><i class="fas fa-times-circle"></i> Ошибка проверки подключения</div>';
        }
    };

    // Copy webhook URL
    window.copyWebhookUrl = function() {
        const input = document.getElementById('paymentWebhookUrl');
        input.select();
        document.execCommand('copy');
        
        alert('✅ Webhook URL скопирован в буфер обмена!');
    };

    // ============================================
    // STATISTICS SECTION
    // ============================================

    // Load purchase statistics
    window.loadStatistics = async function() {
        try {
            const response = await fetch('api/purchase-stats.php', {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to load statistics');
            }

            const result = await response.json();

            if (result.success) {
                renderStatistics(result.data);
            } else {
                console.error('Error loading statistics:', result.error);
                alert('❌ Ошибка загрузки статистики');
            }
        } catch (error) {
            console.error('Error loading statistics:', error);
            alert('❌ Ошибка загрузки статистики');
        }
    };

    // Render statistics data
    function renderStatistics(data) {
        const summary = data.summary || {};
        const purchases = data.purchases || [];
        const subscriptions = data.subscriptions || [];

        // Update summary cards
        const totalRevenue = (summary.purchases?.total_revenue || 0) + (summary.subscriptions?.subscription_revenue || 0);
        document.getElementById('totalRevenue').textContent = totalRevenue.toLocaleString('ru-RU') + ' ₽';
        document.getElementById('totalPurchases').textContent = summary.purchases?.total_purchases || 0;
        document.getElementById('activeSubs').textContent = summary.subscriptions?.active_subscriptions || 0;
        document.getElementById('uniqueCustomers').textContent = summary.purchases?.unique_customers || 0;

        // Render top templates
        renderTopTemplates(summary.top_templates || []);

        // Render purchases table
        renderPurchasesTable(purchases);

        // Render subscriptions table
        renderSubscriptionsTable(subscriptions);
    }

    // Render top templates list
    function renderTopTemplates(topTemplates) {
        const container = document.getElementById('topTemplatesContainer');
        
        if (topTemplates.length === 0) {
            container.innerHTML = '<p style="color: #9399b2; text-align: center; padding: 2rem;">Пока нет данных о покупках</p>';
            return;
        }

        let html = '<div style="display: grid; gap: 0.75rem;">';
        
        topTemplates.forEach((item, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            const barWidth = (item.purchase_count / topTemplates[0].purchase_count) * 100;
            
            html += `
                <div style="background: rgba(116, 199, 236, 0.05); border-radius: 8px; padding: 1rem; border-left: 3px solid #74c7ec;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                        <div style="flex: 1;">
                            <div style="color: #f9e2af; font-weight: 600; margin-bottom: 0.25rem;">
                                ${medal} ${item.title || 'Без названия'}
                            </div>
                            <div style="color: #9399b2; font-size: 0.875rem;">
                                ID: ${item.template_id}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="color: #a6e3a1; font-weight: 700; font-size: 1.125rem;">
                                ${item.total_revenue.toLocaleString('ru-RU')} ₽
                            </div>
                            <div style="color: #9399b2; font-size: 0.875rem;">
                                ${item.purchase_count} ${item.purchase_count === 1 ? 'покупка' : 'покупок'}
                            </div>
                        </div>
                    </div>
                    <div style="background: rgba(0,0,0,0.2); height: 6px; border-radius: 3px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, #a6e3a1, #94e2d5); height: 100%; width: ${barWidth}%; transition: width 0.3s;"></div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    // Render purchases table
    function renderPurchasesTable(purchases) {
        const tbody = document.getElementById('purchasesTableBody');
        
        if (purchases.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding: 2rem; text-align: center; color: #9399b2;">Пока нет покупок</td></tr>';
            return;
        }

        let html = '';
        purchases.forEach(purchase => {
            const statusBadge = purchase.status === 'succeeded' 
                ? '<span style="background: rgba(166, 227, 161, 0.2); color: #a6e3a1; padding: 4px 8px; border-radius: 4px; font-size: 0.875rem;">✅ Оплачено</span>'
                : '<span style="background: rgba(243, 139, 168, 0.2); color: #f38ba8; padding: 4px 8px; border-radius: 4px; font-size: 0.875rem;">❌ Отменено</span>';

            html += `
                <tr style="border-bottom: 1px solid #313244;">
                    <td style="padding: 12px; color: #cdd6f4;">${purchase.user_email}</td>
                    <td style="padding: 12px; color: #74c7ec;">${purchase.template_title || 'Шаблон удалён'}</td>
                    <td style="padding: 12px; color: #a6e3a1; font-weight: 600;">${purchase.amount.toLocaleString('ru-RU')} ₽</td>
                    <td style="padding: 12px; color: #9399b2;">${purchase.paid_at_formatted}</td>
                    <td style="padding: 12px;">${statusBadge}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    // Render subscriptions table
    function renderSubscriptionsTable(subscriptions) {
        const tbody = document.getElementById('subscriptionsTableBody');
        
        if (subscriptions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="padding: 2rem; text-align: center; color: #9399b2;">Пока нет подписок</td></tr>';
            return;
        }

        let html = '';
        subscriptions.forEach(sub => {
            const planBadge = sub.plan_type === 'monthly'
                ? '<span style="background: rgba(116, 199, 236, 0.2); color: #74c7ec; padding: 4px 8px; border-radius: 4px; font-size: 0.875rem;">📅 Месячная</span>'
                : '<span style="background: rgba(249, 226, 175, 0.2); color: #f9e2af; padding: 4px 8px; border-radius: 4px; font-size: 0.875rem;">⭐ Годовая</span>';

            let statusBadge;
            if (sub.status === 'active') {
                statusBadge = '<span style="background: rgba(166, 227, 161, 0.2); color: #a6e3a1; padding: 4px 8px; border-radius: 4px; font-size: 0.875rem;">✅ Активна</span>';
            } else if (sub.status === 'expired') {
                statusBadge = '<span style="background: rgba(243, 139, 168, 0.2); color: #f38ba8; padding: 4px 8px; border-radius: 4px; font-size: 0.875rem;">⏰ Истекла</span>';
            } else {
                statusBadge = '<span style="background: rgba(249, 226, 175, 0.2); color: #f9e2af; padding: 4px 8px; border-radius: 4px; font-size: 0.875rem;">⚠️ Ожидает</span>';
            }

            html += `
                <tr style="border-bottom: 1px solid #313244;">
                    <td style="padding: 12px; color: #cdd6f4;">${sub.user_email}</td>
                    <td style="padding: 12px;">${planBadge}</td>
                    <td style="padding: 12px; color: #a6e3a1; font-weight: 600;">${sub.amount.toLocaleString('ru-RU')} ₽</td>
                    <td style="padding: 12px; color: #9399b2;">${sub.started_at_formatted}</td>
                    <td style="padding: 12px; color: #9399b2;">${sub.expires_at_formatted}</td>
                    <td style="padding: 12px;">${statusBadge}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }
    
})();


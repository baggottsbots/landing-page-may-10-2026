// ===== GLOBAL STATE =====
        var allContacts = [];
        var filteredContacts = [];
        var currentFilter = 'all';
        var contactedMap = {};

        // ===== LOAD CONTACTS FROM GOOGLE SHEET =====
        function loadContactsFromSheet() {
            var endpoint = document.querySelector('meta[name="sheet-data-url"]')?.content;
            if (!endpoint) {
                console.warn('Sheet data URL not found');
                return;
            }

            var container = document.getElementById('sheet-data');
            var loadingSkeleton = document.getElementById('loading-skeleton');
            var errorDiv = document.getElementById('menu-error');
            var emptyState = document.getElementById('empty-state');

            loadingSkeleton.classList.remove('hidden');
            errorDiv.classList.add('hidden');
            emptyState.classList.add('hidden');

            fetch(endpoint)
                .then(function(r) {
                    if (!r.ok) throw new Error('HTTP ' + r.status);
                    return r.json();
                })
                .then(function(result) {
                    if (!result.data || result.data.length === 0) {
                        loadingSkeleton.classList.add('hidden');
                        emptyState.classList.remove('hidden');
                        return;
                    }

                    // ===== PROCESS SHEET DATA =====
                    allContacts = result.data.map(function(row) {
                        return {
                            fullName: row['Full Name'] || row['First Name'] + ' ' + row['Last Name'] || 'Unknown',
                            firstName: row['First Name'] || '',
                            lastName: row['Last Name'] || '',
                            email: row['Email'] || '',
                            phone: row['Phone'] || '',
                            contactType: row['Contact Type'] || 'Inquiry',
                            message: row['Message'] || '',
                            submittedAt: row['Submitted At'] || '',
                            rowNumber: row._rowNumber || 0
                        };
                    });

                    // Load contacted status from localStorage
                    var savedStatus = localStorage.getItem('contacted-contacts');
                    if (savedStatus) {
                        contactedMap = JSON.parse(savedStatus);
                    }

                    // Render contacts and update stats
                    renderContacts(allContacts);
                    updateStats();
                    loadingSkeleton.classList.add('hidden');
                })
                .catch(function(err) {
                    console.error('Sheet data error:', err);
                    loadingSkeleton.classList.add('hidden');
                    errorDiv.classList.remove('hidden');
                });
        }

        // ===== RENDER CONTACT CARDS =====
        function renderContacts(contacts) {
            var container = document.getElementById('sheet-data');
            var emptyState = document.getElementById('empty-state');

            if (contacts.length === 0) {
                container.innerHTML = '';
                emptyState.classList.remove('hidden');
                return;
            }

            emptyState.classList.add('hidden');
            container.innerHTML = contacts.map(function(contact, idx) {
                var isContacted = contactedMap[contact.rowNumber];
                var statusClass = isContacted ? 'contacted' : 'pending';
                var statusBadge = isContacted ? 'badge-contacted' : 'badge-pending';
                var typeClass = 'type-default';
                var typeEmoji = '📋';

                if (contact.contactType.includes('Concern')) {
                    typeClass = 'type-concern';
                    typeEmoji = '⚠️';
                } else if (contact.contactType.includes('Volunteer')) {
                    typeClass = 'type-volunteer';
                    typeEmoji = '🤝';
                } else if (contact.contactType.includes('Support')) {
                    typeClass = 'type-support';
                    typeEmoji = '💪';
                }

                return '<div class="contact-card ' + statusClass + ' ' + typeClass + ' bg-white rounded-lg p-4 sm:p-6 shadow-sm" data-row="' + contact.rowNumber + '" style="animation-delay:' + (idx * 0.05) + 's">' +
                    '<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">' +
                    '<div class="flex-1 min-w-0">' +
                    '<div class="flex items-center gap-2 mb-2">' +
                    '<input type="checkbox" class="contact-checkbox" data-row="' + contact.rowNumber + '" ' + (isContacted ? 'checked' : '') + '>' +
                    '<h3 class="text-lg sm:text-xl font-bold text-gray-900 truncate">' + escapeHtml(contact.fullName) + '</h3>' +
                    '</div>' +
                    '<div class="space-y-1 text-sm text-gray-600 mb-3">' +
                    (contact.email ? '<div>📧 <a href="mailto:' + escapeHtml(contact.email) + '" class="text-blue-600 hover:underline break-all">' + escapeHtml(contact.email) + '</a></div>' : '') +
                    (contact.phone ? '<div>📱 <a href="tel:' + escapeHtml(contact.phone) + '" class="text-blue-600 hover:underline">' + escapeHtml(contact.phone) + '</a></div>' : '') +
                    (contact.submittedAt ? '<div>📅 Submitted: ' + escapeHtml(contact.submittedAt) + '</div>' : '') +
                    '</div>' +
                    '<div class="flex flex-wrap gap-2 mb-3">' +
                    '<span class="' + statusBadge + ' text-xs sm:text-sm font-semibold px-3 py-1 rounded-full">' +
                    (isContacted ? '✓ Contacted' : '⏳ Pending') +
                    '</span>' +
                    '<span class="bg-gray-100 text-gray-800 text-xs sm:text-sm font-semibold px-3 py-1 rounded-full">' +
                    typeEmoji + ' ' + escapeHtml(contact.contactType) +
                    '</span>' +
                    '</div>' +
                    (contact.message ? '<p class="text-sm text-gray-700 bg-gray-50 p-3 rounded border-l-2 border-gray-300 italic">"' + escapeHtml(contact.message.substring(0, 120)) + (contact.message.length > 120 ? '..."' : '"') + '</p>' : '') +
                    '</div>' +
                    '<div class="flex gap-2 sm:flex-col">' +
                    '<button class="call-btn flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium" data-phone="' + escapeHtml(contact.phone) + '">📞 Call</button>' +
                    '<button class="email-btn flex-1 sm:flex-none bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium" data-email="' + escapeHtml(contact.email) + '">✉️ Email</button>' +
                    '</div>' +
                    '</div>' +
                    '</div>';
            }).join('');

            // Attach event listeners
            attachContactEventListeners();
        }

        // ===== ATTACH EVENT LISTENERS TO CONTACT CARDS =====
        function attachContactEventListeners() {
            // Checkbox toggle
            document.querySelectorAll('.contact-checkbox').forEach(function(checkbox) {
                checkbox.addEventListener('change', function() {
                    var rowNum = parseInt(this.dataset.row);
                    if (this.checked) {
                        contactedMap[rowNum] = true;
                    } else {
                        delete contactedMap[rowNum];
                    }
                    localStorage.setItem('contacted-contacts', JSON.stringify(contactedMap));
                    updateStats();
                    applyFilters();
                });
            });

            // Call button
            document.querySelectorAll('.call-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var phone = this.dataset.phone;
                    if (phone) {
                        window.location.href = 'tel:' + phone;
                    } else {
                        alert('No phone number available');
                    }
                });
            });

            // Email button
            document.querySelectorAll('.email-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var email = this.dataset.email;
                    if (email) {
                        window.location.href = 'mailto:' + email;
                    } else {
                        alert('No email address available');
                    }
                });
            });
        }

        // ===== UPDATE STATISTICS =====
        function updateStats() {
            var total = allContacts.length;
            var contacted = Object.keys(contactedMap).length;
            var pending = total - contacted;

            document.getElementById('stat-total').textContent = total;
            document.getElementById('stat-contacted').textContent = contacted;
            document.getElementById('stat-pending').textContent = pending;
            document.getElementById('total-contacts').textContent = total;
            document.getElementById('contacted-count').textContent = contacted;
        }

        // ===== FILTER AND SEARCH LOGIC =====
        function applyFilters() {
            var searchTerm = document.getElementById('search-input').value.toLowerCase();
            
            filteredContacts = allContacts.filter(function(contact) {
                var matchesSearch = contact.fullName.toLowerCase().includes(searchTerm) || 
                                   contact.email.toLowerCase().includes(searchTerm);
                
                if (!matchesSearch) return false;

                if (currentFilter === 'all') return true;
                if (currentFilter === 'contacted') return contactedMap[contact.rowNumber];
                if (currentFilter === 'pending') return !contactedMap[contact.rowNumber];
                
                return true;
            });

            renderContacts(filteredContacts);
        }

        // ===== FILTER BUTTON HANDLERS =====
        document.querySelectorAll('.filter-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.filter-btn').forEach(function(b) {
                    b.classList.remove('active', 'bg-blue-600', 'text-white');
                    b.classList.add('bg-gray-200', 'text-gray-800');
                });
                this.classList.add('active', 'bg-blue-600', 'text-white');
                this.classList.remove('bg-gray-200', 'text-gray-800');
                currentFilter = this.dataset.filter;
                applyFilters();
            });
        });

        // ===== SEARCH INPUT HANDLER =====
        document.getElementById('search-input').addEventListener('input', function() {
            applyFilters();
        });

        // ===== EXPORT CONTACTS =====
        document.getElementById('export-btn').addEventListener('click', function() {
            var csv = 'Full Name,Email,Phone,Contact Type,Status,Submitted At\n';
            allContacts.forEach(function(contact) {
                var status = contactedMap[contact.rowNumber] ? 'Contacted' : 'Pending';
                csv += '"' + contact.fullName + '","' + contact.email + '","' + contact.phone + '","' + contact.contactType + '","' + status + '","' + contact.submittedAt + '"\n';
            });
            
            var blob = new Blob([csv], { type: 'text/csv' });
            var url = window.URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'seifert-contacts-' + new Date().toISOString().split('T')[0] + '.csv';
            a.click();
            window.URL.revokeObjectURL(url);
        });

        // ===== REFRESH DATA =====
        document.getElementById('refresh-btn').addEventListener('click', function() {
            loadContactsFromSheet();
        });

        // ===== RETRY BUTTON =====
        document.getElementById('retry-btn').addEventListener('click', function() {
            loadContactsFromSheet();
        });

        // ===== UTILITY: ESCAPE HTML =====
        function escapeHtml(text) {
            if (!text) return '';
            var div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // ===== INITIALIZE ON PAGE LOAD =====
        document.addEventListener('DOMContentLoaded', function() {
            loadContactsFromSheet();
        });
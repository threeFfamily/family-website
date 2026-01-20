const { useState, useEffect, useCallback, useMemo } = React;

// ============================================
// FAMILY HERITAGE WEBSITE WITH FIREBASE
// Mobile Responsive Version
// ============================================

const ADMIN_PASSWORD = "family2026"; // Change this to your desired password

// Salutation options
const SALUTATION_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Ba', label: 'Ba' },
  { value: 'Na', label: 'Na' },
  { value: 'Ma', label: 'Ma' },
  { value: 'Ni', label: 'Ni' },
  { value: 'Bambodt', label: 'Bambodt' },
  { value: 'Nimbang', label: 'Nimbang' },
  { value: 'Tangwi', label: 'Tangwi' },
  { value: 'Nambodt', label: 'Nambodt' },
  { value: 'custom', label: 'Other (type your own)' },
];

// Relationship options (simplified - tree is built from parent/spouse connections)
const RELATION_OPTIONS = [
  { value: '', label: 'Select one...' },
  { value: 'Born into family', label: 'I was born into this family' },
  { value: 'Married into family', label: 'I married into this family' },
  { value: 'custom', label: 'Other (let me explain)' },
];

// Helper to generate unique IDs
const generateId = () => `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ============================================
// MAIN APP COMPONENT
// ============================================
function FamilyWebsite() {
  const [currentPage, setCurrentPage] = useState('home');
  const [members, setMembers] = useState([]);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Load data from Firebase
  useEffect(() => {
    if (!window.db) {
      console.error('Firebase not configured!');
      setIsLoading(false);
      return;
    }

    const unsubscribeMembers = window.db.collection('members')
      .where('status', '==', 'approved')
      .onSnapshot((snapshot) => {
        const membersData = [];
        snapshot.forEach((doc) => {
          membersData.push({ id: doc.id, ...doc.data() });
        });
        setMembers(membersData);
        setIsLoading(false);
      }, (error) => {
        console.error('Error loading members:', error);
        setIsLoading(false);
      });

    const unsubscribePending = window.db.collection('members')
      .where('status', '==', 'pending')
      .onSnapshot((snapshot) => {
        const pendingData = [];
        snapshot.forEach((doc) => {
          pendingData.push({ id: doc.id, ...doc.data() });
        });
        setPendingMembers(pendingData);
      });

    return () => {
      unsubscribeMembers();
      unsubscribePending();
    };
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const submitMember = async (memberData) => {
    try {
      const newMember = {
        ...memberData,
        submittedAt: new Date().toISOString(),
        status: 'pending'
      };
      await window.db.collection('members').add(newMember);
      showNotification('Your information has been submitted for approval!');
      setCurrentPage('home');
    } catch (error) {
      console.error('Error submitting member:', error);
      showNotification('Error submitting. Please try again.', 'error');
    }
  };

  const approveMember = async (memberId) => {
    try {
      await window.db.collection('members').doc(memberId).update({
        status: 'approved',
        approvedAt: new Date().toISOString()
      });
      showNotification('Member approved successfully!');
    } catch (error) {
      console.error('Error approving member:', error);
      showNotification('Error approving. Please try again.', 'error');
    }
  };

  const rejectMember = async (memberId) => {
    try {
      await window.db.collection('members').doc(memberId).delete();
      showNotification('Submission removed.', 'info');
    } catch (error) {
      console.error('Error rejecting member:', error);
    }
  };

  const deleteMember = async (memberId) => {
    try {
      await window.db.collection('members').doc(memberId).delete();
      showNotification('Member removed.', 'info');
    } catch (error) {
      console.error('Error deleting member:', error);
    }
  };

  const editMember = async (memberId, updatedData) => {
    try {
      await window.db.collection('members').doc(memberId).update({
        ...updatedData,
        updatedAt: new Date().toISOString()
      });
      showNotification('Member updated successfully!');
    } catch (error) {
      console.error('Error editing member:', error);
      showNotification('Error updating. Please try again.', 'error');
    }
  };

  if (isLoading) {
    return React.createElement(LoadingScreen, null);
  }

  return React.createElement('div', { style: styles.app },
    notification && React.createElement(Notification, { message: notification.message, type: notification.type }),
    
    React.createElement(Header, {
      currentPage: currentPage,
      setCurrentPage: setCurrentPage,
      isAdmin: isAdmin,
      pendingCount: pendingMembers.length
    }),
    
    React.createElement('main', { style: styles.main, className: 'main-content' },
      currentPage === 'home' && React.createElement(HomePage, {
        setCurrentPage: setCurrentPage,
        memberCount: members.length
      }),
      
      currentPage === 'submit' && React.createElement(SubmitPage, {
        onSubmit: submitMember,
        existingMembers: members
      }),
      
      currentPage === 'directory' && React.createElement(DirectoryPage, {
        members: members
      }),
      
      currentPage === 'tree' && React.createElement(FamilyTreePage, {
        members: members,
        isAdmin: isAdmin,
        onEditMember: editMember
      }),
      
      currentPage === 'admin' && React.createElement(AdminPage, {
        isAdmin: isAdmin,
        setIsAdmin: setIsAdmin,
        pendingMembers: pendingMembers,
        approvedMembers: members,
        onApprove: approveMember,
        onReject: rejectMember,
        onDelete: deleteMember,
        onEdit: editMember
      })
    ),
    
    React.createElement(Footer, null)
  );
}

// ============================================
// HEADER COMPONENT
// ============================================
function Header({ currentPage, setCurrentPage, isAdmin, pendingCount }) {
  const [menuOpen, setMenuOpen] = useState(false);
  
  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'submit', label: 'Add Member', icon: '➕' },
    { id: 'directory', label: 'Directory', icon: '📖' },
    { id: 'tree', label: 'Family Tree', icon: '🌳' },
    { id: 'admin', label: isAdmin ? 'Admin' : 'Admin', icon: '⚙️', badge: isAdmin && pendingCount > 0 ? pendingCount : null },
  ];

  const NavButton = ({ item }) => React.createElement('button', {
    onClick: () => { setCurrentPage(item.id); setMenuOpen(false); },
    style: {
      ...styles.navItem,
      ...(currentPage === item.id ? styles.navItemActive : {})
    }
  },
    React.createElement('span', { style: styles.navIcon }, item.icon),
    item.label,
    item.badge && React.createElement('span', { style: styles.badge }, item.badge)
  );

  return React.createElement('header', { style: styles.header },
    React.createElement('div', { style: styles.headerInner, className: 'header-inner' },
      React.createElement('div', { 
        style: styles.logo, 
        onClick: () => setCurrentPage('home') 
      },
        React.createElement('span', { style: styles.logoIcon }, '🌿'),
        React.createElement('div', null,
          React.createElement('h1', { style: styles.logoText, className: 'logo-text' }, 'Formusoh/Fomuso/Fomusoh Family'),
          React.createElement('span', { style: styles.logoSubtext, className: 'logo-subtext' }, 'Heritage & Connections')
        )
      ),
      
      // Mobile menu button
      React.createElement('button', { 
        style: styles.menuButton,
        className: 'mobile-menu-btn',
        onClick: () => setMenuOpen(!menuOpen) 
      },
        React.createElement('span', { style: styles.menuIcon }, menuOpen ? '✕' : '☰')
      ),
      
      // Desktop navigation
      React.createElement('nav', { style: styles.nav, className: 'desktop-nav' },
        navItems.map(item => React.createElement(NavButton, { key: item.id, item: item }))
      ),
      
      // Mobile navigation
      menuOpen && React.createElement('nav', { 
        className: 'mobile-nav',
        style: { display: 'flex' }
      },
        navItems.map(item => React.createElement(NavButton, { key: item.id, item: item }))
      )
    )
  );
}

// ============================================
// HOME PAGE
// ============================================
function HomePage({ setCurrentPage, memberCount }) {
  return React.createElement('div', { style: styles.homePage },
    React.createElement('div', { style: styles.heroSection, className: 'hero-section' },
      React.createElement('div', { style: styles.heroContent },
        React.createElement('h1', { style: styles.heroTitle, className: 'hero-title' }, 'Welcome to the Formusoh/Fomuso/Fomusoh Family Page'),
        React.createElement('p', { style: styles.heroSubtitle, className: 'hero-subtitle' },
          'A place to connect, share, and preserve our family history for generations to come.'
        ),
        React.createElement('div', { style: styles.heroStats },
          React.createElement('div', { style: styles.statCard, className: 'stat-card' },
            React.createElement('span', { style: styles.statNumber, className: 'stat-number' }, memberCount),
            React.createElement('span', { style: styles.statLabel, className: 'stat-label' }, 'Family Members')
          )
        ),
        React.createElement('div', { style: styles.heroCta, className: 'hero-cta' },
          React.createElement('button', {
            style: styles.primaryButton,
            onClick: () => setCurrentPage('submit')
          }, 'Add Your Information'),
          React.createElement('button', {
            style: styles.secondaryButton,
            onClick: () => setCurrentPage('directory')
          }, 'View Directory')
        )
      )
    ),
    
    React.createElement('div', { style: styles.featuresSection },
      React.createElement('h2', { style: styles.sectionTitle, className: 'section-title' }, 'Explore Our Heritage'),
      React.createElement('div', { style: styles.featuresGrid, className: 'features-grid' },
        React.createElement(FeatureCard, {
          icon: '📖',
          title: 'Member Directory',
          description: 'Browse all family members alphabetically.',
          action: () => setCurrentPage('directory')
        }),
        React.createElement(FeatureCard, {
          icon: '🌳',
          title: 'Family Tree',
          description: 'Visualize our family connections.',
          action: () => setCurrentPage('tree')
        }),
        React.createElement(FeatureCard, {
          icon: '➕',
          title: 'Join the Tree',
          description: 'Add your information and photo.',
          action: () => setCurrentPage('submit')
        })
      )
    )
  );
}

function FeatureCard({ icon, title, description, action }) {
  return React.createElement('div', { style: styles.featureCard, className: 'feature-card', onClick: action },
    React.createElement('span', { style: styles.featureIcon, className: 'feature-icon' }, icon),
    React.createElement('h3', { style: styles.featureTitle, className: 'feature-title' }, title),
    React.createElement('p', { style: styles.featureDescription, className: 'feature-description' }, description),
    React.createElement('span', { style: styles.featureArrow }, '→')
  );
}

// ============================================
// SUBMIT PAGE
// ============================================
function SubmitPage({ onSubmit, existingMembers = [] }) {
  const [formData, setFormData] = useState({
    salutation: '',
    customSalutation: '',
    firstName: '',
    lastName: '',
    nickname: '',
    fatherName: '',
    motherName: '',
    spouseName: '',
    relation: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    photo: null,
    // UI helper flags for custom inputs
    showCustomFather: false,
    showCustomMother: false,
    showCustomSpouse: false,
    showCustomRelation: false,
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, photo: 'Photo must be under 2MB' }));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 400;
          let width = img.width;
          let height = img.height;
          
          if (width > height && width > MAX_SIZE) {
            height = (height * MAX_SIZE) / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width = (width * MAX_SIZE) / height;
            height = MAX_SIZE;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedData = canvas.toDataURL('image/jpeg', 0.7);
          setPhotoPreview(compressedData);
          handleChange('photo', compressedData);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsSubmitting(true);
    
    // Determine the final salutation
    const finalSalutation = formData.salutation === 'custom' 
      ? formData.customSalutation 
      : formData.salutation;
    
    await onSubmit({
      ...formData,
      salutation: finalSalutation,
      fullName: `${finalSalutation ? finalSalutation + ' ' : ''}${formData.firstName} ${formData.lastName}`.trim(),
    });
    setIsSubmitting(false);
  };

  return React.createElement('div', { style: styles.submitPage },
    React.createElement('div', { style: styles.formContainer, className: 'form-container' },
      React.createElement('div', { style: styles.formHeader },
        React.createElement('h1', { style: styles.formTitle, className: 'form-title' }, 'Join Our Family Tree'),
        React.createElement('p', { style: styles.formSubtitle, className: 'form-subtitle' },
          'Add your information to connect with the family'
        )
      ),

      React.createElement('form', { onSubmit: handleSubmit, style: styles.form },
        
        // ========== SECTION 1: BASIC INFO ==========
        React.createElement('div', { style: styles.formSection },
          React.createElement('div', { style: styles.sectionHeader },
            React.createElement('span', { style: styles.sectionIcon }, '👤'),
            React.createElement('h3', { style: styles.sectionTitle }, 'Your Basic Information'),
            React.createElement('span', { style: styles.requiredNote }, '* Required fields')
          ),
          
          // Photo upload
          React.createElement('div', { style: styles.photoSection },
            React.createElement('div', { style: styles.photoUpload, className: 'photo-upload' },
              photoPreview
                ? React.createElement('img', { src: photoPreview, alt: 'Preview', style: styles.photoPreviewImg })
                : React.createElement('div', { style: styles.photoPlaceholder },
                    React.createElement('span', { style: styles.photoIcon }, '📷'),
                    React.createElement('span', null, 'Add Photo')
                  ),
              React.createElement('input', {
                type: 'file',
                accept: 'image/*',
                onChange: handlePhotoChange,
                style: styles.photoInput
              })
            ),
            errors.photo && React.createElement('span', { style: styles.errorText }, errors.photo),
            React.createElement('span', { style: styles.photoHint, className: 'photo-hint' }, 'Optional - Max 2MB')
          ),

          React.createElement('div', { style: styles.formRow },
            // Salutation
            React.createElement('div', { style: {...styles.formField, flex: '0 0 140px'}, className: 'form-field' },
              React.createElement('label', { style: styles.label, className: 'form-label' }, 'Title'),
              React.createElement('select', {
                value: formData.salutation,
                onChange: (e) => handleChange('salutation', e.target.value),
                style: styles.select,
                className: 'form-select'
              },
                SALUTATION_OPTIONS.map(opt => 
                  React.createElement('option', { key: opt.value, value: opt.value }, opt.label)
                )
              ),
              formData.salutation === 'custom' && React.createElement('input', {
                type: 'text',
                value: formData.customSalutation,
                onChange: (e) => handleChange('customSalutation', e.target.value),
                style: { ...styles.input, marginTop: '8px' },
                placeholder: 'Type title...',
                className: 'form-input'
              })
            ),
            // First Name
            React.createElement('div', { style: {...styles.formField, flex: 1}, className: 'form-field' },
              React.createElement('label', { style: styles.label, className: 'form-label' }, 'First Name *'),
              React.createElement('input', {
                type: 'text',
                value: formData.firstName,
                onChange: (e) => handleChange('firstName', e.target.value),
                style: {...styles.input, ...(errors.firstName ? styles.inputError : {})},
                placeholder: 'Your first name',
                className: 'form-input'
              }),
              errors.firstName && React.createElement('span', { style: styles.errorText }, errors.firstName)
            ),
            // Last Name  
            React.createElement('div', { style: {...styles.formField, flex: 1}, className: 'form-field' },
              React.createElement('label', { style: styles.label, className: 'form-label' }, 'Last Name *'),
              React.createElement('input', {
                type: 'text',
                value: formData.lastName,
                onChange: (e) => handleChange('lastName', e.target.value),
                style: {...styles.input, ...(errors.lastName ? styles.inputError : {})},
                placeholder: 'Your last name',
                className: 'form-input'
              }),
              errors.lastName && React.createElement('span', { style: styles.errorText }, errors.lastName)
            )
          ),
          
          // Nickname
          React.createElement('div', { style: styles.formField, className: 'form-field' },
            React.createElement('label', { style: styles.label, className: 'form-label' }, 'Nickname'),
            React.createElement('input', {
              type: 'text',
              value: formData.nickname,
              onChange: (e) => handleChange('nickname', e.target.value),
              style: styles.input,
              placeholder: 'What do people call you? (optional)',
              className: 'form-input'
            })
          )
        ),

        // ========== SECTION 2: FAMILY CONNECTIONS ==========
        React.createElement('div', { style: styles.formSection },
          React.createElement('div', { style: styles.sectionHeader },
            React.createElement('span', { style: styles.sectionIcon }, '🌳'),
            React.createElement('h3', { style: styles.sectionTitle }, 'Family Connections')
          ),
          
          // Explanation box
          React.createElement('div', { style: styles.infoBox },
            React.createElement('p', { style: styles.infoText },
              '🔗 The family tree is built by connecting parents to children. Select your parents below if they\'re already in the system, or type their names to add them later.'
            )
          ),
          
          // How did you join this family?
          React.createElement('div', { style: styles.formField, className: 'form-field' },
            React.createElement('label', { style: styles.label, className: 'form-label' }, 'How did you join this family?'),
            React.createElement('select', {
              value: formData.relation || '',
              onChange: (e) => {
                if (e.target.value === 'custom') {
                  handleChange('relation', '');
                  handleChange('showCustomRelation', true);
                } else {
                  handleChange('relation', e.target.value);
                  handleChange('showCustomRelation', false);
                }
              },
              style: styles.select,
              className: 'form-select'
            },
              RELATION_OPTIONS.map(opt => 
                React.createElement('option', { key: opt.value, value: opt.value }, opt.label)
              )
            ),
            formData.showCustomRelation && 
              React.createElement('input', {
                type: 'text',
                value: formData.relation,
                onChange: (e) => handleChange('relation', e.target.value),
                style: { ...styles.input, marginTop: '8px' },
                placeholder: 'Please describe...',
                className: 'form-input'
              })
          ),
          
          // Father's Name
          React.createElement('div', { style: styles.formField, className: 'form-field' },
            React.createElement('label', { style: styles.label, className: 'form-label' }, "Father's Name"),
            existingMembers.length > 0 
              ? React.createElement('div', null,
                  React.createElement('select', {
                    value: existingMembers.some(m => m.fullName === formData.fatherName) ? formData.fatherName : (formData.fatherName ? '__custom__' : ''),
                    onChange: (e) => {
                      if (e.target.value === '__custom__') {
                        handleChange('fatherName', '');
                        handleChange('showCustomFather', true);
                      } else {
                        handleChange('fatherName', e.target.value);
                        handleChange('showCustomFather', false);
                      }
                    },
                    style: styles.select,
                    className: 'form-select'
                  },
                    React.createElement('option', { value: '' }, '— Select if in system —'),
                    existingMembers
                      .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''))
                      .map(member => 
                        React.createElement('option', { key: member.id, value: member.fullName }, member.fullName)
                      ),
                    React.createElement('option', { value: '__custom__' }, '✏️ Not in list - type name...')
                  ),
                  (formData.showCustomFather || (formData.fatherName && !existingMembers.some(m => m.fullName === formData.fatherName))) &&
                    React.createElement('input', {
                      type: 'text',
                      value: formData.fatherName,
                      onChange: (e) => handleChange('fatherName', e.target.value),
                      style: { ...styles.input, marginTop: '8px' },
                      placeholder: "Father's full name",
                      className: 'form-input'
                    })
                )
              : React.createElement('input', {
                  type: 'text',
                  value: formData.fatherName,
                  onChange: (e) => handleChange('fatherName', e.target.value),
                  style: styles.input,
                  placeholder: "Father's full name (optional)",
                  className: 'form-input'
                })
          ),
          
          // Mother's Name
          React.createElement('div', { style: styles.formField, className: 'form-field' },
            React.createElement('label', { style: styles.label, className: 'form-label' }, "Mother's Name"),
            existingMembers.length > 0
              ? React.createElement('div', null,
                  React.createElement('select', {
                    value: existingMembers.some(m => m.fullName === formData.motherName) ? formData.motherName : (formData.motherName ? '__custom__' : ''),
                    onChange: (e) => {
                      if (e.target.value === '__custom__') {
                        handleChange('motherName', '');
                        handleChange('showCustomMother', true);
                      } else {
                        handleChange('motherName', e.target.value);
                        handleChange('showCustomMother', false);
                      }
                    },
                    style: styles.select,
                    className: 'form-select'
                  },
                    React.createElement('option', { value: '' }, '— Select if in system —'),
                    existingMembers
                      .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''))
                      .map(member => 
                        React.createElement('option', { key: member.id, value: member.fullName }, member.fullName)
                      ),
                    React.createElement('option', { value: '__custom__' }, '✏️ Not in list - type name...')
                  ),
                  (formData.showCustomMother || (formData.motherName && !existingMembers.some(m => m.fullName === formData.motherName))) &&
                    React.createElement('input', {
                      type: 'text',
                      value: formData.motherName,
                      onChange: (e) => handleChange('motherName', e.target.value),
                      style: { ...styles.input, marginTop: '8px' },
                      placeholder: "Mother's full name",
                      className: 'form-input'
                    })
                )
              : React.createElement('input', {
                  type: 'text',
                  value: formData.motherName,
                  onChange: (e) => handleChange('motherName', e.target.value),
                  style: styles.input,
                  placeholder: "Mother's full name (optional)",
                  className: 'form-input'
                })
          ),
          
          // Spouse Name
          React.createElement('div', { style: styles.formField, className: 'form-field' },
            React.createElement('label', { style: styles.label, className: 'form-label' }, "Spouse/Partner (optional)"),
            existingMembers.length > 0
              ? React.createElement('div', null,
                  React.createElement('select', {
                    value: existingMembers.some(m => m.fullName === formData.spouseName) ? formData.spouseName : (formData.spouseName ? '__custom__' : ''),
                    onChange: (e) => {
                      if (e.target.value === '__custom__') {
                        handleChange('spouseName', '');
                        handleChange('showCustomSpouse', true);
                      } else {
                        handleChange('spouseName', e.target.value);
                        handleChange('showCustomSpouse', false);
                      }
                    },
                    style: styles.select,
                    className: 'form-select'
                  },
                    React.createElement('option', { value: '' }, '— Select if in system —'),
                    existingMembers
                      .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''))
                      .map(member => 
                        React.createElement('option', { key: member.id, value: member.fullName }, member.fullName)
                      ),
                    React.createElement('option', { value: '__custom__' }, '✏️ Not in list - type name...')
                  ),
                  (formData.showCustomSpouse || (formData.spouseName && !existingMembers.some(m => m.fullName === formData.spouseName))) &&
                    React.createElement('input', {
                      type: 'text',
                      value: formData.spouseName,
                      onChange: (e) => handleChange('spouseName', e.target.value),
                      style: { ...styles.input, marginTop: '8px' },
                      placeholder: "Spouse's full name",
                      className: 'form-input'
                    })
                )
              : React.createElement('input', {
                  type: 'text',
                  value: formData.spouseName,
                  onChange: (e) => handleChange('spouseName', e.target.value),
                  style: styles.input,
                  placeholder: "Spouse's full name (optional)",
                  className: 'form-input'
                })
          )
        ),

        // ========== SECTION 3: CONTACT INFO ==========
        React.createElement('div', { style: styles.formSection },
          React.createElement('div', { style: styles.sectionHeader },
            React.createElement('span', { style: styles.sectionIcon }, '📞'),
            React.createElement('h3', { style: styles.sectionTitle }, 'Contact Information'),
            React.createElement('span', { style: styles.sectionHint }, 'Optional - visible to family members')
          ),
          
          React.createElement('div', { style: styles.formRow },
            React.createElement('div', { style: {...styles.formField, flex: 1}, className: 'form-field' },
              React.createElement('label', { style: styles.label, className: 'form-label' }, 'Email'),
              React.createElement('input', {
                type: 'email',
                value: formData.email,
                onChange: (e) => handleChange('email', e.target.value),
                style: styles.input,
                placeholder: 'your.email@example.com',
                className: 'form-input'
              })
            ),
            React.createElement('div', { style: {...styles.formField, flex: 1}, className: 'form-field' },
              React.createElement('label', { style: styles.label, className: 'form-label' }, 'Phone'),
              React.createElement('input', {
                type: 'tel',
                value: formData.phone,
                onChange: (e) => handleChange('phone', e.target.value),
                style: styles.input,
                placeholder: '+1 (555) 123-4567',
                className: 'form-input'
              })
            )
          ),
          
          React.createElement('div', { style: styles.formField, className: 'form-field' },
            React.createElement('label', { style: styles.label, className: 'form-label' }, 'Location'),
            React.createElement('input', {
              type: 'text',
              value: formData.location,
              onChange: (e) => handleChange('location', e.target.value),
              style: styles.input,
              placeholder: 'City, Country (e.g., Douala, Cameroon)',
              className: 'form-input'
            })
          )
        ),

        // ========== SECTION 4: ABOUT YOU ==========
        React.createElement('div', { style: styles.formSection },
          React.createElement('div', { style: styles.sectionHeader },
            React.createElement('span', { style: styles.sectionIcon }, '📝'),
            React.createElement('h3', { style: styles.sectionTitle }, 'About You'),
            React.createElement('span', { style: styles.sectionHint }, 'Tell the family a bit about yourself')
          ),
          
          React.createElement('div', { style: styles.formField, className: 'form-field' },
            React.createElement('label', { style: styles.label, className: 'form-label' }, 'Short Bio'),
            React.createElement('textarea', {
              value: formData.bio,
              onChange: (e) => handleChange('bio', e.target.value),
              style: styles.textarea,
              rows: 4,
              placeholder: 'Share something about yourself - your work, hobbies, family memories, or anything you\'d like the family to know...',
              className: 'form-textarea'
            })
          )
        ),

        // Submit Button
        React.createElement('button', {
          type: 'submit',
          style: {...styles.submitButton, ...(isSubmitting ? styles.submitButtonDisabled : {})},
          disabled: isSubmitting,
          className: 'submit-button'
        }, isSubmitting ? 'Submitting...' : '✓ Submit for Approval')
      )
    )
  );
}

function FormField({ label, value, onChange, error, placeholder, type = 'text' }) {
  return React.createElement('div', { style: styles.formField, className: 'form-field' },
    React.createElement('label', { style: styles.label, className: 'form-label' }, label),
    React.createElement('input', {
      type: type,
      value: value,
      onChange: (e) => onChange(e.target.value),
      style: {...styles.input, ...(error ? styles.inputError : {})},
      placeholder: placeholder,
      className: 'form-input'
    }),
    error && React.createElement('span', { style: styles.errorText }, error)
  );
}

// ============================================
// DIRECTORY PAGE
// ============================================
function DirectoryPage({ members }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedMember, setSelectedMember] = useState(null);

  const filteredAndSortedMembers = useMemo(() => {
    let filtered = members.filter(member => {
      const searchLower = searchTerm.toLowerCase();
      return (
        member.fullName?.toLowerCase().includes(searchLower) ||
        member.firstName?.toLowerCase().includes(searchLower) ||
        member.lastName?.toLowerCase().includes(searchLower) ||
        member.nickname?.toLowerCase().includes(searchLower) ||
        member.relation?.toLowerCase().includes(searchLower) ||
        member.fatherName?.toLowerCase().includes(searchLower) ||
        member.motherName?.toLowerCase().includes(searchLower) ||
        member.location?.toLowerCase().includes(searchLower)
      );
    });

    return filtered.sort((a, b) => {
      const nameA = (a.lastName || '').toLowerCase();
      const nameB = (b.lastName || '').toLowerCase();
      return sortOrder === 'asc' 
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });
  }, [members, searchTerm, sortOrder]);

  const groupedMembers = useMemo(() => {
    const groups = {};
    filteredAndSortedMembers.forEach(member => {
      const letter = (member.lastName?.[0] || '?').toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(member);
    });
    return groups;
  }, [filteredAndSortedMembers]);

  const letters = Object.keys(groupedMembers).sort();

  return React.createElement('div', { style: styles.directoryPage },
    React.createElement('div', { style: styles.directoryHeader },
      React.createElement('h1', { style: styles.pageTitle, className: 'page-title' }, 'Family Directory'),
      React.createElement('p', { style: styles.pageSubtitle, className: 'page-subtitle' },
        `${members.length} family members`
      )
    ),

    React.createElement('div', { style: styles.directoryControls, className: 'directory-controls' },
      React.createElement('div', { style: styles.searchBox, className: 'search-box' },
        React.createElement('span', { style: styles.searchIcon }, '🔍'),
        React.createElement('input', {
          type: 'text',
          placeholder: 'Search by name or location...',
          value: searchTerm,
          onChange: (e) => setSearchTerm(e.target.value),
          style: styles.searchInput,
          className: 'search-input'
        })
      ),
      React.createElement('button', {
        style: styles.sortButton,
        className: 'sort-button',
        onClick: () => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
      }, sortOrder === 'asc' ? '↓ A-Z' : '↑ Z-A')
    ),

    filteredAndSortedMembers.length === 0
      ? React.createElement('div', { style: styles.emptyState },
          React.createElement('span', { style: styles.emptyIcon }, '📭'),
          React.createElement('h3', { style: styles.emptyTitle },
            members.length === 0 ? 'No members yet' : 'No matches found'
          ),
          React.createElement('p', { style: styles.emptyText },
            members.length === 0 
              ? 'Be the first to add your information!'
              : 'Try adjusting your search.'
          )
        )
      : React.createElement('div', { style: styles.directoryGrid },
          letters.map(letter =>
            React.createElement('div', { key: letter, style: styles.letterGroup },
              React.createElement('div', { style: styles.letterHeader }, letter),
              React.createElement('div', { style: styles.membersList },
                groupedMembers[letter].map(member =>
                  React.createElement(MemberCard, {
                    key: member.id,
                    member: member,
                    onClick: () => setSelectedMember(member)
                  })
                )
              )
            )
          )
        ),

    selectedMember && React.createElement(MemberModal, {
      member: selectedMember,
      onClose: () => setSelectedMember(null)
    })
  );
}

function MemberCard({ member, onClick }) {
  return React.createElement('div', { style: styles.memberCard, className: 'member-card', onClick: onClick },
    React.createElement('div', { style: styles.memberPhoto, className: 'member-photo' },
      member.photo
        ? React.createElement('img', { src: member.photo, alt: member.fullName, style: styles.memberPhotoImg })
        : React.createElement('div', { style: styles.memberPhotoPlaceholder },
            `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`
          )
    ),
    React.createElement('div', { style: styles.memberInfo },
      React.createElement('h3', { style: styles.memberName, className: 'member-name' }, member.fullName),
      member.nickname && React.createElement('span', { style: styles.memberNickname, className: 'member-nickname' }, `"${member.nickname}"`),
      member.relation && React.createElement('span', { style: styles.memberRelation, className: 'member-relation' }, member.relation),
      member.location && React.createElement('span', { style: styles.memberLocation, className: 'member-location' }, `📍 ${member.location}`)
    ),
    React.createElement('span', { style: styles.memberArrow }, '→')
  );
}

function MemberModal({ member, onClose }) {
  return React.createElement('div', { style: styles.modalOverlay, onClick: onClose },
    React.createElement('div', { style: styles.modal, className: 'modal', onClick: e => e.stopPropagation() },
      React.createElement('button', { style: styles.modalClose, onClick: onClose }, '✕'),
      
      React.createElement('div', { style: styles.modalContent, className: 'modal-content' },
        React.createElement('div', { style: styles.modalPhoto, className: 'modal-photo' },
          member.photo
            ? React.createElement('img', { src: member.photo, alt: member.fullName, style: styles.modalPhotoImg })
            : React.createElement('div', { style: styles.modalPhotoPlaceholder },
                `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`
              )
        ),
        
        React.createElement('div', { style: styles.modalInfo },
          React.createElement('h2', { style: styles.modalName, className: 'modal-name' }, member.fullName),
          member.nickname && React.createElement('p', { style: styles.modalNickname }, `"${member.nickname}"`),
          
          // Family Details Section
          (member.relation || member.fatherName || member.motherName || member.spouseName) && React.createElement('div', { style: styles.modalDetails, className: 'modal-details' },
            member.relation && React.createElement('div', { style: styles.detailItem },
              React.createElement('span', { style: styles.detailLabel, className: 'detail-label' }, 'Relation'),
              React.createElement('span', { style: styles.detailValue, className: 'detail-value' }, member.relation)
            ),
            member.fatherName && React.createElement('div', { style: styles.detailItem },
              React.createElement('span', { style: styles.detailLabel, className: 'detail-label' }, 'Father'),
              React.createElement('span', { style: styles.detailValue, className: 'detail-value' }, member.fatherName)
            ),
            member.motherName && React.createElement('div', { style: styles.detailItem },
              React.createElement('span', { style: styles.detailLabel, className: 'detail-label' }, 'Mother'),
              React.createElement('span', { style: styles.detailValue, className: 'detail-value' }, member.motherName)
            ),
            member.spouseName && React.createElement('div', { style: styles.detailItem },
              React.createElement('span', { style: styles.detailLabel, className: 'detail-label' }, 'Spouse'),
              React.createElement('span', { style: styles.detailValue, className: 'detail-value' }, member.spouseName)
            )
          ),
          
          // Contact Information Section (Email, Phone, Location)
          (member.location || member.email || member.phone) && React.createElement('div', { style: styles.contactDetails, className: 'contact-details' },
            member.location && React.createElement('div', { style: styles.contactItem, className: 'contact-item' },
              React.createElement('span', { style: styles.contactIcon }, '📍'),
              React.createElement('span', null, member.location)
            ),
            member.email && React.createElement('div', { style: styles.contactItem, className: 'contact-item' },
              React.createElement('span', { style: styles.contactIcon }, '✉️'),
              React.createElement('a', { href: `mailto:${member.email}`, style: styles.contactLink }, member.email)
            ),
            member.phone && React.createElement('div', { style: styles.contactItem, className: 'contact-item' },
              React.createElement('span', { style: styles.contactIcon }, '📱'),
              React.createElement('a', { href: `tel:${member.phone}`, style: styles.contactLink }, member.phone)
            )
          ),
          
          // Bio/About Section
          member.bio && React.createElement('div', { style: styles.modalBioSection, className: 'modal-bio-section' },
            React.createElement('h4', { style: styles.modalBioTitle, className: 'modal-bio-title' }, 'About'),
            React.createElement('p', { style: styles.modalBioText, className: 'modal-bio-text' }, member.bio)
          )
        )
      )
    )
  );
}

// ============================================
// FAMILY TREE PAGE - Simplified Visual Tree
// ============================================
function FamilyTreePage({ members, onEditMember, isAdmin }) {
  const [selectedPerson, setSelectedPerson] = useState(null);

  // Build family data structure
  const familyData = useMemo(() => {
    const people = {};
    
    // First pass: create all people
    members.forEach(member => {
      people[member.fullName] = {
        ...member,
        children: [],
        parents: [],
        spouse: null,
        generation: 0
      };
    });

    // Second pass: establish relationships
    members.forEach(member => {
      if (member.fatherName && people[member.fatherName]) {
        if (!people[member.fatherName].children.includes(member.fullName)) {
          people[member.fatherName].children.push(member.fullName);
        }
        people[member.fullName].parents.push(member.fatherName);
      }
      if (member.motherName && people[member.motherName]) {
        if (!people[member.motherName].children.includes(member.fullName)) {
          people[member.motherName].children.push(member.fullName);
        }
        people[member.fullName].parents.push(member.motherName);
      }
      if (member.spouseName && people[member.spouseName]) {
        people[member.fullName].spouse = member.spouseName;
        people[member.spouseName].spouse = member.fullName;
      }
    });

    // Infer spouse from shared children
    members.forEach(member => {
      if (member.fatherName && member.motherName && 
          people[member.fatherName] && people[member.motherName]) {
        people[member.fatherName].spouse = member.motherName;
        people[member.motherName].spouse = member.fatherName;
      }
    });

    // Calculate generations
    const calculateGeneration = (personName, gen, visited = new Set()) => {
      if (visited.has(personName) || !people[personName]) return;
      visited.add(personName);
      people[personName].generation = Math.max(people[personName].generation, gen);
      if (people[personName].spouse && people[people[personName].spouse]) {
        people[people[personName].spouse].generation = people[personName].generation;
      }
      people[personName].children.forEach(child => calculateGeneration(child, gen + 1, visited));
    };

    // Find roots and calculate
    const roots = Object.values(people).filter(p => 
      p.parents.length === 0 || p.parents.every(parent => !people[parent])
    );
    const visited = new Set();
    roots.forEach(root => calculateGeneration(root.fullName, 0, visited));

    // Group by generation, avoiding spouse duplicates
    const generations = {};
    const processedSpouses = new Set();
    
    Object.values(people).forEach(person => {
      if (processedSpouses.has(person.fullName)) return;
      
      const gen = person.generation;
      if (!generations[gen]) generations[gen] = [];
      
      if (person.spouse && people[person.spouse]) {
        processedSpouses.add(person.spouse);
        generations[gen].push({
          type: 'couple',
          person1: person,
          person2: people[person.spouse]
        });
      } else {
        generations[gen].push({
          type: 'single',
          person: person
        });
      }
    });

    const sortedGens = Object.keys(generations)
      .sort((a, b) => Number(a) - Number(b))
      .map(g => generations[g]);

    return { people, generations: sortedGens };
  }, [members]);

  // Get generation label
  const getGenLabel = (index, total) => {
    if (total === 1) return 'Family Members';
    if (index === 0) return 'Generation 1';
    return `Generation ${index + 1}`;
  };

  // Render person card
  const PersonCard = ({ person }) => {
    const hasChildren = familyData.people[person.fullName]?.children?.length > 0;
    
    return React.createElement('div', {
      style: treeStyles.personCard,
      className: 'person-card',
      onClick: () => setSelectedPerson(person)
    },
      React.createElement('div', { style: treeStyles.cardPhoto, className: 'card-photo' },
        person.photo
          ? React.createElement('img', { src: person.photo, alt: '', style: treeStyles.cardPhotoImg })
          : React.createElement('div', { style: treeStyles.cardPhotoPlaceholder },
              (person.firstName?.[0] || '') + (person.lastName?.[0] || '')
            )
      ),
      React.createElement('div', { style: treeStyles.cardName, className: 'card-name' }, 
        person.firstName + ' ' + person.lastName
      ),
      person.nickname && React.createElement('div', { style: treeStyles.cardNickname }, 
        '"' + person.nickname + '"'
      ),
      hasChildren && React.createElement('div', { style: treeStyles.hasChildrenBadge }, '👶')
    );
  };

  // Detail modal
  const renderModal = () => {
    if (!selectedPerson) return null;
    const p = selectedPerson;
    const data = familyData.people[p.fullName];
    const siblings = members.filter(m => 
      m.fullName !== p.fullName &&
      ((p.fatherName && m.fatherName === p.fatherName) ||
       (p.motherName && m.motherName === p.motherName))
    );

    return React.createElement('div', { 
      style: treeStyles.modalOverlay, 
      className: 'modal-overlay',
      onClick: () => setSelectedPerson(null) 
    },
      React.createElement('div', { 
        style: treeStyles.modal, 
        className: 'tree-modal',
        onClick: e => e.stopPropagation() 
      },
        React.createElement('button', { 
          style: treeStyles.closeBtn, 
          onClick: () => setSelectedPerson(null) 
        }, '✕'),
        
        React.createElement('div', { style: treeStyles.modalPhoto, className: 'modal-photo' },
          p.photo
            ? React.createElement('img', { src: p.photo, style: treeStyles.modalPhotoImg })
            : React.createElement('div', { style: treeStyles.modalPhotoPlaceholder },
                (p.firstName?.[0] || '') + (p.lastName?.[0] || '')
              )
        ),
        
        React.createElement('h2', { style: treeStyles.modalName }, p.fullName),
        p.nickname && React.createElement('p', { style: treeStyles.modalNickname }, '"' + p.nickname + '"'),
        p.relation && React.createElement('span', { style: treeStyles.modalBadge }, p.relation),
        
        React.createElement('div', { style: treeStyles.modalInfo },
          p.fatherName && React.createElement('p', null, '👨 Father: ', React.createElement('strong', null, p.fatherName)),
          p.motherName && React.createElement('p', null, '👩 Mother: ', React.createElement('strong', null, p.motherName)),
          data?.spouse && React.createElement('p', null, '❤️ Spouse: ', React.createElement('strong', null, data.spouse)),
          siblings.length > 0 && React.createElement('p', null, '👫 Siblings: ', React.createElement('strong', null, siblings.map(s => s.firstName).join(', '))),
          data?.children?.length > 0 && React.createElement('p', null, '👶 Children: ', React.createElement('strong', null, data.children.map(c => familyData.people[c]?.firstName || c).join(', '))),
          p.location && React.createElement('p', null, '📍 ', p.location),
          p.email && React.createElement('p', null, '✉️ ', p.email),
          p.phone && React.createElement('p', null, '📱 ', p.phone)
        ),
        
        p.bio && React.createElement('div', { style: treeStyles.modalBio },
          React.createElement('strong', null, 'About'),
          React.createElement('p', null, p.bio)
        ),
        
        isAdmin && React.createElement('button', {
          style: treeStyles.editBtn,
          onClick: () => {
            // Close modal and open edit (would need to connect to admin edit)
            setSelectedPerson(null);
            alert('To edit, go to Admin panel');
          }
        }, '✎ Edit in Admin')
      )
    );
  };

  return React.createElement('div', { style: treeStyles.page, className: 'tree-page' },
    React.createElement('div', { style: treeStyles.header },
      React.createElement('h1', { style: treeStyles.title }, '🌳 Family Tree'),
      React.createElement('p', { style: treeStyles.subtitle }, 
        members.length + ' members • Tap anyone to see details'
      )
    ),

    members.length === 0
      ? React.createElement('div', { style: treeStyles.empty },
          React.createElement('p', null, '🌱 No family members yet'),
          React.createElement('p', null, 'Add members to build the tree!')
        )
      : React.createElement('div', { style: treeStyles.treeContainer, className: 'tree-container' },
          familyData.generations.map((gen, genIndex) =>
            React.createElement('div', { key: genIndex, style: treeStyles.generation, className: 'generation' },
              React.createElement('div', { style: treeStyles.genLabel, className: 'gen-label' }, 
                getGenLabel(genIndex, familyData.generations.length)
              ),
              genIndex > 0 && React.createElement('div', { style: treeStyles.connector }),
              React.createElement('div', { style: treeStyles.genMembers, className: 'gen-members' },
                gen.map((unit, idx) => 
                  unit.type === 'couple'
                    ? React.createElement('div', { key: idx, style: treeStyles.couple, className: 'couple' },
                        React.createElement(PersonCard, { person: unit.person1 }),
                        React.createElement('span', { style: treeStyles.heart }, '❤️'),
                        React.createElement(PersonCard, { person: unit.person2 })
                      )
                    : React.createElement(PersonCard, { key: idx, person: unit.person })
                )
              )
            )
          )
        ),

    renderModal()
  );
}

// Simple tree styles
const treeStyles = {
  page: {
    padding: '16px',
    maxWidth: '100%',
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#2d4a3e',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#7a8a82',
    margin: 0,
  },
  empty: {
    textAlign: 'center',
    padding: '40px 20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    color: '#7a8a82',
  },
  treeContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  generation: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '8px',
  },
  genLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#7a8a82',
    backgroundColor: '#f0f7f4',
    padding: '6px 16px',
    borderRadius: '16px',
    marginBottom: '12px',
  },
  connector: {
    width: '2px',
    height: '20px',
    backgroundColor: '#c9a959',
    marginBottom: '8px',
  },
  genMembers: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '16px',
    padding: '0 8px',
  },
  couple: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#fff8e1',
    padding: '8px',
    borderRadius: '16px',
  },
  heart: {
    fontSize: '16px',
  },
  personCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    cursor: 'pointer',
    minWidth: '80px',
    maxWidth: '100px',
    position: 'relative',
  },
  cardPhoto: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    overflow: 'hidden',
    marginBottom: '8px',
    border: '2px solid #c9a959',
  },
  cardPhotoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  cardPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2d4a3e',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 600,
  },
  cardName: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#2d4a3e',
    textAlign: 'center',
    lineHeight: 1.2,
  },
  cardNickname: {
    fontSize: '10px',
    color: '#c9a959',
    fontStyle: 'italic',
  },
  hasChildrenBadge: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    fontSize: '12px',
  },
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '400px',
    width: '100%',
    maxHeight: '80vh',
    overflow: 'auto',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#999',
  },
  modalPhoto: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    overflow: 'hidden',
    margin: '0 auto 12px',
    border: '3px solid #c9a959',
  },
  modalPhotoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  modalPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2d4a3e',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 600,
  },
  modalName: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#2d4a3e',
    textAlign: 'center',
    margin: '0 0 4px 0',
  },
  modalNickname: {
    fontSize: '14px',
    color: '#c9a959',
    textAlign: 'center',
    margin: '0 0 8px 0',
  },
  modalBadge: {
    display: 'block',
    fontSize: '12px',
    color: '#7a8a82',
    backgroundColor: '#f0f7f4',
    padding: '4px 12px',
    borderRadius: '12px',
    textAlign: 'center',
    margin: '0 auto 16px',
    width: 'fit-content',
  },
  modalInfo: {
    fontSize: '14px',
    color: '#4a5a52',
    lineHeight: 1.8,
  },
  modalBio: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#f8f6f1',
    borderRadius: '8px',
    fontSize: '13px',
  },
  editBtn: {
    width: '100%',
    marginTop: '16px',
    padding: '10px',
    backgroundColor: '#2d4a3e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};

// ============================================
// ADMIN PAGE
// ============================================
function AdminPage({ 
  isAdmin, setIsAdmin, 
  pendingMembers, approvedMembers,
  onApprove, onReject, onDelete, onEdit 
}) {
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [editingMember, setEditingMember] = useState(null);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setLoginError('');
    } else {
      setLoginError('Incorrect password.');
    }
  };

  if (!isAdmin) {
    return React.createElement('div', { style: styles.adminLogin },
      React.createElement('div', { style: styles.loginCard, className: 'login-card' },
        React.createElement('span', { style: styles.loginIcon, className: 'login-icon' }, '🔐'),
        React.createElement('h2', { style: styles.loginTitle, className: 'login-title' }, 'Admin Access'),
        React.createElement('p', { style: styles.loginSubtitle, className: 'login-subtitle' }, 'Enter password to manage submissions'),
        
        React.createElement('form', { onSubmit: handleLogin, style: styles.loginForm },
          React.createElement('input', {
            type: 'password',
            value: password,
            onChange: (e) => setPassword(e.target.value),
            placeholder: 'Enter password',
            style: styles.loginInput,
            className: 'login-input'
          }),
          loginError && React.createElement('span', { style: styles.loginError }, loginError),
          React.createElement('button', { type: 'submit', style: styles.loginButton, className: 'login-button' },
            'Login'
          )
        ),
        React.createElement('p', { style: styles.loginHint }, 'Contact admin for password')
      )
    );
  }

  return React.createElement('div', { style: styles.adminPage },
    React.createElement('div', { style: styles.adminHeader, className: 'admin-header' },
      React.createElement('div', null,
        React.createElement('h1', { style: styles.pageTitle, className: 'page-title' }, 'Admin Panel'),
        React.createElement('p', { style: styles.pageSubtitle }, 'Manage submissions')
      ),
      React.createElement('button', { 
        style: styles.logoutButton,
        className: 'logout-button',
        onClick: () => setIsAdmin(false) 
      }, 'Logout')
    ),

    React.createElement('div', { style: styles.adminTabs, className: 'admin-tabs' },
      React.createElement('button', {
        style: {...styles.adminTab, ...(activeTab === 'pending' ? styles.adminTabActive : {})},
        className: 'admin-tab',
        onClick: () => setActiveTab('pending')
      },
        'Pending',
        pendingMembers.length > 0 && React.createElement('span', { style: styles.tabBadge }, pendingMembers.length)
      ),
      React.createElement('button', {
        style: {...styles.adminTab, ...(activeTab === 'approved' ? styles.adminTabActive : {})},
        className: 'admin-tab',
        onClick: () => setActiveTab('approved')
      },
        'Approved ',
        React.createElement('span', { style: styles.tabCount }, `(${approvedMembers.length})`)
      )
    ),

    React.createElement('div', { style: styles.adminContent },
      activeTab === 'pending' && (
        pendingMembers.length === 0
          ? React.createElement('div', { style: styles.emptyState },
              React.createElement('span', { style: styles.emptyIcon }, '✓'),
              React.createElement('h3', { style: styles.emptyTitle }, 'All caught up!'),
              React.createElement('p', { style: styles.emptyText }, 'No pending submissions.')
            )
          : React.createElement('div', { style: styles.pendingList },
              pendingMembers.map(member =>
                React.createElement(AdminMemberCard, {
                  key: member.id,
                  member: member,
                  isPending: true,
                  onApprove: () => onApprove(member.id),
                  onReject: () => onReject(member.id)
                })
              )
            )
      ),

      activeTab === 'approved' && (
        approvedMembers.length === 0
          ? React.createElement('div', { style: styles.emptyState },
              React.createElement('span', { style: styles.emptyIcon }, '📭'),
              React.createElement('h3', { style: styles.emptyTitle }, 'No members yet'),
              React.createElement('p', { style: styles.emptyText }, 'Approved members appear here.')
            )
          : React.createElement('div', { style: styles.approvedList },
              approvedMembers.map(member =>
                React.createElement(AdminMemberCard, {
                  key: member.id,
                  member: member,
                  onEdit: () => setEditingMember(member),
                  onDelete: () => {
                    if (window.confirm(`Remove ${member.fullName}?`)) {
                      onDelete(member.id);
                    }
                  }
                })
              )
            )
      )
    ),

    editingMember && React.createElement(EditModal, {
      member: editingMember,
      existingMembers: approvedMembers,
      onSave: (data) => {
        onEdit(editingMember.id, data);
        setEditingMember(null);
      },
      onClose: () => setEditingMember(null)
    })
  );
}

function AdminMemberCard({ member, isPending, onApprove, onReject, onEdit, onDelete }) {
  return React.createElement('div', { style: styles.adminCard, className: 'admin-card' },
    React.createElement('div', { style: styles.adminCardHeader, className: 'admin-card-header' },
      React.createElement('div', { style: styles.adminCardPhoto, className: 'admin-card-photo' },
        member.photo
          ? React.createElement('img', { src: member.photo, alt: member.fullName, style: styles.adminCardPhotoImg })
          : React.createElement('div', { style: styles.adminCardPhotoPlaceholder },
              `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`
            )
      ),
      React.createElement('div', { style: styles.adminCardInfo },
        React.createElement('h3', { style: styles.adminCardName, className: 'admin-card-name' }, member.fullName),
        member.nickname && React.createElement('span', { style: styles.adminCardNickname, className: 'admin-card-nickname' }, `"${member.nickname}"`),
        member.relation && React.createElement('span', { style: styles.adminCardRelation, className: 'admin-card-relation' }, member.relation)
      ),
      React.createElement('div', { style: styles.adminCardTimestamp, className: 'admin-card-timestamp' },
        new Date(member.submittedAt).toLocaleDateString()
      )
    ),
    
    React.createElement('div', { style: styles.adminCardDetails, className: 'admin-card-details' },
      member.fatherName && React.createElement('div', { style: styles.adminDetailRow, className: 'admin-detail-row' },
        React.createElement('span', { style: styles.adminDetailLabel }, 'Father: '),
        React.createElement('span', null, member.fatherName)
      ),
      member.motherName && React.createElement('div', { style: styles.adminDetailRow, className: 'admin-detail-row' },
        React.createElement('span', { style: styles.adminDetailLabel }, 'Mother: '),
        React.createElement('span', null, member.motherName)
      ),
      member.spouseName && React.createElement('div', { style: styles.adminDetailRow, className: 'admin-detail-row' },
        React.createElement('span', { style: styles.adminDetailLabel }, 'Spouse: '),
        React.createElement('span', null, member.spouseName)
      ),
      member.email && React.createElement('div', { style: styles.adminDetailRow, className: 'admin-detail-row' },
        React.createElement('span', { style: styles.adminDetailLabel }, 'Email: '),
        React.createElement('span', null, member.email)
      ),
      member.phone && React.createElement('div', { style: styles.adminDetailRow, className: 'admin-detail-row' },
        React.createElement('span', { style: styles.adminDetailLabel }, 'Phone: '),
        React.createElement('span', null, member.phone)
      ),
      member.location && React.createElement('div', { style: styles.adminDetailRow, className: 'admin-detail-row' },
        React.createElement('span', { style: styles.adminDetailLabel }, 'Location: '),
        React.createElement('span', null, member.location)
      )
    ),
    
    member.bio && React.createElement('div', { style: styles.adminCardBio, className: 'admin-card-bio' },
      React.createElement('p', { style: styles.adminBioText, className: 'admin-bio-text' }, member.bio)
    ),

    React.createElement('div', { style: styles.adminCardActions, className: 'admin-card-actions' },
      isPending
        ? [
            React.createElement('button', { key: 'approve', style: styles.approveButton, onClick: onApprove }, '✓ Approve'),
            React.createElement('button', { key: 'reject', style: styles.rejectButton, onClick: onReject }, '✕ Reject')
          ]
        : [
            React.createElement('button', { key: 'edit', style: styles.editButton, onClick: onEdit }, '✎ Edit'),
            React.createElement('button', { key: 'delete', style: styles.deleteButton, onClick: onDelete }, '🗑 Remove')
          ]
    )
  );
}

function EditModal({ member, existingMembers = [], onSave, onClose }) {
  const [formData, setFormData] = useState({
    salutation: member.salutation || '',
    customSalutation: '',
    firstName: member.firstName || '',
    lastName: member.lastName || '',
    nickname: member.nickname || '',
    fatherName: member.fatherName || '',
    motherName: member.motherName || '',
    spouseName: member.spouseName || '',
    relation: member.relation || '',
    email: member.email || '',
    phone: member.phone || '',
    location: member.location || '',
    bio: member.bio || '',
    photo: member.photo || null,
  });

  // Check if current salutation is a custom one (not in the predefined options)
  const isCustomSalutation = formData.salutation && 
    !SALUTATION_OPTIONS.slice(0, -1).some(opt => opt.value === formData.salutation);
  
  const [showCustomInput, setShowCustomInput] = useState(isCustomSalutation);

  // Filter out current member from dropdown options
  const otherMembers = existingMembers.filter(m => m.fullName !== member.fullName);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'salutation' && value === 'custom') {
      setShowCustomInput(true);
    } else if (field === 'salutation' && value !== 'custom') {
      setShowCustomInput(false);
    }
  };

  const handleSave = () => {
    // Determine the final salutation
    const finalSalutation = showCustomInput 
      ? (formData.salutation === 'custom' ? formData.customSalutation : formData.salutation)
      : formData.salutation;
    
    onSave({
      ...formData,
      salutation: finalSalutation,
      fullName: `${finalSalutation ? finalSalutation + ' ' : ''}${formData.firstName} ${formData.lastName}`.trim(),
    });
  };

  return React.createElement('div', { style: styles.modalOverlay, onClick: onClose },
    React.createElement('div', { style: {...styles.modal, ...styles.editModal}, className: 'modal edit-modal', onClick: e => e.stopPropagation() },
      React.createElement('button', { style: styles.modalClose, onClick: onClose }, '✕'),
      
      React.createElement('h2', { style: styles.editModalTitle, className: 'edit-modal-title' }, 'Edit Member'),
      
      React.createElement('div', { style: styles.editForm },
        // Salutation Field
        React.createElement('div', { style: styles.editField, className: 'edit-field' },
          React.createElement('label', { style: styles.editLabel, className: 'edit-label' }, 'Salutation'),
          React.createElement('select', {
            value: showCustomInput ? 'custom' : formData.salutation,
            onChange: (e) => handleChange('salutation', e.target.value),
            style: styles.editSelect,
            className: 'edit-select'
          },
            SALUTATION_OPTIONS.map(opt => 
              React.createElement('option', { key: opt.value, value: opt.value }, opt.label)
            )
          ),
          showCustomInput && React.createElement('input', {
            type: 'text',
            value: formData.salutation === 'custom' ? formData.customSalutation : formData.salutation,
            onChange: (e) => handleChange(formData.salutation === 'custom' ? 'customSalutation' : 'salutation', e.target.value),
            style: { ...styles.editInput, marginTop: '8px' },
            placeholder: 'Enter salutation',
            className: 'edit-input'
          })
        ),
        
        React.createElement('div', { style: styles.editRow, className: 'edit-row' },
          React.createElement('div', { style: styles.editField, className: 'edit-field' },
            React.createElement('label', { style: styles.editLabel, className: 'edit-label' }, 'First Name *'),
            React.createElement('input', {
              type: 'text',
              value: formData.firstName,
              onChange: (e) => handleChange('firstName', e.target.value),
              style: styles.editInput,
              className: 'edit-input'
            })
          ),
          React.createElement('div', { style: styles.editField, className: 'edit-field' },
            React.createElement('label', { style: styles.editLabel, className: 'edit-label' }, 'Last Name *'),
            React.createElement('input', {
              type: 'text',
              value: formData.lastName,
              onChange: (e) => handleChange('lastName', e.target.value),
              style: styles.editInput,
              className: 'edit-input'
            })
          )
        ),
        
        React.createElement('div', { style: styles.editField, className: 'edit-field' },
          React.createElement('label', { style: styles.editLabel, className: 'edit-label' }, 'Nickname'),
          React.createElement('input', {
            type: 'text',
            value: formData.nickname,
            onChange: (e) => handleChange('nickname', e.target.value),
            style: styles.editInput,
            className: 'edit-input'
          })
        ),
        
        // Father with dropdown
        React.createElement('div', { style: styles.editRow, className: 'edit-row' },
          React.createElement('div', { style: styles.editField, className: 'edit-field' },
            React.createElement('label', { style: styles.editLabel, className: 'edit-label' }, "Father's Name"),
            React.createElement('select', {
              value: otherMembers.some(m => m.fullName === formData.fatherName) ? formData.fatherName : '',
              onChange: (e) => handleChange('fatherName', e.target.value),
              style: styles.editSelect,
              className: 'edit-select'
            },
              React.createElement('option', { value: '' }, '-- Select from members --'),
              otherMembers
                .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''))
                .map(m => React.createElement('option', { key: m.id, value: m.fullName }, m.fullName))
            ),
            React.createElement('input', {
              type: 'text',
              value: formData.fatherName,
              onChange: (e) => handleChange('fatherName', e.target.value),
              style: { ...styles.editInput, marginTop: '4px', fontSize: '12px' },
              placeholder: 'Or type name manually',
              className: 'edit-input'
            })
          ),
          // Mother with dropdown
          React.createElement('div', { style: styles.editField, className: 'edit-field' },
            React.createElement('label', { style: styles.editLabel, className: 'edit-label' }, "Mother's Name"),
            React.createElement('select', {
              value: otherMembers.some(m => m.fullName === formData.motherName) ? formData.motherName : '',
              onChange: (e) => handleChange('motherName', e.target.value),
              style: styles.editSelect,
              className: 'edit-select'
            },
              React.createElement('option', { value: '' }, '-- Select from members --'),
              otherMembers
                .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''))
                .map(m => React.createElement('option', { key: m.id, value: m.fullName }, m.fullName))
            ),
            React.createElement('input', {
              type: 'text',
              value: formData.motherName,
              onChange: (e) => handleChange('motherName', e.target.value),
              style: { ...styles.editInput, marginTop: '4px', fontSize: '12px' },
              placeholder: 'Or type name manually',
              className: 'edit-input'
            })
          )
        ),
        
        // Spouse with dropdown
        React.createElement('div', { style: styles.editField, className: 'edit-field' },
          React.createElement('label', { style: styles.editLabel, className: 'edit-label' }, "Spouse/Partner's Name"),
          React.createElement('select', {
            value: otherMembers.some(m => m.fullName === formData.spouseName) ? formData.spouseName : '',
            onChange: (e) => handleChange('spouseName', e.target.value),
            style: styles.editSelect,
            className: 'edit-select'
          },
            React.createElement('option', { value: '' }, '-- Select from members --'),
            otherMembers
              .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''))
              .map(m => React.createElement('option', { key: m.id, value: m.fullName }, m.fullName))
          ),
          React.createElement('input', {
            type: 'text',
            value: formData.spouseName,
            onChange: (e) => handleChange('spouseName', e.target.value),
            style: { ...styles.editInput, marginTop: '4px', fontSize: '12px' },
            placeholder: 'Or type name manually',
            className: 'edit-input'
          })
        ),
        
        // Relation dropdown
        React.createElement('div', { style: styles.editField, className: 'edit-field' },
          React.createElement('label', { style: styles.editLabel, className: 'edit-label' }, 'How they joined the family'),
          React.createElement('select', {
            value: RELATION_OPTIONS.some(opt => opt.value === formData.relation) ? formData.relation : 'custom',
            onChange: (e) => {
              if (e.target.value === 'custom') {
                handleChange('relation', '');
              } else {
                handleChange('relation', e.target.value);
              }
            },
            style: styles.editSelect,
            className: 'edit-select'
          },
            RELATION_OPTIONS.map(opt => 
              React.createElement('option', { key: opt.value, value: opt.value }, opt.label)
            )
          ),
          (!RELATION_OPTIONS.some(opt => opt.value === formData.relation) || formData.relation === '') &&
            React.createElement('input', {
              type: 'text',
              value: formData.relation,
              onChange: (e) => handleChange('relation', e.target.value),
              style: { ...styles.editInput, marginTop: '4px' },
              placeholder: 'Describe their relation...',
              className: 'edit-input'
            })
        ),
        
        React.createElement('div', { style: styles.editRow, className: 'edit-row' },
          React.createElement('div', { style: styles.editField, className: 'edit-field' },
            React.createElement('label', { style: styles.editLabel, className: 'edit-label' }, 'Email'),
            React.createElement('input', {
              type: 'email',
              value: formData.email,
              onChange: (e) => handleChange('email', e.target.value),
              style: styles.editInput,
              placeholder: 'Optional',
              className: 'edit-input'
            })
          ),
          React.createElement('div', { style: styles.editField, className: 'edit-field' },
            React.createElement('label', { style: styles.editLabel, className: 'edit-label' }, 'Phone'),
            React.createElement('input', {
              type: 'tel',
              value: formData.phone,
              onChange: (e) => handleChange('phone', e.target.value),
              style: styles.editInput,
              placeholder: 'Optional',
              className: 'edit-input'
            })
          )
        ),
        
        React.createElement('div', { style: styles.editField, className: 'edit-field' },
          React.createElement('label', { style: styles.editLabel, className: 'edit-label' }, 'Location'),
          React.createElement('input', {
            type: 'text',
            value: formData.location,
            onChange: (e) => handleChange('location', e.target.value),
            style: styles.editInput,
            placeholder: 'City, State/Country (Optional)',
            className: 'edit-input'
          })
        ),
        
        React.createElement('div', { style: styles.editField, className: 'edit-field' },
          React.createElement('label', { style: styles.editLabel, className: 'edit-label' }, 'Bio'),
          React.createElement('textarea', {
            value: formData.bio,
            onChange: (e) => handleChange('bio', e.target.value),
            style: styles.editTextarea,
            rows: 3,
            className: 'edit-textarea'
          })
        ),
        
        React.createElement('div', { style: styles.editActions, className: 'edit-actions' },
          React.createElement('button', { style: styles.cancelButton, onClick: onClose }, 'Cancel'),
          React.createElement('button', { style: styles.saveButton, onClick: handleSave }, 'Save')
        )
      )
    )
  );
}

// ============================================
// UTILITY COMPONENTS
// ============================================
function LoadingScreen() {
  return React.createElement('div', { style: styles.loading },
    React.createElement('div', { style: styles.loadingSpinner }),
    React.createElement('p', { style: styles.loadingText }, 'Loading...')
  );
}

function Notification({ message, type }) {
  return React.createElement('div', {
    style: {
      ...styles.notification,
      backgroundColor: type === 'success' ? '#2d5a3d' : type === 'error' ? '#8b3a3a' : '#5a5a2d'
    }
  }, message);
}

function Footer() {
  return React.createElement('footer', { style: styles.footer },
    React.createElement('p', { style: styles.footerText },
      '🌿 Formusoh/Fomuso/Fomusoh Family Heritage'
    )
  );
}

// ============================================
// STYLES
// ============================================
const styles = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    backgroundColor: '#f8f6f1',
    color: '#3d3d3d',
  },
  
  header: {
    background: 'linear-gradient(135deg, #2d4a3e 0%, #3d5a4e 100%)',
    padding: '0 16px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 20px rgba(0,0,0,0.15)',
  },
  headerInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '70px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    color: 'white',
  },
  logoIcon: { fontSize: '28px' },
  logoText: {
    fontWeight: 700,
    fontSize: '22px',
    margin: 0,
    lineHeight: 1.2,
  },
  logoSubtext: {
    fontSize: '11px',
    opacity: 0.8,
  },
  menuButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '28px',
    cursor: 'pointer',
    padding: '8px',
    display: 'none',
  },
  menuIcon: { fontSize: '28px' },
  nav: {
    display: 'flex',
    gap: '6px',
  },
  navItem: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.85)',
    padding: '10px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s',
  },
  navItemActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: 'white',
  },
  navIcon: { fontSize: '16px' },
  badge: {
    backgroundColor: '#c9a959',
    color: 'white',
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '10px',
    marginLeft: '4px',
  },
  
  main: {
    flex: 1,
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
    padding: '24px',
  },
  
  homePage: { animation: 'fadeIn 0.4s ease' },
  heroSection: {
    background: 'linear-gradient(135deg, #2d4a3e 0%, #4a6b5d 100%)',
    borderRadius: '24px',
    padding: '60px 40px',
    color: 'white',
    textAlign: 'center',
    marginBottom: '40px',
    boxShadow: '0 10px 40px rgba(45,74,62,0.3)',
  },
  heroContent: { maxWidth: '600px', margin: '0 auto' },
  heroTitle: {
    fontSize: '42px',
    fontWeight: 700,
    marginBottom: '16px',
    lineHeight: 1.2,
  },
  heroSubtitle: {
    fontSize: '18px',
    opacity: 0.9,
    marginBottom: '32px',
    lineHeight: 1.6,
  },
  heroStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    marginBottom: '32px',
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: '16px',
    padding: '20px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#c9a959',
  },
  statLabel: {
    fontSize: '14px',
    opacity: 0.9,
    marginTop: '4px',
  },
  heroCta: {
    display: 'flex',
    gap: '14px',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#c9a959',
    color: '#2d4a3e',
    border: 'none',
    padding: '14px 28px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'transform 0.2s',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    color: 'white',
    border: '2px solid rgba(255,255,255,0.4)',
    padding: '14px 28px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  
  featuresSection: { marginBottom: '40px' },
  sectionTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#2d4a3e',
    marginBottom: '24px',
    textAlign: 'center',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
  },
  featureCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '28px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    border: '2px solid transparent',
    position: 'relative',
  },
  featureIcon: {
    fontSize: '36px',
    marginBottom: '14px',
    display: 'block',
  },
  featureTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#2d4a3e',
    marginBottom: '8px',
  },
  featureDescription: {
    fontSize: '14px',
    color: '#7a8a82',
    lineHeight: 1.5,
    margin: 0,
  },
  featureArrow: {
    position: 'absolute',
    right: '20px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '20px',
    color: '#c9a959',
    opacity: 0.5,
  },
  
  submitPage: { animation: 'fadeIn 0.4s ease' },
  formContainer: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '0 16px',
  },
  formHeader: {
    textAlign: 'center',
    marginBottom: '24px',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  formTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#2d4a3e',
    marginBottom: '8px',
  },
  formSubtitle: {
    fontSize: '15px',
    color: '#7a8a82',
    margin: 0,
  },
  formGuide: {
    backgroundColor: '#f0f7f4',
    borderRadius: '12px',
    padding: '16px 20px',
    marginTop: '20px',
    textAlign: 'left',
    borderLeft: '4px solid #2d4a3e',
  },
  guideText: {
    fontSize: '14px',
    color: '#4a5a52',
    margin: '0 0 10px 0',
    lineHeight: 1.5,
  },
  guideTextSmall: {
    fontSize: '13px',
    color: '#6a7a72',
    margin: 0,
    lineHeight: 1.5,
  },
  form: { display: 'flex', flexDirection: 'column', gap: '0' },
  photoSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
  },
  photoUpload: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    backgroundColor: '#f8f6f1',
    border: '3px dashed #d5d5d5',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.3s',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9a9a9a',
    fontSize: '13px',
    gap: '4px',
  },
  photoIcon: { fontSize: '28px' },
  photoPreviewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  photoInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
  },
  photoHint: {
    fontSize: '12px',
    color: '#9a9a9a',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  formSection: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  sectionHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '2px solid #f0f0f0',
  },
  sectionIcon: {
    fontSize: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#2d4a3e',
    margin: 0,
    flex: 1,
  },
  sectionHint: {
    fontSize: '12px',
    color: '#9aa99f',
    width: '100%',
  },
  requiredNote: {
    fontSize: '11px',
    color: '#c9a959',
    backgroundColor: '#fff8e1',
    padding: '4px 10px',
    borderRadius: '12px',
  },
  formRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    marginBottom: '16px',
  },
  fieldHint: {
    display: 'block',
    fontSize: '11px',
    color: '#9aa99f',
    marginTop: '6px',
    fontStyle: 'italic',
  },
  infoBox: {
    backgroundColor: '#f0f7f4',
    borderRadius: '10px',
    padding: '12px 16px',
    marginBottom: '20px',
    borderLeft: '4px solid #2d4a3e',
  },
  infoText: {
    fontSize: '13px',
    color: '#4a5a52',
    margin: 0,
    lineHeight: 1.5,
  },
  formField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '16px',
  },
  formFullWidth: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#4a5a52',
  },
  input: {
    padding: '12px 14px',
    border: '2px solid #e5e5e5',
    borderRadius: '10px',
    fontSize: '15px',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  select: {
    padding: '12px 14px',
    border: '2px solid #e5e5e5',
    borderRadius: '10px',
    fontSize: '16px', // 16px prevents iOS zoom on focus
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: 'white',
    cursor: 'pointer',
    minHeight: '48px', // Touch friendly
    WebkitAppearance: 'menulist',
    MozAppearance: 'menulist',
    appearance: 'menulist',
  },
  inputError: {
    borderColor: '#d9534f',
  },
  textarea: {
    padding: '12px 14px',
    border: '2px solid #e5e5e5',
    borderRadius: '10px',
    fontSize: '15px',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  errorText: {
    fontSize: '12px',
    color: '#d9534f',
    marginTop: '2px',
  },
  submitButton: {
    backgroundColor: '#2d4a3e',
    color: 'white',
    border: 'none',
    padding: '16px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
    marginTop: '8px',
  },
  submitButtonDisabled: {
    backgroundColor: '#9aa99f',
    cursor: 'not-allowed',
  },
  
  directoryPage: { animation: 'fadeIn 0.4s ease' },
  directoryHeader: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  pageTitle: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#2d4a3e',
    marginBottom: '8px',
  },
  pageSubtitle: {
    fontSize: '16px',
    color: '#7a8a82',
    margin: 0,
  },
  directoryControls: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  searchBox: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '0 16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    minWidth: '250px',
  },
  searchIcon: {
    fontSize: '18px',
    marginRight: '10px',
    color: '#9a9a9a',
  },
  searchInput: {
    border: 'none',
    padding: '14px 0',
    fontSize: '15px',
    fontFamily: 'inherit',
    outline: 'none',
    width: '100%',
    backgroundColor: 'transparent',
  },
  sortButton: {
    backgroundColor: 'white',
    border: '2px solid #e5e5e5',
    padding: '12px 20px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: '#4a5a52',
    whiteSpace: 'nowrap',
  },
  
  directoryGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  letterGroup: { marginBottom: '8px' },
  letterHeader: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#c9a959',
    marginBottom: '12px',
    paddingLeft: '4px',
  },
  membersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  memberCard: {
    backgroundColor: 'white',
    borderRadius: '14px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  memberPhoto: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
  },
  memberPhotoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  memberPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#c9a959',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: '16px',
  },
  memberInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  memberName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#2d4a3e',
    margin: 0,
  },
  memberNickname: {
    fontSize: '13px',
    color: '#c9a959',
    fontStyle: 'italic',
  },
  memberRelation: {
    fontSize: '13px',
    color: '#7a8a82',
  },
  memberLocation: {
    fontSize: '12px',
    color: '#9aa99f',
    marginTop: '2px',
  },
  memberArrow: {
    fontSize: '18px',
    color: '#d5d5d5',
  },
  
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#7a8a82',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    display: 'block',
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#4a5a52',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '15px',
    margin: 0,
  },
  
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
    animation: 'fadeIn 0.2s ease',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '24px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    position: 'relative',
    animation: 'slideIn 0.3s ease',
  },
  modalClose: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#9a9a9a',
    zIndex: 1,
  },
  modalContent: {
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  modalPhoto: {
    width: '140px',
    height: '140px',
    borderRadius: '50%',
    overflow: 'hidden',
    marginBottom: '20px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  },
  modalPhotoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  modalPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#c9a959',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: '36px',
  },
  modalInfo: {
    width: '100%',
  },
  modalName: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#2d4a3e',
    marginBottom: '4px',
  },
  modalNickname: {
    fontSize: '16px',
    color: '#c9a959',
    fontStyle: 'italic',
    marginBottom: '20px',
  },
  modalDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '20px',
    textAlign: 'left',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#9aa99f',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  detailValue: {
    fontSize: '14px',
    color: '#4a5a52',
    fontWeight: 500,
  },
  contactDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    backgroundColor: '#f8f6f1',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
    textAlign: 'left',
  },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    color: '#4a5a52',
  },
  contactIcon: {
    fontSize: '16px',
  },
  contactLink: {
    color: '#2d4a3e',
    textDecoration: 'none',
    fontWeight: 500,
  },
  modalBioSection: {
    backgroundColor: '#f8f6f1',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'left',
  },
  modalBioTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#9aa99f',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  modalBioText: {
    fontSize: '14px',
    color: '#5a6b63',
    lineHeight: 1.6,
    margin: 0,
  },
  
  treePage: { animation: 'fadeIn 0.4s ease' },
  treeHeader: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  treeControls: {
    display: 'flex',
    gap: '10px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  viewButton: {
    backgroundColor: 'white',
    border: '2px solid #e5e5e5',
    padding: '10px 18px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: '#7a8a82',
  },
  viewButtonActive: {
    backgroundColor: '#2d4a3e',
    borderColor: '#2d4a3e',
    color: 'white',
  },
  expandCollapseGroup: {
    display: 'flex',
    gap: '8px',
    marginLeft: 'auto',
  },
  expandButton: {
    backgroundColor: '#f8f6f1',
    border: '2px solid #e5e5e5',
    padding: '10px 16px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: '#6a7a72',
  },
  collapseButton: {
    backgroundColor: '#f8f6f1',
    border: '2px solid #e5e5e5',
    padding: '10px 16px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: '#6a7a72',
  },
  treeContainer: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  treeNode: {
    marginBottom: '8px',
  },
  treeNodeContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  treeToggle: {
    fontSize: '12px',
    color: '#9aa99f',
    width: '16px',
  },
  treeNodeCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#f8f6f1',
    borderRadius: '12px',
    padding: '10px 14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  treePhoto: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
  },
  treePhotoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  treePhotoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#c9a959',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: '12px',
  },
  treeInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  treeName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#2d4a3e',
  },
  treeNickname: {
    fontSize: '11px',
    color: '#c9a959',
    fontStyle: 'italic',
  },
  treeChildren: {
    marginLeft: '24px',
    marginTop: '8px',
    borderLeft: '2px solid #c9a959',
    paddingLeft: '16px',
  },
  coupleContainer: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '4px',
  },
  spouseConnector: {
    fontSize: '16px',
    margin: '0 4px',
  },
  childrenLabel: {
    fontSize: '12px',
    color: '#9aa99f',
    fontWeight: 600,
    marginBottom: '8px',
    paddingLeft: '4px',
  },
  treeLegend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '16px',
    padding: '12px 16px',
    backgroundColor: '#f0f7f4',
    borderRadius: '10px',
    fontSize: '13px',
  },
  legendItem: {
    color: '#5a6b63',
  },
  legendNote: {
    color: '#7a8a82',
    fontStyle: 'italic',
    fontSize: '12px',
    width: '100%',
    marginTop: '4px',
  },
  
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  listItem: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  listPhoto: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
  },
  listPhotoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  listPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#c9a959',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: '14px',
  },
  listInfo: { flex: 1 },
  listName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#2d4a3e',
    margin: 0,
  },
  listParents: {
    fontSize: '13px',
    color: '#7a8a82',
    margin: '2px 0 0 0',
  },
  listSpouse: {
    fontSize: '13px',
    color: '#c9a959',
    margin: '2px 0 0 0',
  },
  listSiblings: {
    fontSize: '12px',
    color: '#9aa99f',
    margin: '2px 0 0 0',
  },
  listRelation: {
    fontSize: '12px',
    color: '#7a8a82',
    margin: '2px 0 0 0',
  },
  
  adminLogin: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
  },
  loginCard: {
    backgroundColor: 'white',
    borderRadius: '24px',
    padding: '48px 40px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  loginIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    display: 'block',
  },
  loginTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#2d4a3e',
    marginBottom: '8px',
  },
  loginSubtitle: {
    fontSize: '15px',
    color: '#7a8a82',
    marginBottom: '24px',
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  loginInput: {
    padding: '14px 16px',
    border: '2px solid #e5e5e5',
    borderRadius: '12px',
    fontSize: '16px',
    fontFamily: 'inherit',
    textAlign: 'center',
    outline: 'none',
  },
  loginError: {
    fontSize: '13px',
    color: '#d9534f',
  },
  loginButton: {
    backgroundColor: '#2d4a3e',
    color: 'white',
    border: 'none',
    padding: '14px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  loginHint: {
    fontSize: '12px',
    color: '#9aa99f',
    marginTop: '16px',
  },
  
  adminPage: { animation: 'fadeIn 0.4s ease' },
  adminHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    gap: '16px',
  },
  logoutButton: {
    backgroundColor: '#f8f6f1',
    color: '#6a7a72',
    border: '2px solid #e5e5e5',
    padding: '10px 20px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  adminTabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    borderBottom: '2px solid #e5e5e5',
    paddingBottom: '14px',
    flexWrap: 'wrap',
  },
  adminTab: {
    backgroundColor: 'transparent',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: '#7a8a82',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  adminTabActive: { backgroundColor: '#2d4a3e', color: 'white' },
  tabBadge: {
    backgroundColor: '#c9a959',
    color: 'white',
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: '10px',
  },
  tabCount: { fontSize: '12px', opacity: 0.7 },
  adminContent: { minHeight: '300px' },
  pendingList: { display: 'flex', flexDirection: 'column', gap: '14px' },
  approvedList: { display: 'flex', flexDirection: 'column', gap: '14px' },
  
  adminCard: {
    backgroundColor: 'white',
    borderRadius: '14px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
  },
  adminCardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    marginBottom: '14px',
    flexWrap: 'wrap',
  },
  adminCardPhoto: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
  },
  adminCardPhotoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  adminCardPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#c9a959',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: '18px',
  },
  adminCardInfo: { flex: 1, minWidth: '150px' },
  adminCardName: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#2d4a3e',
    marginBottom: '3px',
  },
  adminCardNickname: {
    fontSize: '13px',
    color: '#c9a959',
    fontStyle: 'italic',
    display: 'block',
    marginBottom: '3px',
  },
  adminCardRelation: { fontSize: '13px', color: '#7a8a82' },
  adminCardTimestamp: { fontSize: '11px', color: '#9aa99f', marginLeft: 'auto' },
  adminCardDetails: {
    display: 'flex',
    gap: '20px',
    marginBottom: '14px',
    flexWrap: 'wrap',
  },
  adminDetailRow: { display: 'flex', gap: '6px', fontSize: '13px' },
  adminDetailLabel: { fontWeight: 600, color: '#4a5a52' },
  adminCardBio: {
    backgroundColor: '#f8f6f1',
    borderRadius: '10px',
    padding: '14px',
    marginBottom: '14px',
  },
  adminBioText: { fontSize: '13px', color: '#5a6b63', lineHeight: 1.5, margin: 0 },
  adminCardActions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  approveButton: {
    backgroundColor: '#2d5a3d',
    color: 'white',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    flex: 1,
    minWidth: '100px',
  },
  rejectButton: {
    backgroundColor: '#d9534f',
    color: 'white',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    flex: 1,
    minWidth: '100px',
  },
  editButton: {
    backgroundColor: '#c9a959',
    color: 'white',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    flex: 1,
    minWidth: '100px',
  },
  deleteButton: {
    backgroundColor: '#f8f6f1',
    color: '#d9534f',
    border: '2px solid #d9534f',
    padding: '8px 16px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    flex: 1,
    minWidth: '100px',
  },
  
  editModal: { maxWidth: '600px', padding: '32px' },
  editModalTitle: {
    fontWeight: 700,
    fontSize: '24px',
    color: '#2d4a3e',
    marginBottom: '20px',
    textAlign: 'center',
  },
  editForm: { display: 'flex', flexDirection: 'column', gap: '14px' },
  editRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
  editField: { display: 'flex', flexDirection: 'column', gap: '5px' },
  editLabel: { fontSize: '12px', fontWeight: 600, color: '#4a5a52' },
  editInput: {
    padding: '10px 12px',
    border: '2px solid #e5e5e5',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  editSelect: {
    padding: '10px 12px',
    border: '2px solid #e5e5e5',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  editTextarea: {
    padding: '10px 12px',
    border: '2px solid #e5e5e5',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  editActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '14px',
  },
  cancelButton: {
    backgroundColor: '#f8f6f1',
    color: '#6a7a72',
    border: '2px solid #e5e5e5',
    padding: '10px 20px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  saveButton: {
    backgroundColor: '#2d4a3e',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8f6f1',
  },
  loadingSpinner: {
    width: '36px',
    height: '36px',
    border: '4px solid #e5e5e5',
    borderTopColor: '#2d4a3e',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '14px',
  },
  loadingText: { fontSize: '15px', color: '#7a8a82' },
  notification: {
    position: 'fixed',
    top: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 500,
    zIndex: 1001,
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    maxWidth: '90%',
    textAlign: 'center',
  },
  footer: {
    backgroundColor: '#2d4a3e',
    padding: '20px',
    textAlign: 'center',
    marginTop: 'auto',
  },
  footerText: { color: 'rgba(255,255,255,0.8)', fontSize: '13px', margin: 0 },
};

// ============================================
// RENDER THE APP
// ============================================
ReactDOM.render(
  React.createElement(FamilyWebsite),
  document.getElementById('root')
);

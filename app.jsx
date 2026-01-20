const { useState, useEffect, useCallback, useMemo } = React;

// ============================================
// FAMILY HERITAGE WEBSITE WITH FIREBASE
// ============================================

const ADMIN_PASSWORD = "family2024"; // Change this to your desired password

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

  // Load data from Firebase and listen for real-time updates
  useEffect(() => {
    // Check if Firebase is configured
    if (!window.db) {
      console.error('Firebase not configured!');
      setIsLoading(false);
      return;
    }

    // Listen for approved members
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

    // Listen for pending members
    const unsubscribePending = window.db.collection('members')
      .where('status', '==', 'pending')
      .onSnapshot((snapshot) => {
        const pendingData = [];
        snapshot.forEach((doc) => {
          pendingData.push({ id: doc.id, ...doc.data() });
        });
        setPendingMembers(pendingData);
      });

    // Cleanup listeners on unmount
    return () => {
      unsubscribeMembers();
      unsubscribePending();
    };
  }, []);

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Add new member (to pending)
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

  // Approve member
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

  // Reject member
  const rejectMember = async (memberId) => {
    try {
      await window.db.collection('members').doc(memberId).delete();
      showNotification('Submission removed.', 'info');
    } catch (error) {
      console.error('Error rejecting member:', error);
    }
  };

  // Delete approved member
  const deleteMember = async (memberId) => {
    try {
      await window.db.collection('members').doc(memberId).delete();
      showNotification('Member removed.', 'info');
    } catch (error) {
      console.error('Error deleting member:', error);
    }
  };

  // Edit member
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
    
    React.createElement('main', { style: styles.main },
      currentPage === 'home' && React.createElement(HomePage, {
        setCurrentPage: setCurrentPage,
        memberCount: members.length
      }),
      
      currentPage === 'submit' && React.createElement(SubmitPage, {
        onSubmit: submitMember
      }),
      
      currentPage === 'directory' && React.createElement(DirectoryPage, {
        members: members
      }),
      
      currentPage === 'tree' && React.createElement(FamilyTreePage, {
        members: members
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
    { id: 'admin', label: isAdmin ? 'Admin Panel' : 'Admin', icon: '⚙️', badge: isAdmin && pendingCount > 0 ? pendingCount : null },
  ];

  return React.createElement('header', { style: styles.header },
    React.createElement('div', { style: styles.headerInner },
      React.createElement('div', { 
        style: styles.logo, 
        onClick: () => setCurrentPage('home') 
      },
        React.createElement('span', { style: styles.logoIcon }, '🌿'),
        React.createElement('div', null,
          React.createElement('h1', { style: styles.logoText }, 'Our Family'),
          React.createElement('span', { style: styles.logoSubtext }, 'Heritage & Connections')
        )
      ),
      
      React.createElement('button', { 
        style: styles.menuButton, 
        onClick: () => setMenuOpen(!menuOpen) 
      },
        React.createElement('span', { style: styles.menuIcon }, menuOpen ? '✕' : '☰')
      ),
      
      React.createElement('nav', { style: {...styles.nav, ...(menuOpen ? styles.navOpen : {})} },
        navItems.map(item => 
          React.createElement('button', {
            key: item.id,
            onClick: () => { setCurrentPage(item.id); setMenuOpen(false); },
            style: {
              ...styles.navItem,
              ...(currentPage === item.id ? styles.navItemActive : {})
            }
          },
            React.createElement('span', { style: styles.navIcon }, item.icon),
            item.label,
            item.badge && React.createElement('span', { style: styles.badge }, item.badge)
          )
        )
      )
    )
  );
}

// ============================================
// HOME PAGE
// ============================================
function HomePage({ setCurrentPage, memberCount }) {
  return React.createElement('div', { style: styles.homePage },
    React.createElement('div', { style: styles.heroSection },
      React.createElement('div', { style: styles.heroContent },
        React.createElement('h1', { style: styles.heroTitle }, 'Welcome to Our Family'),
        React.createElement('p', { style: styles.heroSubtitle },
          'A place to connect, share, and preserve our family history for generations to come.'
        ),
        React.createElement('div', { style: styles.heroStats },
          React.createElement('div', { style: styles.statCard },
            React.createElement('span', { style: styles.statNumber }, memberCount),
            React.createElement('span', { style: styles.statLabel }, 'Family Members')
          )
        ),
        React.createElement('div', { style: styles.heroCta },
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
      React.createElement('h2', { style: styles.sectionTitle }, 'Explore Our Heritage'),
      React.createElement('div', { style: styles.featuresGrid },
        React.createElement(FeatureCard, {
          icon: '📖',
          title: 'Member Directory',
          description: 'Browse all family members alphabetically. Search by name and learn about each person\'s story.',
          action: () => setCurrentPage('directory')
        }),
        React.createElement(FeatureCard, {
          icon: '🌳',
          title: 'Family Tree',
          description: 'Visualize our family connections through an interactive tree showing relationships across generations.',
          action: () => setCurrentPage('tree')
        }),
        React.createElement(FeatureCard, {
          icon: '➕',
          title: 'Join the Tree',
          description: 'Add your information and photo to be included in our family directory and tree.',
          action: () => setCurrentPage('submit')
        })
      )
    )
  );
}

function FeatureCard({ icon, title, description, action }) {
  return React.createElement('div', { style: styles.featureCard, onClick: action },
    React.createElement('span', { style: styles.featureIcon }, icon),
    React.createElement('h3', { style: styles.featureTitle }, title),
    React.createElement('p', { style: styles.featureDescription }, description),
    React.createElement('span', { style: styles.featureArrow }, '→')
  );
}

// ============================================
// SUBMIT PAGE
// ============================================
function SubmitPage({ onSubmit }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    nickname: '',
    fatherName: '',
    motherName: '',
    relation: '',
    bio: '',
    photo: null,
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
        // Compress image for Firebase
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
    if (!formData.fatherName.trim()) newErrors.fatherName = "Father's name is required";
    if (!formData.motherName.trim()) newErrors.motherName = "Mother's name is required";
    if (!formData.relation.trim()) newErrors.relation = 'Relation to family is required';
    if (!formData.bio.trim()) newErrors.bio = 'A short bio is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsSubmitting(true);
    await onSubmit({
      ...formData,
      fullName: `${formData.firstName} ${formData.lastName}`.trim(),
    });
    setIsSubmitting(false);
  };

  return React.createElement('div', { style: styles.submitPage },
    React.createElement('div', { style: styles.formContainer },
      React.createElement('div', { style: styles.formHeader },
        React.createElement('h1', { style: styles.formTitle }, 'Join Our Family Tree'),
        React.createElement('p', { style: styles.formSubtitle },
          'Submit your information to be added to our family directory. An administrator will review and approve your submission.'
        )
      ),

      React.createElement('form', { onSubmit: handleSubmit, style: styles.form },
        React.createElement('div', { style: styles.photoSection },
          React.createElement('div', { style: styles.photoUpload },
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
          React.createElement('span', { style: styles.photoHint }, 'Optional - Max 2MB')
        ),

        React.createElement('div', { style: styles.formGrid },
          React.createElement(FormField, {
            label: 'First Name *',
            value: formData.firstName,
            onChange: (v) => handleChange('firstName', v),
            error: errors.firstName,
            placeholder: 'Your first name'
          }),
          React.createElement(FormField, {
            label: 'Last Name *',
            value: formData.lastName,
            onChange: (v) => handleChange('lastName', v),
            error: errors.lastName,
            placeholder: 'Your last name'
          }),
          React.createElement(FormField, {
            label: 'Nickname / Other Name',
            value: formData.nickname,
            onChange: (v) => handleChange('nickname', v),
            placeholder: 'Any other name you go by'
          }),
          React.createElement(FormField, {
            label: 'Relation to Family *',
            value: formData.relation,
            onChange: (v) => handleChange('relation', v),
            error: errors.relation,
            placeholder: 'e.g., Son of John Smith, Cousin'
          }),
          React.createElement(FormField, {
            label: "Father's Name *",
            value: formData.fatherName,
            onChange: (v) => handleChange('fatherName', v),
            error: errors.fatherName,
            placeholder: "Your father's full name"
          }),
          React.createElement(FormField, {
            label: "Mother's Name *",
            value: formData.motherName,
            onChange: (v) => handleChange('motherName', v),
            error: errors.motherName,
            placeholder: "Your mother's full name"
          })
        ),

        React.createElement('div', { style: styles.formFullWidth },
          React.createElement('label', { style: styles.label }, 'About You *'),
          React.createElement('textarea', {
            value: formData.bio,
            onChange: (e) => handleChange('bio', e.target.value),
            style: {...styles.textarea, ...(errors.bio ? styles.inputError : {})},
            placeholder: 'Share a short paragraph about yourself - your interests, achievements, or anything you\'d like family members to know...',
            rows: 5
          }),
          errors.bio && React.createElement('span', { style: styles.errorText }, errors.bio)
        ),

        React.createElement('button', {
          type: 'submit',
          style: {...styles.submitButton, ...(isSubmitting ? styles.submitButtonDisabled : {})},
          disabled: isSubmitting
        }, isSubmitting ? 'Submitting...' : 'Submit for Approval')
      )
    )
  );
}

function FormField({ label, value, onChange, error, placeholder, type = 'text' }) {
  return React.createElement('div', { style: styles.formField },
    React.createElement('label', { style: styles.label }, label),
    React.createElement('input', {
      type: type,
      value: value,
      onChange: (e) => onChange(e.target.value),
      style: {...styles.input, ...(error ? styles.inputError : {})},
      placeholder: placeholder
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
        member.motherName?.toLowerCase().includes(searchLower)
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

  // Group by first letter
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
      React.createElement('h1', { style: styles.pageTitle }, 'Family Directory'),
      React.createElement('p', { style: styles.pageSubtitle },
        `${members.length} family members • Sorted alphabetically by last name`
      )
    ),

    React.createElement('div', { style: styles.directoryControls },
      React.createElement('div', { style: styles.searchBox },
        React.createElement('span', { style: styles.searchIcon }, '🔍'),
        React.createElement('input', {
          type: 'text',
          placeholder: 'Search by name, relation, or parents...',
          value: searchTerm,
          onChange: (e) => setSearchTerm(e.target.value),
          style: styles.searchInput
        })
      ),
      React.createElement('button', {
        style: styles.sortButton,
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
              ? 'Be the first to add your information to the family directory!'
              : 'Try adjusting your search terms.'
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
  return React.createElement('div', { style: styles.memberCard, onClick: onClick },
    React.createElement('div', { style: styles.memberPhoto },
      member.photo
        ? React.createElement('img', { src: member.photo, alt: member.fullName, style: styles.memberPhotoImg })
        : React.createElement('div', { style: styles.memberPhotoPlaceholder },
            `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`
          )
    ),
    React.createElement('div', { style: styles.memberInfo },
      React.createElement('h3', { style: styles.memberName }, member.fullName),
      member.nickname && React.createElement('span', { style: styles.memberNickname }, `"${member.nickname}"`),
      React.createElement('span', { style: styles.memberRelation }, member.relation)
    ),
    React.createElement('span', { style: styles.memberArrow }, '→')
  );
}

function MemberModal({ member, onClose }) {
  return React.createElement('div', { style: styles.modalOverlay, onClick: onClose },
    React.createElement('div', { style: styles.modal, onClick: e => e.stopPropagation() },
      React.createElement('button', { style: styles.modalClose, onClick: onClose }, '✕'),
      
      React.createElement('div', { style: styles.modalContent },
        React.createElement('div', { style: styles.modalPhoto },
          member.photo
            ? React.createElement('img', { src: member.photo, alt: member.fullName, style: styles.modalPhotoImg })
            : React.createElement('div', { style: styles.modalPhotoPlaceholder },
                `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`
              )
        ),
        
        React.createElement('div', { style: styles.modalInfo },
          React.createElement('h2', { style: styles.modalName }, member.fullName),
          member.nickname && React.createElement('p', { style: styles.modalNickname }, `Also known as "${member.nickname}"`),
          
          React.createElement('div', { style: styles.modalDetails },
            React.createElement('div', { style: styles.detailItem },
              React.createElement('span', { style: styles.detailLabel }, 'Relation'),
              React.createElement('span', { style: styles.detailValue }, member.relation)
            ),
            React.createElement('div', { style: styles.detailItem },
              React.createElement('span', { style: styles.detailLabel }, 'Father'),
              React.createElement('span', { style: styles.detailValue }, member.fatherName)
            ),
            React.createElement('div', { style: styles.detailItem },
              React.createElement('span', { style: styles.detailLabel }, 'Mother'),
              React.createElement('span', { style: styles.detailValue }, member.motherName)
            )
          ),
          
          React.createElement('div', { style: styles.modalBio },
            React.createElement('h4', { style: styles.bioLabel }, 'About'),
            React.createElement('p', { style: styles.bioText }, member.bio)
          )
        )
      )
    )
  );
}

// ============================================
// FAMILY TREE PAGE
// ============================================
function FamilyTreePage({ members }) {
  const [viewMode, setViewMode] = useState('visual');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  // Build family relationships
  const familyData = useMemo(() => {
    const people = {};
    
    members.forEach(member => {
      people[member.fullName] = {
        ...member,
        children: [],
        parents: []
      };
    });

    members.forEach(member => {
      if (member.fatherName && people[member.fatherName]) {
        people[member.fatherName].children.push(member.fullName);
        people[member.fullName].parents.push(member.fatherName);
      }
      if (member.motherName && people[member.motherName]) {
        people[member.motherName].children.push(member.fullName);
        people[member.fullName].parents.push(member.motherName);
      }
    });

    const roots = Object.values(people).filter(p => 
      p.parents.length === 0 || p.parents.every(parent => !people[parent])
    );

    return { people, roots };
  }, [members]);

  const toggleNode = (name) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const renderTreeNode = (personName, level = 0, visited = new Set()) => {
    if (visited.has(personName)) return null;
    const newVisited = new Set(visited);
    newVisited.add(personName);

    const person = familyData.people[personName];
    if (!person) return null;

    const hasChildren = person.children.length > 0;
    const isExpanded = expandedNodes.has(personName);

    return React.createElement('div', { key: personName, style: { ...styles.treeNode, marginLeft: level * 24 } },
      React.createElement('div', {
        style: styles.treeNodeContent,
        onClick: () => hasChildren && toggleNode(personName)
      },
        hasChildren
          ? React.createElement('span', { style: styles.treeToggle }, isExpanded ? '▼' : '▶')
          : React.createElement('span', { style: { width: 16 } }),
        React.createElement('div', {
          style: styles.treeNodeCard,
          onClick: (e) => { e.stopPropagation(); setSelectedPerson(person); }
        },
          React.createElement('div', { style: styles.treePhoto },
            person.photo
              ? React.createElement('img', { src: person.photo, alt: personName, style: styles.treePhotoImg })
              : React.createElement('div', { style: styles.treePhotoPlaceholder },
                  `${person.firstName?.[0] || ''}${person.lastName?.[0] || ''}`
                )
          ),
          React.createElement('div', { style: styles.treeInfo },
            React.createElement('span', { style: styles.treeName }, personName),
            person.nickname && React.createElement('span', { style: styles.treeNickname }, `"${person.nickname}"`)
          )
        )
      ),
      hasChildren && isExpanded && React.createElement('div', { style: styles.treeChildren },
        person.children.map(childName => renderTreeNode(childName, level + 1, newVisited))
      )
    );
  };

  return React.createElement('div', { style: styles.treePage },
    React.createElement('div', { style: styles.treeHeader },
      React.createElement('h1', { style: styles.pageTitle }, 'Family Tree'),
      React.createElement('p', { style: styles.pageSubtitle },
        'Explore our family connections • Click on ▶ to expand branches'
      )
    ),

    React.createElement('div', { style: styles.treeControls },
      React.createElement('button', {
        style: {...styles.viewButton, ...(viewMode === 'visual' ? styles.viewButtonActive : {})},
        onClick: () => setViewMode('visual')
      }, '🌳 Tree View'),
      React.createElement('button', {
        style: {...styles.viewButton, ...(viewMode === 'list' ? styles.viewButtonActive : {})},
        onClick: () => setViewMode('list')
      }, '📋 List View'),
      React.createElement('button', {
        style: styles.expandButton,
        onClick: () => setExpandedNodes(new Set(Object.keys(familyData.people)))
      }, 'Expand All'),
      React.createElement('button', {
        style: styles.collapseButton,
        onClick: () => setExpandedNodes(new Set())
      }, 'Collapse All')
    ),

    members.length === 0
      ? React.createElement('div', { style: styles.emptyState },
          React.createElement('span', { style: styles.emptyIcon }, '🌱'),
          React.createElement('h3', { style: styles.emptyTitle }, 'The tree is waiting to grow'),
          React.createElement('p', { style: styles.emptyText }, 'Add family members to see the family tree!')
        )
      : viewMode === 'visual'
        ? React.createElement('div', { style: styles.treeContainer },
            familyData.roots.map(person => renderTreeNode(person.fullName))
          )
        : React.createElement('div', { style: styles.listContainer },
            members.map(member =>
              React.createElement('div', {
                key: member.id,
                style: styles.listItem,
                onClick: () => setSelectedPerson(member)
              },
                React.createElement('div', { style: styles.listPhoto },
                  member.photo
                    ? React.createElement('img', { src: member.photo, alt: member.fullName, style: styles.listPhotoImg })
                    : React.createElement('div', { style: styles.listPhotoPlaceholder },
                        `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`
                      )
                ),
                React.createElement('div', { style: styles.listInfo },
                  React.createElement('h4', { style: styles.listName }, member.fullName),
                  React.createElement('p', { style: styles.listParents },
                    `Parents: ${member.fatherName} & ${member.motherName}`
                  )
                )
              )
            )
          ),

    selectedPerson && React.createElement(MemberModal, {
      member: selectedPerson,
      onClose: () => setSelectedPerson(null)
    })
  );
}

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
      setLoginError('Incorrect password. Please try again.');
    }
  };

  if (!isAdmin) {
    return React.createElement('div', { style: styles.adminLogin },
      React.createElement('div', { style: styles.loginCard },
        React.createElement('span', { style: styles.loginIcon }, '🔐'),
        React.createElement('h2', { style: styles.loginTitle }, 'Admin Access'),
        React.createElement('p', { style: styles.loginSubtitle }, 'Enter the admin password to manage submissions'),
        
        React.createElement('form', { onSubmit: handleLogin, style: styles.loginForm },
          React.createElement('input', {
            type: 'password',
            value: password,
            onChange: (e) => setPassword(e.target.value),
            placeholder: 'Enter password',
            style: styles.loginInput
          }),
          loginError && React.createElement('span', { style: styles.loginError }, loginError),
          React.createElement('button', { type: 'submit', style: styles.loginButton },
            'Access Admin Panel'
          )
        ),
        React.createElement('p', { style: styles.loginHint }, 'Default: family2024')
      )
    );
  }

  return React.createElement('div', { style: styles.adminPage },
    React.createElement('div', { style: styles.adminHeader },
      React.createElement('div', null,
        React.createElement('h1', { style: styles.pageTitle }, 'Admin Panel'),
        React.createElement('p', { style: styles.pageSubtitle }, 'Manage family member submissions and approvals')
      ),
      React.createElement('button', { 
        style: styles.logoutButton, 
        onClick: () => setIsAdmin(false) 
      }, 'Logout')
    ),

    React.createElement('div', { style: styles.adminTabs },
      React.createElement('button', {
        style: {...styles.adminTab, ...(activeTab === 'pending' ? styles.adminTabActive : {})},
        onClick: () => setActiveTab('pending')
      },
        'Pending Approval',
        pendingMembers.length > 0 && React.createElement('span', { style: styles.tabBadge }, pendingMembers.length)
      ),
      React.createElement('button', {
        style: {...styles.adminTab, ...(activeTab === 'approved' ? styles.adminTabActive : {})},
        onClick: () => setActiveTab('approved')
      },
        'Approved Members',
        React.createElement('span', { style: styles.tabCount }, `(${approvedMembers.length})`)
      )
    ),

    React.createElement('div', { style: styles.adminContent },
      activeTab === 'pending' && (
        pendingMembers.length === 0
          ? React.createElement('div', { style: styles.emptyState },
              React.createElement('span', { style: styles.emptyIcon }, '✓'),
              React.createElement('h3', { style: styles.emptyTitle }, 'All caught up!'),
              React.createElement('p', { style: styles.emptyText }, 'No pending submissions to review.')
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
              React.createElement('h3', { style: styles.emptyTitle }, 'No approved members yet'),
              React.createElement('p', { style: styles.emptyText }, 'Approved submissions will appear here.')
            )
          : React.createElement('div', { style: styles.approvedList },
              approvedMembers.map(member =>
                React.createElement(AdminMemberCard, {
                  key: member.id,
                  member: member,
                  onEdit: () => setEditingMember(member),
                  onDelete: () => {
                    if (window.confirm(`Are you sure you want to remove ${member.fullName}?`)) {
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
      onSave: (data) => {
        onEdit(editingMember.id, data);
        setEditingMember(null);
      },
      onClose: () => setEditingMember(null)
    })
  );
}

function AdminMemberCard({ member, isPending, onApprove, onReject, onEdit, onDelete }) {
  return React.createElement('div', { style: styles.adminCard },
    React.createElement('div', { style: styles.adminCardHeader },
      React.createElement('div', { style: styles.adminCardPhoto },
        member.photo
          ? React.createElement('img', { src: member.photo, alt: member.fullName, style: styles.adminCardPhotoImg })
          : React.createElement('div', { style: styles.adminCardPhotoPlaceholder },
              `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`
            )
      ),
      React.createElement('div', { style: styles.adminCardInfo },
        React.createElement('h3', { style: styles.adminCardName }, member.fullName),
        member.nickname && React.createElement('span', { style: styles.adminCardNickname }, `"${member.nickname}"`),
        React.createElement('span', { style: styles.adminCardRelation }, member.relation)
      ),
      React.createElement('div', { style: styles.adminCardTimestamp },
        `Submitted: ${new Date(member.submittedAt).toLocaleDateString()}`
      )
    ),
    
    React.createElement('div', { style: styles.adminCardDetails },
      React.createElement('div', { style: styles.adminDetailRow },
        React.createElement('span', { style: styles.adminDetailLabel }, 'Father:'),
        React.createElement('span', null, member.fatherName)
      ),
      React.createElement('div', { style: styles.adminDetailRow },
        React.createElement('span', { style: styles.adminDetailLabel }, 'Mother:'),
        React.createElement('span', null, member.motherName)
      )
    ),
    
    React.createElement('div', { style: styles.adminCardBio },
      React.createElement('span', { style: styles.adminBioLabel }, 'Bio:'),
      React.createElement('p', { style: styles.adminBioText }, member.bio)
    ),

    React.createElement('div', { style: styles.adminCardActions },
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

function EditModal({ member, onSave, onClose }) {
  const [formData, setFormData] = useState({
    firstName: member.firstName || '',
    lastName: member.lastName || '',
    nickname: member.nickname || '',
    fatherName: member.fatherName || '',
    motherName: member.motherName || '',
    relation: member.relation || '',
    bio: member.bio || '',
    photo: member.photo || null,
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave({
      ...formData,
      fullName: `${formData.firstName} ${formData.lastName}`.trim(),
    });
  };

  return React.createElement('div', { style: styles.modalOverlay, onClick: onClose },
    React.createElement('div', { style: {...styles.modal, ...styles.editModal}, onClick: e => e.stopPropagation() },
      React.createElement('button', { style: styles.modalClose, onClick: onClose }, '✕'),
      
      React.createElement('h2', { style: styles.editModalTitle }, 'Edit Member'),
      
      React.createElement('div', { style: styles.editForm },
        React.createElement('div', { style: styles.editRow },
          React.createElement('div', { style: styles.editField },
            React.createElement('label', { style: styles.editLabel }, 'First Name'),
            React.createElement('input', {
              type: 'text',
              value: formData.firstName,
              onChange: (e) => handleChange('firstName', e.target.value),
              style: styles.editInput
            })
          ),
          React.createElement('div', { style: styles.editField },
            React.createElement('label', { style: styles.editLabel }, 'Last Name'),
            React.createElement('input', {
              type: 'text',
              value: formData.lastName,
              onChange: (e) => handleChange('lastName', e.target.value),
              style: styles.editInput
            })
          )
        ),
        
        React.createElement('div', { style: styles.editField },
          React.createElement('label', { style: styles.editLabel }, 'Nickname'),
          React.createElement('input', {
            type: 'text',
            value: formData.nickname,
            onChange: (e) => handleChange('nickname', e.target.value),
            style: styles.editInput
          })
        ),
        
        React.createElement('div', { style: styles.editRow },
          React.createElement('div', { style: styles.editField },
            React.createElement('label', { style: styles.editLabel }, "Father's Name"),
            React.createElement('input', {
              type: 'text',
              value: formData.fatherName,
              onChange: (e) => handleChange('fatherName', e.target.value),
              style: styles.editInput
            })
          ),
          React.createElement('div', { style: styles.editField },
            React.createElement('label', { style: styles.editLabel }, "Mother's Name"),
            React.createElement('input', {
              type: 'text',
              value: formData.motherName,
              onChange: (e) => handleChange('motherName', e.target.value),
              style: styles.editInput
            })
          )
        ),
        
        React.createElement('div', { style: styles.editField },
          React.createElement('label', { style: styles.editLabel }, 'Relation to Family'),
          React.createElement('input', {
            type: 'text',
            value: formData.relation,
            onChange: (e) => handleChange('relation', e.target.value),
            style: styles.editInput
          })
        ),
        
        React.createElement('div', { style: styles.editField },
          React.createElement('label', { style: styles.editLabel }, 'Bio'),
          React.createElement('textarea', {
            value: formData.bio,
            onChange: (e) => handleChange('bio', e.target.value),
            style: styles.editTextarea,
            rows: 4
          })
        ),
        
        React.createElement('div', { style: styles.editActions },
          React.createElement('button', { style: styles.cancelButton, onClick: onClose }, 'Cancel'),
          React.createElement('button', { style: styles.saveButton, onClick: handleSave }, 'Save Changes')
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
    React.createElement('p', { style: styles.loadingText }, 'Loading family data...')
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
      '🌿 Our Family Heritage • Built with love for generations'
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
    fontFamily: "'Source Sans 3', -apple-system, BlinkMacSystemFont, sans-serif",
    backgroundColor: '#f8f6f1',
    color: '#3d3d3d',
  },
  
  header: {
    background: 'linear-gradient(135deg, #2d4a3e 0%, #3d5a4e 100%)',
    padding: '0 24px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 20px rgba(0,0,0,0.15)',
  },
  headerInner: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '70px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    color: 'white',
  },
  logoIcon: { fontSize: '32px' },
  logoText: {
    fontFamily: "'Georgia', serif",
    fontSize: '24px',
    fontWeight: 600,
    margin: 0,
    lineHeight: 1.2,
  },
  logoSubtext: {
    fontSize: '12px',
    opacity: 0.8,
    letterSpacing: '0.5px',
  },
  menuButton: {
    display: 'none',
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '8px',
  },
  menuIcon: { fontSize: '24px' },
  nav: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  navOpen: { display: 'flex' },
  navItem: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.85)',
    padding: '10px 16px',
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
    color: '#2d4a3e',
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '10px',
    marginLeft: '4px',
  },
  
  main: {
    flex: 1,
    maxWidth: '1400px',
    width: '100%',
    margin: '0 auto',
    padding: '24px',
  },
  
  homePage: { animation: 'fadeIn 0.5s ease' },
  heroSection: {
    background: 'linear-gradient(135deg, #f5f0e8 0%, #ebe4d8 100%)',
    borderRadius: '24px',
    padding: '60px 40px',
    marginBottom: '40px',
    textAlign: 'center',
    border: '1px solid rgba(0,0,0,0.05)',
  },
  heroContent: { maxWidth: '700px', margin: '0 auto' },
  heroTitle: {
    fontFamily: "'Georgia', serif",
    fontSize: '48px',
    fontWeight: 600,
    color: '#2d4a3e',
    marginBottom: '16px',
    lineHeight: 1.2,
  },
  heroSubtitle: {
    fontSize: '18px',
    color: '#5a6b63',
    lineHeight: 1.6,
    marginBottom: '32px',
  },
  heroStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    marginBottom: '32px',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '20px 32px',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  },
  statNumber: {
    display: 'block',
    fontFamily: "'Georgia', serif",
    fontSize: '36px',
    fontWeight: 700,
    color: '#2d4a3e',
  },
  statLabel: { fontSize: '14px', color: '#7a8a82' },
  heroCta: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  primaryButton: {
    backgroundColor: '#2d4a3e',
    color: 'white',
    border: 'none',
    padding: '14px 28px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  secondaryButton: {
    backgroundColor: 'white',
    color: '#2d4a3e',
    border: '2px solid #2d4a3e',
    padding: '12px 26px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  
  featuresSection: { marginBottom: '40px' },
  sectionTitle: {
    fontFamily: "'Georgia', serif",
    fontSize: '32px',
    fontWeight: 600,
    color: '#2d4a3e',
    textAlign: 'center',
    marginBottom: '32px',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
  },
  featureCard: {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: '32px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    border: '1px solid rgba(0,0,0,0.05)',
    position: 'relative',
    overflow: 'hidden',
  },
  featureIcon: { fontSize: '40px', display: 'block', marginBottom: '16px' },
  featureTitle: {
    fontFamily: "'Georgia', serif",
    fontSize: '22px',
    fontWeight: 600,
    color: '#2d4a3e',
    marginBottom: '12px',
  },
  featureDescription: {
    fontSize: '15px',
    color: '#6a7a72',
    lineHeight: 1.6,
    marginBottom: '16px',
  },
  featureArrow: {
    position: 'absolute',
    bottom: '24px',
    right: '24px',
    fontSize: '24px',
    color: '#c9a959',
    fontWeight: 600,
  },
  
  pageTitle: {
    fontFamily: "'Georgia', serif",
    fontSize: '36px',
    fontWeight: 600,
    color: '#2d4a3e',
    marginBottom: '8px',
  },
  pageSubtitle: { fontSize: '16px', color: '#6a7a72' },
  
  submitPage: { animation: 'fadeIn 0.5s ease' },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: '24px',
    padding: '40px',
    maxWidth: '800px',
    margin: '0 auto',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  },
  formHeader: { textAlign: 'center', marginBottom: '32px' },
  formTitle: {
    fontFamily: "'Georgia', serif",
    fontSize: '32px',
    fontWeight: 600,
    color: '#2d4a3e',
    marginBottom: '8px',
  },
  formSubtitle: { fontSize: '16px', color: '#6a7a72' },
  form: { display: 'flex', flexDirection: 'column', gap: '24px' },
  photoSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  photoUpload: {
    width: '140px',
    height: '140px',
    borderRadius: '50%',
    overflow: 'hidden',
    position: 'relative',
    cursor: 'pointer',
    border: '3px dashed #c9a959',
    backgroundColor: '#faf8f4',
  },
  photoPreviewImg: { width: '100%', height: '100%', objectFit: 'cover' },
  photoPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#9aa99f',
    fontSize: '14px',
  },
  photoIcon: { fontSize: '32px', marginBottom: '4px' },
  photoInput: {
    position: 'absolute',
    inset: 0,
    opacity: 0,
    cursor: 'pointer',
  },
  photoHint: { fontSize: '12px', color: '#9aa99f' },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
  },
  formField: { display: 'flex', flexDirection: 'column', gap: '6px' },
  formFullWidth: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '14px', fontWeight: 600, color: '#4a5a52' },
  input: {
    padding: '12px 16px',
    border: '2px solid #e5e5e5',
    borderRadius: '10px',
    fontSize: '16px',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
    outline: 'none',
  },
  inputError: { borderColor: '#d9534f' },
  textarea: {
    padding: '12px 16px',
    border: '2px solid #e5e5e5',
    borderRadius: '10px',
    fontSize: '16px',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
  },
  errorText: { fontSize: '12px', color: '#d9534f' },
  submitButton: {
    backgroundColor: '#2d4a3e',
    color: 'white',
    border: 'none',
    padding: '16px 32px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: '16px',
    transition: 'all 0.2s',
  },
  submitButtonDisabled: { opacity: 0.7, cursor: 'not-allowed' },
  
  directoryPage: { animation: 'fadeIn 0.5s ease' },
  directoryHeader: { marginBottom: '24px' },
  directoryControls: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  searchBox: { flex: 1, minWidth: '280px', position: 'relative' },
  searchIcon: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '18px',
  },
  searchInput: {
    width: '100%',
    padding: '14px 16px 14px 48px',
    border: '2px solid #e5e5e5',
    borderRadius: '12px',
    fontSize: '16px',
    fontFamily: 'inherit',
    backgroundColor: 'white',
    outline: 'none',
  },
  sortButton: {
    backgroundColor: 'white',
    border: '2px solid #e5e5e5',
    padding: '14px 24px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: '#4a5a52',
  },
  
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'white',
    borderRadius: '20px',
  },
  emptyIcon: { fontSize: '48px', display: 'block', marginBottom: '16px' },
  emptyTitle: {
    fontFamily: "'Georgia', serif",
    fontSize: '24px',
    fontWeight: 600,
    color: '#2d4a3e',
    marginBottom: '8px',
  },
  emptyText: { fontSize: '16px', color: '#7a8a82' },
  
  directoryGrid: { display: 'flex', flexDirection: 'column', gap: '24px' },
  letterGroup: {
    backgroundColor: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  letterHeader: {
    backgroundColor: '#2d4a3e',
    color: 'white',
    padding: '12px 20px',
    fontFamily: "'Georgia', serif",
    fontSize: '24px',
    fontWeight: 600,
  },
  membersList: { padding: '8px' },
  memberCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  memberPhoto: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
  },
  memberPhotoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  memberPhotoPlaceholder: {
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
  memberInfo: { flex: 1 },
  memberName: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#2d4a3e',
    marginBottom: '2px',
  },
  memberNickname: {
    fontSize: '14px',
    color: '#c9a959',
    fontStyle: 'italic',
    display: 'block',
    marginBottom: '2px',
  },
  memberRelation: { fontSize: '14px', color: '#7a8a82' },
  memberArrow: { fontSize: '20px', color: '#c9a959' },
  
  modalOverlay: {
    position: 'fixed',
    inset: 0,
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
    maxWidth: '600px',
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
    color: '#7a8a82',
    zIndex: 10,
  },
  modalContent: { padding: '40px' },
  modalPhoto: {
    width: '160px',
    height: '160px',
    borderRadius: '50%',
    overflow: 'hidden',
    margin: '0 auto 24px',
    border: '4px solid #c9a959',
  },
  modalPhotoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  modalPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#c9a959',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: '48px',
  },
  modalInfo: { textAlign: 'center' },
  modalName: {
    fontFamily: "'Georgia', serif",
    fontSize: '32px',
    fontWeight: 600,
    color: '#2d4a3e',
    marginBottom: '4px',
  },
  modalNickname: {
    fontSize: '16px',
    color: '#c9a959',
    fontStyle: 'italic',
    marginBottom: '24px',
  },
  modalDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    backgroundColor: '#f8f6f1',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '24px',
  },
  detailItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  detailLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#9aa99f',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  detailValue: { fontSize: '15px', color: '#2d4a3e' },
  modalBio: { textAlign: 'left' },
  bioLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#4a5a52',
    marginBottom: '8px',
  },
  bioText: { fontSize: '16px', color: '#5a6b63', lineHeight: 1.7 },
  
  treePage: { animation: 'fadeIn 0.5s ease' },
  treeHeader: { marginBottom: '24px' },
  treeControls: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  viewButton: {
    backgroundColor: 'white',
    border: '2px solid #e5e5e5',
    padding: '12px 20px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: '#4a5a52',
    transition: 'all 0.2s',
  },
  viewButtonActive: {
    backgroundColor: '#2d4a3e',
    borderColor: '#2d4a3e',
    color: 'white',
  },
  expandButton: {
    backgroundColor: '#f8f6f1',
    border: '2px solid #e5e5e5',
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: '#6a7a72',
    marginLeft: 'auto',
  },
  collapseButton: {
    backgroundColor: '#f8f6f1',
    border: '2px solid #e5e5e5',
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: '#6a7a72',
  },
  treeContainer: {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: '24px',
    minHeight: '400px',
  },
  treeNode: { marginBottom: '8px' },
  treeNodeContent: { display: 'flex', alignItems: 'center', gap: '8px' },
  treeToggle: { fontSize: '12px', color: '#9aa99f', width: '16px', cursor: 'pointer' },
  treeNodeCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    backgroundColor: '#f8f6f1',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  treePhoto: { width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden' },
  treePhotoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  treePhotoPlaceholder: {
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
  treeInfo: { display: 'flex', flexDirection: 'column' },
  treeName: { fontSize: '15px', fontWeight: 600, color: '#2d4a3e' },
  treeNickname: { fontSize: '12px', color: '#c9a959', fontStyle: 'italic' },
  treeChildren: {
    marginTop: '8px',
    paddingLeft: '24px',
    borderLeft: '2px solid #e5e5e5',
    marginLeft: '7px',
  },
  
  listContainer: { backgroundColor: 'white', borderRadius: '20px', padding: '16px' },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    borderBottom: '1px solid #f0f0f0',
  },
  listPhoto: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
  },
  listPhotoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  listPhotoPlaceholder: {
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
  listInfo: { flex: 1 },
  listName: { fontSize: '16px', fontWeight: 600, color: '#2d4a3e', marginBottom: '2px' },
  listParents: { fontSize: '13px', color: '#7a8a82', margin: 0 },
  
  adminLogin: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    animation: 'fadeIn 0.5s ease',
  },
  loginCard: {
    backgroundColor: 'white',
    borderRadius: '24px',
    padding: '48px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  },
  loginIcon: { fontSize: '48px', marginBottom: '16px' },
  loginTitle: {
    fontFamily: "'Georgia', serif",
    fontSize: '28px',
    fontWeight: 600,
    color: '#2d4a3e',
    marginBottom: '8px',
  },
  loginSubtitle: { fontSize: '15px', color: '#7a8a82', marginBottom: '24px' },
  loginForm: { display: 'flex', flexDirection: 'column', gap: '16px' },
  loginInput: {
    padding: '14px 16px',
    border: '2px solid #e5e5e5',
    borderRadius: '12px',
    fontSize: '16px',
    fontFamily: 'inherit',
    textAlign: 'center',
    outline: 'none',
  },
  loginError: { fontSize: '14px', color: '#d9534f' },
  loginButton: {
    backgroundColor: '#2d4a3e',
    color: 'white',
    border: 'none',
    padding: '14px 24px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  loginHint: { fontSize: '12px', color: '#9aa99f', marginTop: '16px' },
  
  adminPage: { animation: 'fadeIn 0.5s ease' },
  adminHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
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
    marginBottom: '24px',
    borderBottom: '2px solid #e5e5e5',
    paddingBottom: '16px',
    flexWrap: 'wrap',
  },
  adminTab: {
    backgroundColor: 'transparent',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: '#7a8a82',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
  },
  adminTabActive: { backgroundColor: '#2d4a3e', color: 'white' },
  tabBadge: {
    backgroundColor: '#c9a959',
    color: 'white',
    fontSize: '12px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '10px',
  },
  tabCount: { fontSize: '13px', opacity: 0.7 },
  adminContent: { minHeight: '400px' },
  pendingList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  approvedList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  
  adminCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  adminCardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  adminCardPhoto: {
    width: '64px',
    height: '64px',
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
    fontSize: '20px',
  },
  adminCardInfo: { flex: 1, minWidth: '200px' },
  adminCardName: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#2d4a3e',
    marginBottom: '4px',
  },
  adminCardNickname: {
    fontSize: '14px',
    color: '#c9a959',
    fontStyle: 'italic',
    display: 'block',
    marginBottom: '4px',
  },
  adminCardRelation: { fontSize: '14px', color: '#7a8a82' },
  adminCardTimestamp: { fontSize: '12px', color: '#9aa99f', marginLeft: 'auto' },
  adminCardDetails: {
    display: 'flex',
    gap: '24px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  adminDetailRow: { display: 'flex', gap: '8px', fontSize: '14px' },
  adminDetailLabel: { fontWeight: 600, color: '#4a5a52' },
  adminCardBio: {
    backgroundColor: '#f8f6f1',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
  },
  adminBioLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#9aa99f',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: '8px',
  },
  adminBioText: { fontSize: '14px', color: '#5a6b63', lineHeight: 1.6, margin: 0 },
  adminCardActions: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  approveButton: {
    backgroundColor: '#2d5a3d',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  rejectButton: {
    backgroundColor: '#d9534f',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  editButton: {
    backgroundColor: '#c9a959',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  deleteButton: {
    backgroundColor: '#f8f6f1',
    color: '#d9534f',
    border: '2px solid #d9534f',
    padding: '8px 18px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  
  editModal: { maxWidth: '700px', padding: '40px' },
  editModalTitle: {
    fontFamily: "'Georgia', serif",
    fontSize: '28px',
    fontWeight: 600,
    color: '#2d4a3e',
    marginBottom: '24px',
    textAlign: 'center',
  },
  editForm: { display: 'flex', flexDirection: 'column', gap: '16px' },
  editRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  editField: { display: 'flex', flexDirection: 'column', gap: '6px' },
  editLabel: { fontSize: '13px', fontWeight: 600, color: '#4a5a52' },
  editInput: {
    padding: '12px 14px',
    border: '2px solid #e5e5e5',
    borderRadius: '10px',
    fontSize: '15px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  editTextarea: {
    padding: '12px 14px',
    border: '2px solid #e5e5e5',
    borderRadius: '10px',
    fontSize: '15px',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
  },
  editActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '16px',
  },
  cancelButton: {
    backgroundColor: '#f8f6f1',
    color: '#6a7a72',
    border: '2px solid #e5e5e5',
    padding: '12px 24px',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  saveButton: {
    backgroundColor: '#2d4a3e',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '10px',
    fontSize: '15px',
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
    width: '40px',
    height: '40px',
    border: '4px solid #e5e5e5',
    borderTopColor: '#2d4a3e',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
  loadingText: { fontSize: '16px', color: '#7a8a82' },
  notification: {
    position: 'fixed',
    top: '90px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'white',
    padding: '14px 28px',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 500,
    zIndex: 1001,
    animation: 'fadeIn 0.3s ease',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
  },
  footer: {
    backgroundColor: '#2d4a3e',
    padding: '24px',
    textAlign: 'center',
    marginTop: 'auto',
  },
  footerText: { color: 'rgba(255,255,255,0.8)', fontSize: '14px', margin: 0 },
};

// ============================================
// RENDER THE APP
// ============================================
ReactDOM.render(
  React.createElement(FamilyWebsite),
  document.getElementById('root')
);

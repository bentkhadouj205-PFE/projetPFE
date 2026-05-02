const fs = require('fs');
let c = fs.readFileSync('src/sections/AdminDashboard.tsx', 'utf8');

const openDetailFn = `
  const openDetail = (req) => {
    setSelectedRequest(req);
    setShowRejectInput(false);
    setRejectReason('');
    setValidationView('detail');
  };

`;

// Insert before handleAddEmployee
c = c.replace('const handleAddEmployee', openDetailFn + '  const handleAddEmployee');

fs.writeFileSync('src/sections/AdminDashboard.tsx', c, 'utf8');
console.log('openDetail injected successfully!');

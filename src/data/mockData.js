export const stats = [
  { label: 'Total Documents', value: '48,250', trend: '+12.4%', dir: 'up', color: '#2563eb', icon: 'documents' },
  { label: 'Pending Approvals', value: '142', trend: '+3.1%', dir: 'up', color: '#d97706', icon: 'clock' },
  { label: 'Active Employees', value: '1,840', trend: '+2.8%', dir: 'up', color: '#16a34a', icon: 'employees' },
  { label: 'Storage Used', value: '84.2 GB', trend: '-4.5%', dir: 'down', color: '#7c3aed', icon: 'chart' },
];

export const recentSubmissions = [
  { name: 'Global_Expansion_Plan.pdf', author: 'Alisha Patel', status: 'approved', type: 'pdf', meta: '2.4 MB • just now', dept: 'HR & Talent' },
  { name: 'Tax_Deductions_List.xlsx', author: 'Devon Carter', status: 'pending', type: 'xlsx', meta: '840 KB • 35 min ago', dept: 'Finance' },
  { name: 'Vendor_Agreement_Draft.docx', author: 'Jonathan Briggs', status: 'rejected', type: 'docx', meta: '1.2 MB • 2 hrs ago', dept: 'Legal & Compliance' },
  { name: 'Q4_Infrastructure_Plan.pdf', author: 'Marcus Vance', status: 'approved', type: 'pdf', meta: '5.1 MB • 5 hrs ago', dept: 'Engineering' },
];

export const categories = [
  { name: 'Reports', value: 42, color: '#2563eb' },
  { name: 'Finance', value: 26, color: '#7c3aed' },
  { name: 'HR Documents', value: 18, color: '#16a34a' },
  { name: 'Legal', value: 9, color: '#d97706' },
  { name: 'Other', value: 5, color: '#94a3b8' },
];

export const activityBars = [
  { h: 30, active: false },
  { h: 55, active: false },
  { h: 40, active: false },
  { h: 75, active: false },
  { h: 50, active: true },
  { h: 95, active: true },
  { h: 65, active: false },
  { h: 45, active: false },
  { h: 80, active: false },
  { h: 60, active: false },
];

export const documents = [
  { id: 1, title: '2026_Recruitment_Strategy.pdf', author: 'Jane Doe', size: '12.4 MB', date: '2 days ago', status: 'approved', type: 'pdf', dept: 'HR & Talent' },
  { id: 2, title: 'Q3_Consolidated_Ledgers.xlsx', author: 'Devon Carter', size: '4.8 MB', date: '3 days ago', status: 'approved', type: 'xlsx', dept: 'Finance' },
  { id: 3, title: 'HQ_Onboarding_Manual.docx', author: 'Alisha Patel', size: '2.1 MB', date: '2 days ago', status: 'pending', type: 'docx', dept: 'HR & Talent' },
  { id: 4, title: 'NDA_Template_Global_2026.pdf', author: 'Lana Sterling', size: '1.4 MB', date: '4 days ago', status: 'rejected', type: 'pdf', dept: 'Legal & Compliance' },
  { id: 5, title: 'Q4_Infrastructure_Plan.pdf', author: 'Marcus Vance', size: '5.1 MB', date: '1 week ago', status: 'approved', type: 'pdf', dept: 'Engineering' },
  { id: 6, title: 'Vendor_Agreement_Draft.docx', author: 'Jonathan Briggs', size: '1.2 MB', date: '5 days ago', status: 'rejected', type: 'docx', dept: 'Legal & Compliance' },
  { id: 7, title: 'Tax_Deductions_List.xlsx', author: 'Devon Carter', size: '840 KB', date: '3 days ago', status: 'pending', type: 'xlsx', dept: 'Finance' },
  { id: 8, title: 'Global_Expansion_Plan.pdf', author: 'Alisha Patel', size: '2.4 MB', date: 'just now', status: 'approved', type: 'pdf', dept: 'HR & Talent' },
];

export const folders = [
  { name: 'All Documents', count: '48.2k' },
  { name: 'Reports', count: '12.1k' },
  { name: 'Finance', count: '9.4k' },
  { name: 'HR Documents', count: '6.8k' },
  { name: 'Legal', count: '3.2k' },
  { name: 'Archived', count: '5.5k' },
];

export const emails = [
  {
    id: 1,
    sender: 'Jonathan Briggs',
    cat: 'HR',
    subject: 'New Hire Onboarding Documents Needed',
    preview: 'Hi, we need the onboarding documents for the new hires...',
    time: '09:24',
    body: `Hi there,

We've just welcomed five new hires into the HR & Talent team for the coming quarter. Could you please ensure the onboarding documents are compiled and sent for approval before Friday?

The required templates are in the shared drive under /Onboarding/2026. Please review the checklist and prioritize the ones marked as urgent.

Thanks,
Jonathan`,
    attachment: 'onboarding-checklist.pdf',
  },
  {
    id: 2,
    sender: 'Finance AutoMailer',
    cat: 'Finance',
    subject: 'Approved: Monthly Payroll Reconciliations',
    preview: 'Your monthly payroll reconciliations have been approved...',
    time: 'Yesterday',
    body: `Automated notification

Your submission "Monthly Payroll Reconciliations" has been approved by the Finance review queue.

Signed copies are now available for download. No further action is required from your side.

Regards,
Finance AutoMailer`,
    attachment: 'payroll-reconciliation.pdf',
  },
  {
    id: 3,
    sender: 'Marcus Vance',
    cat: 'Engineering',
    subject: 'Urgent: Infrastructure Plan Clarification',
    preview: 'A couple of points in the Q4 infrastructure plan need clarification...',
    time: 'Yesterday',
    body: `Hi team,

Reviewing the Q4 infrastructure plan, a couple of points need clarification before we can sign off. Specifically the migration timeline and the budget allocation for the network upgrades.

Could you schedule a brief sync this week?

Best,
Marcus`,
    attachment: 'infrastructure-plan.pdf',
  },
  {
    id: 4,
    sender: 'Compliance Bot',
    cat: 'System',
    subject: 'Weekly Access Logs Audit Generated',
    preview: 'The weekly access logs audit has been generated successfully...',
    time: 'Mon',
    body: `Automated notification

The weekly access logs audit has been generated and stored. Review the summary and flag any anomalies before the compliance review on Thursday.

No action required unless a discrepancy is identified.

Regards,
Compliance Bot`,
    attachment: 'access-logs-summary.xlsx',
  },
  {
    id: 5,
    sender: 'Lana Sterling',
    cat: 'Legal',
    subject: 'NDA Renewal Reminder',
    preview: 'A friendly reminder that several NDAs are due for renewal...',
    time: 'Fri',
    body: `Hi,

Just a reminder that several global NDAs are due for renewal at the end of this quarter. Let me know if you need the updated templates.

Thanks,
Lana`,
    attachment: null,
  },
];

export const tableRows = [
  { id: 'SUB-1082', name: 'Marcus Vance', dept: 'Engineering', doc: 'Q4_Infrastructure_Plan.pdf', date: 'Aug 24, 2026', status: 'approved' },
  { id: 'SUB-1081', name: 'Alisha Patel', dept: 'HR & Talent', doc: 'HQ_Onboarding_Manual.docx', date: 'Aug 23, 2026', status: 'pending' },
  { id: 'SUB-1080', name: 'Devon Carter', dept: 'Finance', doc: 'Q3_Consolidated_Ledgers.xlsx', date: 'Aug 22, 2026', status: 'approved' },
  { id: 'SUB-1079', name: 'Lana Sterling', dept: 'Legal & Compliance', doc: 'NDA_Template_Global_2026.pdf', date: 'Aug 21, 2026', status: 'rejected' },
  { id: 'SUB-1078', name: 'Jonathan Briggs', dept: 'HR & Talent', doc: 'Vendor_Agreement_Draft.docx', date: 'Aug 20, 2026', status: 'pending' },
  { id: 'SUB-1077', name: 'Sarah Okafor', dept: 'Operations', doc: 'Q3_Ops_Summary.docx', date: 'Aug 19, 2026', status: 'approved' },
  { id: 'SUB-1076', name: 'Tom Whitfield', dept: 'Engineering', doc: 'API_Documentation.pdf', date: 'Aug 18, 2026', status: 'approved' },
  { id: 'SUB-1075', name: 'Maya Chen', dept: 'Finance', doc: 'Budget_Proposal_2027.xlsx', date: 'Aug 17, 2026', status: 'pending' },
  { id: 'SUB-1074', name: 'Diego Ramos', dept: 'Legal & Compliance', doc: 'Compliance_Checklist.pdf', date: 'Aug 16, 2026', status: 'rejected' },
  { id: 'SUB-1073', name: 'Nina Kowalski', dept: 'Operations', doc: 'SOP_Update.docx', date: 'Aug 15, 2026', status: 'approved' },
  { id: 'SUB-1072', name: 'Omar Haddad', dept: 'Engineering', doc: 'Deployment_Runbook.pdf', date: 'Aug 14, 2026', status: 'approved' },
  { id: 'SUB-1071', name: 'Priya Sharma', dept: 'HR & Talent', doc: 'Interview_Notes.docx', date: 'Aug 13, 2026', status: 'pending' },
  { id: 'SUB-1070', name: 'Ethan Doyle', dept: 'Finance', doc: 'Quarterly_Report.xlsx', date: 'Aug 12, 2026', status: 'approved' },
  { id: 'SUB-1069', name: 'Grace Liu', dept: 'Legal & Compliance', doc: 'Policy_Update_2026.pdf', date: 'Aug 11, 2026', status: 'rejected' },
];

export const employees = [
  { id: 1, name: 'Marcus Vance', dept: 'Engineering', role: 'Senior Engineer', status: 'active', email: 'marcus.vance@noffice.io' },
  { id: 2, name: 'Alisha Patel', dept: 'HR & Talent', role: 'HR Manager', status: 'active', email: 'alisha.patel@noffice.io' },
  { id: 3, name: 'Devon Carter', dept: 'Finance', role: 'Financial Analyst', status: 'active', email: 'devon.carter@noffice.io' },
  { id: 4, name: 'Lana Sterling', dept: 'Legal & Compliance', role: 'Legal Counsel', status: 'inactive', email: 'lana.sterling@noffice.io' },
  { id: 5, name: 'Jonathan Briggs', dept: 'HR & Talent', role: 'Talent Lead', status: 'active', email: 'jonathan.briggs@noffice.io' },
  { id: 6, name: 'Sarah Okafor', dept: 'Operations', role: 'Ops Director', status: 'active', email: 'sarah.okafor@noffice.io' },
  { id: 7, name: 'Tom Whitfield', dept: 'Engineering', role: 'DevOps Engineer', status: 'active', email: 'tom.whitfield@noffice.io' },
  { id: 8, name: 'Maya Chen', dept: 'Finance', role: 'Accountant', status: 'inactive', email: 'maya.chen@noffice.io' },
  { id: 9, name: 'Diego Ramos', dept: 'Legal & Compliance', role: 'Compliance Officer', status: 'active', email: 'diego.ramos@noffice.io' },
  { id: 10, name: 'Nina Kowalski', dept: 'Operations', role: 'Project Lead', status: 'active', email: 'nina.kowalski@noffice.io' },
  { id: 11, name: 'Omar Haddad', dept: 'Engineering', role: 'Backend Engineer', status: 'active', email: 'omar.haddad@noffice.io' },
  { id: 12, name: 'Priya Sharma', dept: 'HR & Talent', role: 'Recruiter', status: 'inactive', email: 'priya.sharma@noffice.io' },
];

export const departments = ['All Departments', 'Engineering', 'HR & Talent', 'Finance', 'Legal & Compliance', 'Operations'];
export const statuses = ['All Status', 'Approved', 'Pending', 'Rejected'];
export const subStatuses = ['All Status', 'Approved', 'Pending', 'Rejected'];

export const DEPARTMENTS = [
  'Engineering',
  'HR & Talent',
  'Finance',
  'Legal & Compliance',
  'Operations',
];
export const RECIPIENT_STATUSES = ['Approved', 'Pending', 'Rejected'];
export const EMPLOYEE_STATUSES = ['Active', 'Inactive'];

export const UPLOAD_CATEGORIES = [
  'Reports',
  'Finance',
  'HR & Talent',
  'Legal & Compliance',
  'Engineering',
  'Operations',
];

export const STORAGE_KEYS = {
  documents: 'noffice.documents',
  employees: 'noffice.employees',
  messages: 'noffice.messages',
  account: 'noffice.account',
  notifications: 'noffice.notifications',
  notificationItems: 'noffice.notificationItems',
  general: 'noffice.general',
  security: 'noffice.security',
  appearance: 'noffice.appearance',
  language: 'noffice.language',
};

export const TIMEZONES = [
  { value: 'UTC', label: '(UTC+00:00) Coordinated Universal Time' },
  { value: 'Asia/Jakarta', label: '(UTC+07:00) Jakarta, Indonesia' },
  { value: 'Asia/Makassar', label: '(UTC+08:00) Makassar, Indonesia' },
  { value: 'Asia/Jayapura', label: '(UTC+09:00) Jayapura, Indonesia' },
  { value: 'Asia/Singapore', label: '(UTC+08:00) Singapore' },
  { value: 'Asia/Tokyo', label: '(UTC+09:00) Tokyo, Japan' },
  { value: 'Europe/London', label: '(UTC+00:00) London, United Kingdom' },
  { value: 'Europe/Paris', label: '(UTC+01:00) Paris, France' },
  { value: 'America/New_York', label: '(UTC-05:00) New York' },
  { value: 'America/Los_Angeles', label: '(UTC-08:00) Los Angeles' },
  { value: 'Australia/Sydney', label: '(UTC+10:00) Sydney, Australia' },
  { value: 'Pacific/Auckland', label: '(UTC+12:00) Auckland, New Zealand' },
];

export const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'DD MMM YYYY', label: 'DD MMM YYYY' },
  { value: 'MMM D, YYYY', label: 'MMM D, YYYY' },
];

export const MAX_STORAGE_GB = 100;
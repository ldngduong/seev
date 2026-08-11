export const categoryGroups = [
  ['software', 'Software Engineering', 10],
  ['quality', 'QA & Software Testing', 20],
  ['data_ai', 'Data & AI', 30],
  ['infrastructure', 'Cloud & Infrastructure', 40],
  ['security', 'Cybersecurity', 50],
  ['embedded_automation', 'Embedded & Automation', 60],
  ['product_delivery', 'Product & Delivery', 70],
  ['design', 'Product Design', 80],
  ['game', 'Game Development', 90],
] as const;

/** Stable internal UUIDs. The numeric suffix is only a human-readable seed
 * ordinal; it is not an id from TopCV or any other job board. */
const categoryUuid = (ordinal: number) =>
  `10000000-0000-4000-8000-${String(ordinal).padStart(12, '0')}`;

const categoryOrdinal = (id: string) => Number(id.slice(-12));

export const categories = [
  [
    categoryUuid(1001),
    'software.backend',
    'Backend Engineering',
    'software',
    10,
  ],
  [
    categoryUuid(1002),
    'software.frontend',
    'Frontend Engineering',
    'software',
    20,
  ],
  [
    categoryUuid(1003),
    'software.fullstack',
    'Full-stack Engineering',
    'software',
    30,
  ],
  [categoryUuid(1004), 'software.mobile', 'Mobile Engineering', 'software', 40],
  [
    categoryUuid(1005),
    'software.desktop',
    'Desktop Application Development',
    'software',
    50,
  ],
  [
    categoryUuid(1006),
    'software.architecture',
    'Software & Solution Architecture',
    'software',
    60,
  ],
  [
    categoryUuid(1101),
    'quality.manual',
    'Manual QA / Software Testing',
    'quality',
    10,
  ],
  [
    categoryUuid(1102),
    'quality.automation',
    'Automation QA / SDET',
    'quality',
    20,
  ],
  [
    categoryUuid(1201),
    'data.analyst',
    'Data Analyst / Business Intelligence',
    'data_ai',
    10,
  ],
  [categoryUuid(1202), 'data.engineer', 'Data Engineering', 'data_ai', 20],
  [categoryUuid(1203), 'data.scientist', 'Data Science', 'data_ai', 30],
  [
    categoryUuid(1204),
    'ai.ml',
    'AI / Machine Learning Engineering',
    'data_ai',
    40,
  ],
  [
    categoryUuid(1301),
    'infra.devops',
    'DevOps / Cloud / SRE',
    'infrastructure',
    10,
  ],
  [
    categoryUuid(1302),
    'infra.system_network',
    'System & Network Engineering',
    'infrastructure',
    20,
  ],
  [
    categoryUuid(1303),
    'infra.database',
    'Database Administration',
    'infrastructure',
    30,
  ],
  [
    categoryUuid(1304),
    'infra.it_support',
    'IT Support / Helpdesk',
    'infrastructure',
    40,
  ],
  [
    categoryUuid(1401),
    'security.cybersecurity',
    'Cybersecurity',
    'security',
    10,
  ],
  [
    categoryUuid(1501),
    'embedded.iot',
    'Embedded Systems / IoT',
    'embedded_automation',
    10,
  ],
  [
    categoryUuid(1502),
    'automation.rpa',
    'RPA / Software Automation',
    'embedded_automation',
    20,
  ],
  [
    categoryUuid(1601),
    'product.business_analysis',
    'Business Analysis',
    'product_delivery',
    10,
  ],
  [
    categoryUuid(1602),
    'product.management',
    'Product Management',
    'product_delivery',
    20,
  ],
  [
    categoryUuid(1603),
    'delivery.project',
    'IT Project / Delivery / Scrum',
    'product_delivery',
    30,
  ],
  [
    categoryUuid(1701),
    'design.product',
    'UI / UX / Product Design',
    'design',
    10,
  ],
  [categoryUuid(1801), 'game.development', 'Game Development', 'game', 10],
] as const;

export const aliases: Record<number, string[]> = {
  1001: [
    'backend developer',
    'backend engineer',
    'server-side developer',
    'java developer',
    '.net developer',
    'php developer',
    'golang developer',
    'nodejs developer',
    'lập trình backend',
    'lập trình viên backend',
  ],
  1002: [
    'frontend developer',
    'frontend engineer',
    'front-end developer',
    'react developer',
    'vue developer',
    'angular developer',
    'web frontend',
    'lập trình frontend',
    'lập trình viên frontend',
  ],
  1003: [
    'fullstack developer',
    'full-stack developer',
    'full stack engineer',
    'full stack software engineer',
  ],
  1004: [
    'mobile developer',
    'android developer',
    'ios developer',
    'flutter developer',
    'react native developer',
  ],
  1005: [
    'desktop developer',
    'desktop application developer',
    'windows developer',
    'wpf developer',
  ],
  1006: [
    'software architect',
    'solution architect',
    'solutions architect',
    'system architect',
  ],
  1101: [
    'manual tester',
    'manual qa',
    'software tester',
    'quality assurance',
    'qa engineer',
    'kiểm thử phần mềm',
    'nhân viên kiểm thử',
  ],
  1102: [
    'automation tester',
    'automation qa',
    'qa automation',
    'test automation',
    'sdet',
    'quality engineer',
    'kiểm thử tự động',
  ],
  1201: [
    'data analyst',
    'business intelligence',
    'bi developer',
    'bi analyst',
    'analytics engineer',
    'phân tích dữ liệu',
    'chuyên viên dữ liệu',
  ],
  1202: [
    'data engineer',
    'etl developer',
    'big data engineer',
    'data platform engineer',
    'kỹ sư dữ liệu',
  ],
  1203: ['data scientist', 'decision scientist', 'applied scientist'],
  1204: [
    'machine learning engineer',
    'ml engineer',
    'ai engineer',
    'ai developer',
    'nlp engineer',
    'computer vision engineer',
  ],
  1301: [
    'devops engineer',
    'cloud engineer',
    'site reliability engineer',
    'sre',
    'platform engineer',
    'cloud architect',
  ],
  1302: [
    'network engineer',
    'system engineer',
    'system administrator',
    'sysadmin',
    'network administrator',
    'infrastructure engineer',
    'quản trị hệ thống',
    'quản trị mạng',
    'kỹ sư mạng',
  ],
  1303: [
    'database administrator',
    'dba',
    'database engineer',
    'quản trị cơ sở dữ liệu',
  ],
  1304: [
    'it support',
    'technical support',
    'helpdesk',
    'service desk',
    'desktop support',
    'hỗ trợ công nghệ thông tin',
    'nhân viên it',
  ],
  1401: [
    'security engineer',
    'security analyst',
    'cybersecurity',
    'information security',
    'soc analyst',
    'penetration tester',
    'pentester',
  ],
  1501: [
    'embedded engineer',
    'embedded developer',
    'firmware engineer',
    'iot engineer',
    'embedded systems',
  ],
  1502: [
    'rpa developer',
    'rpa engineer',
    'software automation engineer',
    'workflow automation',
  ],
  1601: [
    'business analyst',
    'business analysis',
    'it business analyst',
    'system analyst',
    'product analyst',
    'phân tích nghiệp vụ',
    'chuyên viên ba',
  ],
  1602: [
    'product manager',
    'product owner',
    'associate product manager',
    'quản lý sản phẩm số',
  ],
  1603: [
    'it project manager',
    'technical project manager',
    'scrum master',
    'delivery manager',
    'program manager',
    'project coordinator',
    'quản lý dự án cntt',
    'quản lý dự án công nghệ thông tin',
  ],
  1701: [
    'ui designer',
    'ux designer',
    'ui/ux designer',
    'product designer',
    'ux researcher',
    'interaction designer',
  ],
  1801: [
    'game developer',
    'game programmer',
    'unity developer',
    'unreal developer',
  ],
};

/**
 * Verified fixed category pages used by the periodic crawler. A missing row is
 * intentional: that source is skipped when it has no category page equivalent
 * to the canonical Seev category. Broad pages are not forced into narrower
 * categories.
 */
export const sourceCategoryPages = [
  // TopCV: root 257 (IT) -> branch -> exact leaf.
  [
    1001,
    'topcv',
    '272',
    'Backend Developer',
    'https://www.topcv.vn/tim-viec-lam-backend-developer-cr257cb258cl272?type_keyword=1&sba=1&category_family=r257~b258l272',
  ],
  [
    1002,
    'topcv',
    '273',
    'Frontend Developer',
    'https://www.topcv.vn/tim-viec-lam-frontend-developer-cr257cb258cl273?type_keyword=1&sba=1&category_family=r257~b258l273',
  ],
  [
    1003,
    'topcv',
    '275',
    'Fullstack Developer',
    'https://www.topcv.vn/tim-viec-lam-fullstack-developer-cr257cb258cl275?type_keyword=1&sba=1&category_family=r257~b258l275',
  ],
  [
    1004,
    'topcv',
    '274',
    'Mobile Developer',
    'https://www.topcv.vn/tim-viec-lam-mobile-developer-cr257cb258cl274?type_keyword=1&sba=1&category_family=r257~b258l274',
  ],
  [
    1006,
    'topcv',
    '308',
    'Software Architect',
    'https://www.topcv.vn/tim-viec-lam-software-architect-cr257cb266cl308?type_keyword=1&sba=1&category_family=r257~b266l308',
  ],
  [
    1006,
    'topcv',
    '310',
    'Solution Architect',
    'https://www.topcv.vn/tim-viec-lam-solution-architect-cr257cb266cl310?type_keyword=1&sba=1&category_family=r257~b266l310',
  ],
  [
    1101,
    'topcv',
    '279',
    'Manual Tester',
    'https://www.topcv.vn/tim-viec-lam-manual-tester-cr257cb259cl279?type_keyword=1&sba=1&category_family=r257~b259l279',
  ],
  [
    1102,
    'topcv',
    '278',
    'Automation Tester',
    'https://www.topcv.vn/tim-viec-lam-automation-tester-cr257cb259cl278?type_keyword=1&sba=1&category_family=r257~b259l278',
  ],
  [
    1201,
    'topcv',
    '145',
    'Data Analyst',
    'https://www.topcv.vn/tim-viec-lam-data-analyst-cr257cb261cl145?type_keyword=1&sba=1&category_family=r257~b261l145',
  ],
  [
    1202,
    'topcv',
    '285',
    'Data Engineer',
    'https://www.topcv.vn/tim-viec-lam-data-engineer-cr257cb261cl285?type_keyword=1&sba=1&category_family=r257~b261l285',
  ],
  [
    1203,
    'topcv',
    '286',
    'Data Scientist',
    'https://www.topcv.vn/tim-viec-lam-data-scientist-cr257cb261cl286?type_keyword=1&sba=1&category_family=r257~b261l286',
  ],
  [
    1204,
    'topcv',
    '283',
    'AI Engineer',
    'https://www.topcv.vn/tim-viec-lam-ai-engineer-cr257cb260cl283?type_keyword=1&sba=1&category_family=r257~b260l283',
  ],
  [
    1301,
    'topcv',
    '288',
    'DevOps',
    'https://www.topcv.vn/tim-viec-lam-devops-cr257cb262cl288?type_keyword=1&sba=1&category_family=r257~b262l288',
  ],
  [
    1301,
    'topcv',
    '293',
    'Cloud Engineer',
    'https://www.topcv.vn/tim-viec-lam-cloud-engineer-cr257cb262cl293?type_keyword=1&sba=1&category_family=r257~b262l293',
  ],
  [
    1302,
    'topcv',
    '289',
    'Network Engineer',
    'https://www.topcv.vn/tim-viec-lam-network-engineer-cr257cb262cl289?type_keyword=1&sba=1&category_family=r257~b262l289',
  ],
  [
    1302,
    'topcv',
    '290',
    'System Engineer',
    'https://www.topcv.vn/tim-viec-lam-system-engineer-cr257cb262cl290?type_keyword=1&sba=1&category_family=r257~b262l290',
  ],
  [
    1302,
    'topcv',
    '291',
    'System Administrator',
    'https://www.topcv.vn/tim-viec-lam-system-administrator-cr257cb262cl291?type_keyword=1&sba=1&category_family=r257~b262l291',
  ],
  [
    1303,
    'topcv',
    '292',
    'Database Administrator',
    'https://www.topcv.vn/tim-viec-lam-database-administrator-cr257cb262cl292?type_keyword=1&sba=1&category_family=r257~b262l292',
  ],
  [
    1304,
    'topcv',
    '287',
    'IT Helpdesk',
    'https://www.topcv.vn/tim-viec-lam-it-helpdesk-cr257cb262cl287?type_keyword=1&sba=1&category_family=r257~b262l287',
  ],
  [
    1401,
    'topcv',
    '294',
    'Chuyên viên Cyber Security',
    'https://www.topcv.vn/tim-viec-lam-chuyen-vien-cyber-security-cr257cb263cl294?type_keyword=1&sba=1&category_family=r257~b263l294',
  ],
  [
    1401,
    'topcv',
    '295',
    'Chuyên viên IT Security',
    'https://www.topcv.vn/tim-viec-lam-chuyen-vien-it-security-cr257cb263cl295?type_keyword=1&sba=1&category_family=r257~b263l295',
  ],
  [
    1501,
    'topcv',
    '303',
    'IoT Engineer',
    'https://www.topcv.vn/tim-viec-lam-iot-engineer-cr257cb264cl303?type_keyword=1&sba=1&category_family=r257~b264l303',
  ],
  [
    1501,
    'topcv',
    '304',
    'Embedded Engineer',
    'https://www.topcv.vn/tim-viec-lam-embedded-engineer-cr257cb264cl304?type_keyword=1&sba=1&category_family=r257~b264l304',
  ],
  [
    1601,
    'topcv',
    '322',
    'Business Analyst',
    'https://www.topcv.vn/tim-viec-lam-business-analyst-cr257cb268cl322?type_keyword=1&sba=1&category_family=r257~b268l322',
  ],
  [
    1602,
    'topcv',
    '321',
    'Product Manager/Product Owner',
    'https://www.topcv.vn/tim-viec-lam-product-manager-product-owner-cr257cb268cl321?type_keyword=1&sba=1&category_family=r257~b268l321',
  ],
  [
    1603,
    'topcv',
    '305',
    'IT Project Manager',
    'https://www.topcv.vn/tim-viec-lam-it-project-manager-cr257cb265cl305?type_keyword=1&sba=1&category_family=r257~b265l305',
  ],
  [
    1603,
    'topcv',
    '306',
    'Scrum Master',
    'https://www.topcv.vn/tim-viec-lam-scrum-master-cr257cb265cl306?type_keyword=1&sba=1&category_family=r257~b265l306',
  ],
  [
    1701,
    'topcv',
    '317',
    'UI/UX Designer',
    'https://www.topcv.vn/tim-viec-lam-ui-ux-designer-cr257cb267cl317?type_keyword=1&sba=1&category_family=r257~b267l317',
  ],
  [
    1801,
    'topcv',
    '324',
    'Game Developer',
    'https://www.topcv.vn/tim-viec-lam-game-developer-cr257cb269cl324?type_keyword=1&sba=1&category_family=r257~b269l324',
  ],

  // ITViec has first-class expertise pages.
  [
    1001,
    'itviec',
    'backend-developer',
    'Backend Developer',
    'https://itviec.com/it-jobs/backend-developer',
  ],
  [
    1002,
    'itviec',
    'frontend-developer',
    'Frontend Developer',
    'https://itviec.com/it-jobs/frontend-developer',
  ],
  [
    1003,
    'itviec',
    'fullstack-developer',
    'Fullstack Developer',
    'https://itviec.com/it-jobs/fullstack-developer',
  ],
  [
    1004,
    'itviec',
    'mobile-application-developer',
    'Mobile Application Developer',
    'https://itviec.com/it-jobs/mobile-application-developer',
  ],
  [
    1005,
    'itviec',
    'desktop-application-developer',
    'Desktop Application Developer',
    'https://itviec.com/it-jobs/desktop-application-developer',
  ],
  [
    1006,
    'itviec',
    'software-technical-architect',
    'Software/Technical Architect',
    'https://itviec.com/it-jobs/software-technical-architect',
  ],
  [
    1101,
    'itviec',
    'manual-tester',
    'Manual Tester',
    'https://itviec.com/it-jobs/manual-tester',
  ],
  [
    1102,
    'itviec',
    'automation-tester',
    'Automation Tester',
    'https://itviec.com/it-jobs/automation-tester',
  ],
  [
    1201,
    'itviec',
    'data-analyst',
    'Data Analyst',
    'https://itviec.com/it-jobs/data-analyst',
  ],
  [
    1202,
    'itviec',
    'data-engineer',
    'Data Engineer',
    'https://itviec.com/it-jobs/data-engineer',
  ],
  [
    1203,
    'itviec',
    'data-scientist',
    'Data Scientist',
    'https://itviec.com/it-jobs/data-scientist',
  ],
  [
    1204,
    'itviec',
    'ai-machine-learning-engineer',
    'AI / Machine Learning Engineer',
    'https://itviec.com/it-jobs/ai-machine-learning-engineer',
  ],
  [
    1301,
    'itviec',
    'devops-engineer',
    'DevOps Engineer',
    'https://itviec.com/it-jobs/devops-engineer',
  ],
  [
    1302,
    'itviec',
    'systems-engineer-administrator',
    'Systems Engineer / Administrator',
    'https://itviec.com/it-jobs/systems-engineer-administrator',
  ],
  [
    1303,
    'itviec',
    'database-administrator',
    'Database Administrator',
    'https://itviec.com/it-jobs/database-administrator',
  ],
  [
    1304,
    'itviec',
    'it-helpdesk',
    'IT Helpdesk',
    'https://itviec.com/it-jobs/it-helpdesk',
  ],
  [
    1401,
    'itviec',
    'security-engineer',
    'Security Engineer',
    'https://itviec.com/it-jobs/security-engineer',
  ],
  [
    1501,
    'itviec',
    'embedded-engineer',
    'Embedded Engineer',
    'https://itviec.com/it-jobs/embedded-engineer',
  ],
  [
    1502,
    'itviec',
    'rpa-engineer',
    'RPA Engineer',
    'https://itviec.com/it-jobs/rpa-engineer',
  ],
  [
    1601,
    'itviec',
    'business-analyst',
    'Business Analyst',
    'https://itviec.com/it-jobs/business-analyst',
  ],
  [
    1602,
    'itviec',
    'product-manager',
    'Product Manager',
    'https://itviec.com/it-jobs/product-manager',
  ],
  [
    1603,
    'itviec',
    'project-manager',
    'Project Manager',
    'https://itviec.com/it-jobs/project-manager',
  ],
  [
    1701,
    'itviec',
    'product-designer',
    'Product Designer',
    'https://itviec.com/it-jobs/product-designer',
  ],
  [
    1801,
    'itviec',
    'game-developer',
    'Game Developer',
    'https://itviec.com/it-jobs/game-developer',
  ],

  // VietnamWorks only where its child function is equivalent, not merely adjacent.
  [
    1001,
    'vietnamworks',
    '36',
    'Software Developer',
    'https://www.vietnamworks.com/viec-lam?g=5&j=36',
  ],
  [
    1002,
    'vietnamworks',
    '36',
    'Software Developer',
    'https://www.vietnamworks.com/viec-lam?g=5&j=36',
  ],
  [
    1003,
    'vietnamworks',
    '36',
    'Software Developer',
    'https://www.vietnamworks.com/viec-lam?g=5&j=36',
  ],
  [
    1004,
    'vietnamworks',
    '36',
    'Software Developer',
    'https://www.vietnamworks.com/viec-lam?g=5&j=36',
  ],
  [
    1005,
    'vietnamworks',
    '36',
    'Software Developer',
    'https://www.vietnamworks.com/viec-lam?g=5&j=36',
  ],
  [
    1101,
    'vietnamworks',
    '34',
    'QA/QC/Software Testing',
    'https://www.vietnamworks.com/viec-lam?g=5&j=34',
  ],
  [
    1102,
    'vietnamworks',
    '34',
    'QA/QC/Software Testing',
    'https://www.vietnamworks.com/viec-lam?g=5&j=34',
  ],
  [
    1201,
    'vietnamworks',
    '27',
    'Data Engineer/Data Analyst/AI',
    'https://www.vietnamworks.com/viec-lam?g=5&j=27',
  ],
  [
    1202,
    'vietnamworks',
    '27',
    'Data Engineer/Data Analyst/AI',
    'https://www.vietnamworks.com/viec-lam?g=5&j=27',
  ],
  [
    1203,
    'vietnamworks',
    '27',
    'Data Engineer/Data Analyst/AI',
    'https://www.vietnamworks.com/viec-lam?g=5&j=27',
  ],
  [
    1204,
    'vietnamworks',
    '27',
    'Data Engineer/Data Analyst/AI',
    'https://www.vietnamworks.com/viec-lam?g=5&j=27',
  ],
  [
    1301,
    'vietnamworks',
    '32',
    'System/Cloud/DevOps Engineer',
    'https://www.vietnamworks.com/viec-lam?g=5&j=32',
  ],
  [
    1302,
    'vietnamworks',
    '32',
    'System/Cloud/DevOps Engineer',
    'https://www.vietnamworks.com/viec-lam?g=5&j=32',
  ],
  [
    1303,
    'vietnamworks',
    '26',
    'Database Administration',
    'https://www.vietnamworks.com/viec-lam?g=5&j=26',
  ],
  [
    1304,
    'vietnamworks',
    '31',
    'IT Support/Help Desk',
    'https://www.vietnamworks.com/viec-lam?g=5&j=31',
  ],
  [
    1401,
    'vietnamworks',
    '35',
    'Security',
    'https://www.vietnamworks.com/viec-lam?g=5&j=35',
  ],
  [
    1601,
    'vietnamworks',
    '25',
    'Business Analysis/System Analysis',
    'https://www.vietnamworks.com/viec-lam?g=5&j=25',
  ],
  [
    1602,
    'vietnamworks',
    '33',
    'IT Product/Project Management',
    'https://www.vietnamworks.com/viec-lam?g=5&j=33',
  ],
  [
    1603,
    'vietnamworks',
    '33',
    'IT Product/Project Management',
    'https://www.vietnamworks.com/viec-lam?g=5&j=33',
  ],
  [
    1701,
    'vietnamworks',
    '38',
    'UX/UI Design',
    'https://www.vietnamworks.com/viec-lam?g=5&j=38',
  ],
] as const;

export const seniorityLevels = [
  [
    '00000000-0000-4000-8000-000000000001',
    'intern',
    'entry',
    'Intern / Thực tập sinh',
    10,
    10,
    0,
    1,
  ],
  [
    '00000000-0000-4000-8000-000000000002',
    'fresher',
    'entry',
    'Fresher / Mới tốt nghiệp',
    20,
    20,
    0,
    1,
  ],
  [
    '00000000-0000-4000-8000-000000000003',
    'junior',
    'ic',
    'Junior',
    30,
    10,
    0,
    3,
  ],
  [
    '00000000-0000-4000-8000-000000000004',
    'middle',
    'ic',
    'Middle / Mid-level',
    40,
    20,
    2,
    5,
  ],
  [
    '00000000-0000-4000-8000-000000000005',
    'senior',
    'ic',
    'Senior',
    50,
    30,
    4,
    null,
  ],
  [
    '00000000-0000-4000-8000-000000000006',
    'staff',
    'senior_ic',
    'Staff Engineer / Chuyên gia',
    60,
    10,
    6,
    null,
  ],
  [
    '00000000-0000-4000-8000-000000000007',
    'principal',
    'senior_ic',
    'Principal Engineer / Chuyên gia cao cấp',
    70,
    20,
    8,
    null,
  ],
  [
    '00000000-0000-4000-8000-000000000008',
    'tech_lead',
    'technical_leadership',
    'Tech Lead / Trưởng nhóm kỹ thuật',
    80,
    10,
    5,
    null,
  ],
  [
    '00000000-0000-4000-8000-000000000009',
    'manager',
    'people_management',
    'Engineering Manager / Quản lý',
    90,
    10,
    5,
    null,
  ],
  [
    '00000000-0000-4000-8000-000000000010',
    'head_director',
    'people_management',
    'Head / Director',
    100,
    20,
    8,
    null,
  ],
] as const;

export const allSeniorityCodes = seniorityLevels.map((level) => level[1]);

const technicalLevels = [...allSeniorityCodes];
const operationalLevels = [
  'intern',
  'fresher',
  'junior',
  'middle',
  'senior',
  'tech_lead',
  'manager',
  'head_director',
] as const;
const managementLevels = [
  'intern',
  'fresher',
  'junior',
  'middle',
  'senior',
  'manager',
  'head_director',
] as const;

/** Cấp bậc có ý nghĩa thực tế đối với từng nhánh nghề, dùng chung cho UI và matching. */
export const allowedSeniorityByCategory: Record<number, readonly string[]> = {
  1001: technicalLevels,
  1002: technicalLevels,
  1003: technicalLevels,
  1004: technicalLevels,
  1005: technicalLevels,
  1006: [
    'middle',
    'senior',
    'staff',
    'principal',
    'tech_lead',
    'manager',
    'head_director',
  ],
  1101: operationalLevels,
  1102: technicalLevels,
  1201: technicalLevels,
  1202: technicalLevels,
  1203: technicalLevels,
  1204: technicalLevels,
  1301: technicalLevels,
  1302: technicalLevels,
  1303: [
    'fresher',
    'junior',
    'middle',
    'senior',
    'staff',
    'principal',
    'tech_lead',
    'manager',
    'head_director',
  ],
  1304: operationalLevels,
  1401: technicalLevels,
  1501: technicalLevels,
  1502: operationalLevels,
  1601: operationalLevels,
  1602: managementLevels,
  1603: managementLevels,
  1701: technicalLevels,
  1801: technicalLevels,
};

const crossCategoryAdjacency = new Set(
  [
    [1001, 1202], // Backend <-> Data Engineering
    [1001, 1301], // Backend <-> DevOps/Platform
    [1001, 1006], // Backend <-> Architecture
    [1002, 1701], // Frontend <-> Product Design
    [1003, 1006], // Full-stack <-> Architecture
    [1102, 1001], // SDET <-> Backend
    [1102, 1301], // SDET <-> DevOps
    [1201, 1601], // Data Analyst <-> Business Analysis
    [1202, 1301], // Data Engineering <-> Platform
    [1203, 1204], // Data Science <-> AI/ML
    [1301, 1302], // DevOps <-> System/Network
    [1301, 1401], // DevSecOps bridge
    [1302, 1401], // Network <-> Cybersecurity
    [1501, 1005], // Embedded <-> Desktop/C++ applications
    [1502, 1601], // RPA <-> Business Analysis
    [1601, 1602], // BA <-> Product
    [1602, 1701], // Product <-> Product Design
    [1602, 1603], // Product <-> Delivery
  ].flatMap(([a, b]) => [`${a}:${b}`, `${b}:${a}`]),
);

const seniorityAdjacentPairs = new Set(
  [
    ['senior', 'tech_lead'],
    ['staff', 'tech_lead'],
    ['tech_lead', 'manager'],
    ['manager', 'head_director'],
  ].flatMap(([a, b]) => [`${a}:${b}`, `${b}:${a}`]),
);

const seniorityStretchPairs = new Set(
  [
    ['senior', 'manager'],
    ['staff', 'manager'],
    ['principal', 'tech_lead'],
    ['principal', 'head_director'],
    ['tech_lead', 'head_director'],
  ].flatMap(([a, b]) => [`${a}:${b}`, `${b}:${a}`]),
);

type Query = (sql: string, params?: unknown[]) => Promise<unknown>;

/** Seed duy nhất cho taxonomy CNTT canonical của Seev.
 *
 * File này không chứa category ngoài CNTT và không dùng ID native của website
 * làm canonical ID. Có thể chạy lại an toàn sau migrations trên một DB mới.
 */
export async function seedItTaxonomy(query: Query) {
  await query(`DELETE FROM "category_relations"`);
  await query(`DELETE FROM "seniority_compatibility"`);
  await query(`DELETE FROM "category_seniority_levels"`);
  await query(`DELETE FROM "source_category_mappings"`);
  await query(`DELETE FROM "job_category_aliases"`);

  for (const [code, name, displayOrder] of categoryGroups) {
    await query(
      `INSERT INTO "job_category_groups" ("code", "name", "display_order")
       VALUES ($1, $2, $3)
       ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "display_order" = EXCLUDED."display_order", "is_active" = true`,
      [code, name, displayOrder],
    );
  }
  for (const [id, code, name, groupCode, displayOrder] of categories) {
    await query(
      `INSERT INTO "job_categories" ("id", "code", "name", "group_code", "display_order")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ("id") DO UPDATE SET "code" = EXCLUDED."code", "name" = EXCLUDED."name", "group_code" = EXCLUDED."group_code", "display_order" = EXCLUDED."display_order", "is_active" = true, "updated_at" = now()`,
      [id, code, name, groupCode, displayOrder],
    );
    for (const alias of aliases[categoryOrdinal(id)] ?? []) {
      await query(
        `INSERT INTO "job_category_aliases" ("category_id", "alias", "normalized_alias") VALUES ($1, $2, $3)`,
        [id, alias, normalize(alias)],
      );
    }
  }

  for (const [
    ordinal,
    source,
    externalKey,
    externalName,
    crawlUrl,
  ] of sourceCategoryPages) {
    await query(
      `INSERT INTO "source_category_mappings" ("source", "external_key", "external_name", "category_id", "crawl_url", "filter_payload")
       VALUES ($1, $2, $3::varchar, $4, $5, jsonb_build_object('expected_label', $3::varchar))`,
      [source, externalKey, externalName, categoryUuid(ordinal), crawlUrl],
    );
  }

  for (const [
    id,
    code,
    track,
    displayName,
    displayOrder,
    rankInTrack,
    expMin,
    expMax,
  ] of seniorityLevels) {
    await query(
      `INSERT INTO "seniority_levels" ("id", "code", "track", "name", "display_name", "description", "display_order", "rank_in_track", "experience_min", "experience_max")
       VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9)
       ON CONFLICT ("code") DO UPDATE SET "track" = EXCLUDED."track", "name" = EXCLUDED."name", "display_name" = EXCLUDED."display_name", "description" = EXCLUDED."description", "display_order" = EXCLUDED."display_order", "rank_in_track" = EXCLUDED."rank_in_track", "experience_min" = EXCLUDED."experience_min", "experience_max" = EXCLUDED."experience_max", "is_active" = true, "updated_at" = now()`,
      [
        id,
        code,
        track,
        displayName,
        `Cấp bậc CNTT: ${displayName}.`,
        displayOrder,
        rankInTrack,
        expMin,
        expMax,
      ],
    );
  }

  for (const [categoryId] of categories) {
    const allowed = allowedSeniorityByCategory[categoryOrdinal(categoryId)];
    if (!allowed) {
      throw new Error(`Thiếu cấu hình seniority cho category ${categoryId}`);
    }
    for (const code of allowed) {
      await query(
        `INSERT INTO "category_seniority_levels" ("category_id", "seniority_code") VALUES ($1, $2)`,
        [categoryId, code],
      );
    }
  }

  for (const [fromId, , , fromGroup] of categories) {
    for (const [toId, , , toGroup] of categories) {
      const relation =
        fromId === toId
          ? 'exact'
          : fromGroup === toGroup ||
              crossCategoryAdjacency.has(
                `${categoryOrdinal(fromId)}:${categoryOrdinal(toId)}`,
              )
            ? 'adjacent'
            : 'unrelated';
      await query(
        `INSERT INTO "category_relations" ("from_category_id", "to_category_id", "relation", "score_penalty") VALUES ($1, $2, $3, $4)`,
        [
          fromId,
          toId,
          relation,
          relation === 'exact' ? 0 : relation === 'adjacent' ? 18 : 100,
        ],
      );
    }
  }

  const orderedCodes = [
    'intern',
    'fresher',
    'junior',
    'middle',
    'senior',
    'staff',
    'principal',
  ];
  for (const candidate of allSeniorityCodes) {
    for (const job of allSeniorityCodes) {
      const candidateIndex = orderedCodes.indexOf(candidate);
      const jobIndex = orderedCodes.indexOf(job);
      const exact = candidate === job;
      const adjacent =
        candidateIndex >= 0 &&
        jobIndex >= 0 &&
        Math.abs(candidateIndex - jobIndex) === 1;
      const pair = `${candidate}:${job}`;
      const relation = exact
        ? 'exact'
        : adjacent || seniorityAdjacentPairs.has(pair)
          ? 'adjacent'
          : seniorityStretchPairs.has(pair)
            ? 'stretch'
            : 'incompatible';
      await query(
        `INSERT INTO "seniority_compatibility" ("candidate_code", "job_code", "relation", "score_penalty") VALUES ($1, $2, $3, $4)`,
        [
          candidate,
          job,
          relation,
          relation === 'exact'
            ? 0
            : relation === 'adjacent'
              ? 15
              : relation === 'stretch'
                ? 30
                : 100,
        ],
      );
    }
  }
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .trim();
}

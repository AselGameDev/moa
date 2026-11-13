import { Department, Project, SiteContent, SiteSettings } from '../types';

export const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'dept-law',
    name: 'Law and Justice',
    shortName: 'Law',
    slug: 'law-and-justice',
    iconGlyph: 'law',
    colorHex: '#EDE9E0',
    iconBgHex: '#0D3836',
    introduction: '',
    purpose: '',
    mission: '',
    areasOfFocus: [],
    initiatives: [],
    galleryImages: [],
    published: true,
    showInTree: true,
    displayOrder: 1
  },
  {
    id: 'dept-history',
    name: 'History and Culture',
    shortName: 'History',
    slug: 'history-and-culture',
    iconGlyph: 'history',
    colorHex: '#D0A873',
    iconBgHex: '#302213',
    introduction: '',
    purpose: '',
    mission: '',
    areasOfFocus: [],
    initiatives: [],
    galleryImages: [],
    published: true,
    showInTree: true,
    displayOrder: 2
  },
  {
    id: 'dept-technology',
    name: 'Technology',
    shortName: 'Technology',
    slug: 'technology',
    iconGlyph: 'tech',
    colorHex: '#25CDB6',
    iconBgHex: '#06302F',
    introduction: '',
    purpose: '',
    mission: '',
    areasOfFocus: [],
    initiatives: [],
    galleryImages: [],
    published: true,
    showInTree: true,
    displayOrder: 3
  },
  {
    id: 'dept-science',
    name: 'Science and Engineering',
    shortName: 'Science',
    slug: 'science-and-engineering',
    iconGlyph: 'science',
    colorHex: '#6B8AFF',
    iconBgHex: '#101B36',
    introduction: '',
    purpose: '',
    mission: '',
    areasOfFocus: [],
    initiatives: [],
    galleryImages: [],
    published: true,
    showInTree: true,
    displayOrder: 4
  },
  {
    id: 'dept-mathematics',
    name: 'Mathematics',
    shortName: 'Mathematics',
    slug: 'mathematics',
    iconGlyph: 'math',
    colorHex: '#CA7952',
    iconBgHex: '#361D12',
    introduction: '',
    purpose: '',
    mission: '',
    areasOfFocus: [],
    initiatives: [],
    galleryImages: [],
    published: true,
    showInTree: true,
    displayOrder: 5
  },
  {
    id: 'dept-news',
    name: 'News, Journalism and Media',
    shortName: 'Media',
    slug: 'news-journalism-and-media',
    iconGlyph: 'media',
    colorHex: '#64B5D9',
    iconBgHex: '#122633',
    introduction: '',
    purpose: '',
    mission: '',
    areasOfFocus: [],
    initiatives: [],
    galleryImages: [],
    published: true,
    showInTree: true,
    displayOrder: 6
  },
  {
    id: 'dept-freedom',
    name: 'Freedom Unit',
    shortName: 'Freedom',
    slug: 'freedom-unit',
    iconGlyph: 'freedom',
    colorHex: '#FFFFFF',
    iconBgHex: '#C83C3C',
    introduction: '',
    purpose: '',
    mission: '',
    areasOfFocus: [],
    initiatives: [],
    galleryImages: [],
    published: true,
    showInTree: true,
    displayOrder: 7
  },
  {
    id: 'dept-entrepreneurship',
    name: 'Entrepreneurship',
    shortName: 'Entrepreneurship',
    slug: 'entrepreneurship',
    iconGlyph: 'entrepreneurship',
    colorHex: '#17A491',
    iconBgHex: '#08302A',
    introduction: '',
    purpose: '',
    mission: '',
    areasOfFocus: [],
    initiatives: [],
    galleryImages: [],
    published: true,
    showInTree: true,
    displayOrder: 8
  }
];

// Initial projects collection
export const INITIAL_PROJECTS: Project[] = [];

export const INITIAL_SITE_CONTENT: SiteContent = {
  home: {
    heroHeadlineLine1: 'Understanding the world.',
    heroHeadlineLine2: 'Building what comes next.',
    heroSubheadline: "We’re Masters Of All, a multidisciplinary innovation organization. We ask questions, chase the answers, and turn what we learn into things that help people.",
    believeWord: 'Believe',
    believeText: 'Unwavering conviction in human capability, moral responsibility, and the pursuit of foundational truth.',
    buildWord: 'Build',
    buildText: 'Engineering practical mechanisms, rigorous research frameworks, and transformative technologies.',
    becomeWord: 'Become',
    becomeText: 'Transforming potential into self-governing sovereignty, wisdom, and enduring societal impact.',
    exploreTitle: 'EXPLORE',
    exploreText: 'Curiosity, research, discovery, questioning and understanding.',
    createTitle: 'CREATE',
    createText: 'Experimentation, innovation, engineering, creativity and implementation.',
    transformTitle: 'TRANSFORM',
    transformText: 'Meaningful impact, progress, practical solutions and empowerment.',
    questionStatement: 'Every meaningful solution begins with a question.'
  },
  about: {
    heroTitle: 'We explore questions to build solutions that matter.',
    heroSub: 'At Masters Of All, every initiative begins with curiosity and ends with practical, lasting impact.',
    whoWeAre: 'Masters Of All (MoA) is a multidisciplinary innovation organization dedicated to understanding the world, solving real-world problems, and transforming ideas into meaningful impact.',
    whatWeDo: 'Our work spans research and development, engineering, technology, education, media, storytelling, entrepreneurship, community development, and youth empowerment. From designing innovative systems and developing practical solutions to producing educational documentaries, organizing impactful events, and making complex concepts accessible, every initiative is driven by a single purpose: to empower people and improve the world around us.',
    howWeThink: 'We believe that every meaningful solution begins with a question. Through exploration, critical thinking, and evidence-based research, we uncover the truth behind ideas, systems, and challenges, transforming insight into practical solutions that create lasting value. At MoA, learning is more than the acquisition of knowledge—it is the foundation of innovation. We cultivate curiosity, encourage interdisciplinary collaboration, and embrace experimentation to bridge the gap between imagination and implementation.',
    ourPhilosophy: 'More than an organization, Masters Of All is an ecosystem for explorers, creators, innovators, and problem-solvers. We strive to unlock human potential, foster meaningful progress, and build a future where knowledge inspires action, innovation creates opportunity, and every challenge becomes the beginning of a solution.',
    founderStatement: 'If people are given the right tools, knowledge, and support early enough, most problems don’t need to exist.',
    founderAttribution: 'Founder, Masters Of All',
    endingLineTemplate: '{departmentCount} departments. One research division.'
  },
  departments: {
    rddIntro: 'RDD, Research, Discovery and Development, is a sub-organization of Masters Of All. It oversees the {departmentCount} departments below.'
  },
  contact: {
    heading: 'Got a question? That’s how we start.',
    subtext: 'Write to us or find us online. We’d love to hear from you.'
  },
  footer: {
    blurb: 'An ecosystem for explorers, creators, innovators and problem-solvers.'
  }
};

export const INITIAL_SETTINGS: SiteSettings = {
  siteName: 'Masters Of All',
  tagline: 'Believe. Build. Become.',
  moaLogoUrl: '/drawing1.png',
  loaderLogoUrl: '/drawing1.png',
  rddLogoUrl: '/5320.jpg',
  faviconUrl: '/drawing1.png',
  shareImageUrl: '/drawing1.png',
  contactEmail: 'business@mastersofall.org',
  footerText: 'An ecosystem for explorers, creators, innovators and problem-solvers.',
  socialLinks: [
    { id: 'soc-li', platform: 'LinkedIn', icon: 'linkedin', url: 'https://www.linkedin.com/company/mastersofall/' },
    { id: 'soc-yt', platform: 'YouTube', icon: 'youtube', url: 'https://www.youtube.com/@Masters_Of_All' },
    { id: 'soc-ig', platform: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/mastersofall_official/' },
    { id: 'soc-fb', platform: 'Facebook', icon: 'facebook', url: 'https://www.facebook.com/mastersofallofficial' },
    { id: 'soc-pat', platform: 'Patreon', icon: 'patreon', url: 'https://www.patreon.com/cw/MastersOfAll' },
    { id: 'soc-wa', platform: 'WhatsApp', icon: 'whatsapp', url: 'https://whatsapp.com/channel/0029Vb8gxyN8fewhOqTsK60e' }
  ],
  seoDefaults: {
    title: 'Masters Of All — Believe. Build. Become.',
    description: 'An ecosystem for multidisciplinary research, applied development, and innovation across core disciplines.',
    keywords: 'Masters Of All, MoA, multidisciplinary research, innovation, RDD'
  },
  notFoundText: 'The page or resource you are looking for does not exist or has been relocated.',
  maintenanceMode: false,
  redirects: [],
  projectStatuses: ['Concept', 'In Development', 'Active', 'Completed', 'On Hold'],
  projectCategories: ['Research', 'Open Source', 'Architecture', 'Fellowship', 'Publication'],
  theme: {
    primaryColor: '#17A491',
    secondaryColor: '#25CDB6',
    copperColor: '#D0A873',
    radius: 'xl',
    buttonStyle: 'rounded',
    density: 'comfortable',
    preset: 'brand-deep'
  },
  navigation: [
    { id: 'nav-home', label: 'Home', path: '/' },
    { id: 'nav-about', label: 'About', path: '/about' },
    { id: 'nav-departments', label: 'Departments', path: '/departments' },
    { id: 'nav-projects', label: 'Projects', path: '/projects' },
    { id: 'nav-contact', label: 'Contact', path: '/contact' }
  ],
  footerColumns: [],
  securityPolicy: {
    minPasswordLength: 8,
    requireUppercase: true,
    requireNumber: true,
    requireSymbol: true,
    sessionTimeoutMinutes: 60,
    enforce2FAForAdmins: false,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15
  }
};

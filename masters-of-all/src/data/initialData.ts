import { Department, Project, Publication, Product, SiteContent, SiteSettings } from '../types';

export const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'dept-law',
    name: 'Law and Justice',
    shortName: 'Law',
    slug: 'law-and-justice',
    iconGlyph: 'law',
    colorHex: '#06302F',
    iconBgHex: '#FFFFFF',
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
    colorHex: '#06302F',
    iconBgHex: '#D0A873',
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
    iconBgHex: '#0A3D3C',
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
    colorHex: '#DCE3FF',
    iconBgHex: '#2A335E',
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
    colorHex: '#06302F',
    iconBgHex: '#FFFFFF',
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
    shortName: 'News',
    slug: 'news-journalism-and-media',
    iconGlyph: 'media',
    colorHex: '#06212D',
    iconBgHex: '#5E8DA0',
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
    iconBgHex: '#A32B2B',
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
    iconBgHex: '#EBF5F1',
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

export const INITIAL_PROJECTS: Project[] = [];
export const INITIAL_PUBLICATIONS: Publication[] = [];
export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_SITE_CONTENT: SiteContent = {
  home: {
    heroHeadlineLine1: 'Understanding the world.',
    heroHeadlineLine2: 'Building what comes next.',
    heroSubheadline:
      "We’re Masters Of All, a multidisciplinary innovation organization. We ask questions, chase the answers, and turn what we learn into things that help people.",
    primaryCtaLabel: 'Meet the departments',
    secondaryCtaLabel: 'See our work',
    methodologyEyebrow: 'THE METHODOLOGY',
    methodologyHeading: 'Three Dimensions of Action',
    methodologySubheading: 'Hover to expand each pillar of our operating model.',
    exploreTitle: 'EXPLORE',
    exploreText: 'Curiosity, research, discovery, questioning and understanding.',
    exploreSubtext: 'The foundation of all knowledge begins with fearless enquiry.',
    createTitle: 'CREATE',
    createText: 'Experimentation, innovation, engineering, creativity and implementation.',
    createSubtext: 'Turning theoretical discovery into tangible structures and tools.',
    transformTitle: 'TRANSFORM',
    transformText: 'Meaningful impact, progress, practical solutions and empowerment.',
    transformSubtext: 'Delivering real change that elevates human capability and society.',
    believeWord: 'Believe',
    believeText: 'Unwavering conviction in human capability, moral responsibility, and the pursuit of foundational truth.',
    buildWord: 'Build',
    buildText: 'Engineering practical mechanisms, rigorous research frameworks, and transformative technologies.',
    becomeWord: 'Become',
    becomeText: 'Transforming potential into self-governing sovereignty, wisdom, and enduring societal impact.',
    questionStatement: 'Every meaningful solution begins with a question.',
    readStoryLabel: 'Read our story',
    bottomTaglineSubtext:
      'An ecosystem where questions are taken seriously, tools are engineered with precision, and human potential is unlocked.'
  },
  about: {
    heroTitle: 'We explore questions to build solutions that matter.',
    heroSub: 'At Masters Of All, every initiative begins with curiosity and ends with practical, lasting impact.',
    whoWeAreBadge: '01 · Origin & Identity',
    whoWeAreHeading: 'An ecosystem built for universal curiosity and applied rigor.',
    whoWeAre:
      'Masters Of All (MoA) is a multidisciplinary innovation organization dedicated to understanding the world, solving real-world problems, and transforming ideas into meaningful impact.',
    whoWeAreSecondary:
      'Rather than isolating sciences from humanities or theory from machinery, we serve as an ecosystem where researchers, technologists, creators, and scholars converge under one roof to pioneer transformative ideas across multiple disciplines.',
    whatWeDoBadge: '02 · Four Pillars of Action',
    whatWeDoHeading: 'What we do',
    whatWeDo:
      'Our work spans research and development, engineering, technology, education, media, storytelling, entrepreneurship, community development, and youth empowerment. From designing innovative systems and developing practical solutions to producing educational documentaries, organizing impactful events, and making complex concepts accessible, every initiative is driven by a single purpose: to empower people and improve the world around us.',
    deliverablesHeading: 'Core Outputs & Deliverables',
    whatWeDoCards: [
      {
        id: 'wwd-1',
        index: '01',
        title: 'Multidisciplinary Research',
        tagline: 'Foundational Truth & Inquiry',
        desc: 'Investigating core questions across disciplines to uncover foundational truths. We connect human history, scientific law, algorithmic reasoning, and social systems.',
        color: '#17A491',
        deliverables: ['Cross-Domain Inquiries', 'Empirical Syntheses', 'Open Whitepapers']
      },
      {
        id: 'wwd-2',
        index: '02',
        title: 'Applied Development',
        tagline: 'Engineering Concepts into Reality',
        desc: 'Translating rigorous conceptual discoveries into engineered prototypes, resilient software models, scientific instruments, and real-world tools.',
        color: '#25CDB6',
        deliverables: ['Functional Prototypes', 'Algorithmic Systems', 'Technical Frameworks']
      },
      {
        id: 'wwd-3',
        index: '03',
        title: 'Open Knowledge & Education',
        tagline: 'Cultivating Critical Capability',
        desc: 'Democratizing insights and providing frameworks that cultivate critical thinking, intellectual independence, and self-governing capability for everyone.',
        color: '#D0A873',
        deliverables: ['Interactive Frameworks', 'Critical Thinking Curricula', 'Media Publications']
      },
      {
        id: 'wwd-4',
        index: '04',
        title: 'Impact Initiatives',
        tagline: 'Accountable Real-World Solutions',
        desc: 'Building sustainable, ethical ventures that address societal challenges with accountability, technological rigor, and long-term community empowerment.',
        color: '#CA7952',
        deliverables: ['Community Toolkits', 'Youth Empowerment Labs', 'Venture Incubation']
      }
    ],
    howWeThinkBadge: '03 · The Inquiry Continuum',
    howWeThinkHeading: 'How we think',
    howWeThink:
      'We believe that every meaningful solution begins with a question. Through exploration, critical thinking, and evidence-based research, we uncover the truth behind ideas, systems, and challenges, transforming insight into practical solutions that create lasting value. At MoA, learning is more than the acquisition of knowledge—it is the foundation of innovation. We cultivate curiosity, encourage interdisciplinary collaboration, and embrace experimentation to bridge the gap between imagination and implementation.',
    thinkingSteps: [
      {
        step: 1,
        label: 'Question',
        subtitle: 'Fearless Inquiry',
        desc: 'Every breakthrough begins with fearless inquiry. We isolate root assumptions and reframe challenges to ask what others take for granted.',
        deepDive:
          'We refuse superficial symptoms. By questioning first principles, we define the exact problem boundary before writing a single line of code or drafting a plan.',
        color: '#CA7952'
      },
      {
        step: 2,
        label: 'Exploration',
        subtitle: 'Cross-Domain Breadth',
        desc: 'Diving deep across multidisciplinary frontiers to map perspectives that conventional silos miss.',
        deepDive:
          'True innovation lives at intersections. We connect historical precedent, legal architecture, physical dynamics, and engineering paradigms.',
        color: '#17A491'
      },
      {
        step: 3,
        label: 'Critical Thinking',
        subtitle: 'Rigorous Logic',
        desc: 'Challenging assumptions, testing causal logic, and dismantling cognitive bias.',
        deepDive:
          'Ideas are stress-tested through adversarial critique. We test edge conditions and eliminate weak hypotheses before committing resources.',
        color: '#25CDB6'
      },
      {
        step: 4,
        label: 'Evidence Research',
        subtitle: 'Empirical Verification',
        desc: 'Empirical verification, rigorous scientific methods, and real-world field data.',
        deepDive:
          'Subjective intuition must bow to verifiable proof. We gather rigorous data, conduct controlled experiments, and validate foundational premises.',
        color: '#6B8AFF'
      },
      {
        step: 5,
        label: 'Insight Synthesis',
        subtitle: 'Distilling Clarity',
        desc: 'Distilling complex, noisy findings into clean architectural models and definitive clarity.',
        deepDive:
          'The breakthrough moment: distilling thousands of data points into an actionable thesis that reveals how to solve the underlying problem.',
        color: '#D0A873'
      },
      {
        step: 6,
        label: 'Practical Solutions',
        subtitle: 'Engineered Tools',
        desc: 'Engineering physical tools, software mechanisms, and institutions that empower society.',
        deepDive:
          'Insight without execution is hollow. We build deployable mechanisms, verify impact in the field, and iterate for permanence.',
        color: '#25CDB6'
      }
    ],
    ourPhilosophyBadge: '04 · Guiding Ethos',
    ourPhilosophyHeading: 'Our philosophy',
    philosophyPillars: [
      {
        id: 'phil-1',
        romanLabel: 'I. Conviction',
        word: 'Believe',
        text: 'Fearless curiosity. The courage to question fundamental realities and trust human potential.',
        accentColor: '#25CDB6'
      },
      {
        id: 'phil-2',
        romanLabel: 'II. Discipline',
        word: 'Build',
        text: 'Execution without compromise. Engineering thoughts into mechanisms, systems, and tools.',
        accentColor: '#D0A873'
      },
      {
        id: 'phil-3',
        romanLabel: 'III. Transformation',
        word: 'Become',
        text: 'Evolving individuals and societies through verified insight and durable ethical impact.',
        accentColor: '#CA7952'
      }
    ],
    ourPhilosophy:
      'More than an organization, Masters Of All is an ecosystem for explorers, creators, innovators, and problem-solvers. We strive to unlock human potential, foster meaningful progress, and build a future where knowledge inspires action, innovation creates opportunity, and every challenge becomes the beginning of a solution.',
    philosophyEthosTag: 'Masters Of All · Organization Ethos',
    founderStatement:
      'If people are given the right tools, knowledge, and support early enough, most problems don’t need to exist.',
    founderAttribution: 'FOUNDER, MASTERS OF ALL',
    endingLineTemplate: '{{departmentCount}} {{departmentsNoun}}. One research division.'
  },
  departments: {
    heading: 'Departments & RDD',
    rddIntro:
      'RDD, Research, Discovery and Development, is a sub-organization of Masters Of All. It oversees the {{departmentCountWord}} {{departmentsNoun}} below.',
    directoryEyebrow: 'Directory',
    directoryTitleTemplate: 'The {{departmentCountWordCap}} {{disciplinesNoun}}',
    directorySubtitle: 'Explore mandates, theoretical questions, and active programs within each department.',
    exploreButtonLabel: 'Explore'
  },
  work: {
    heading: 'Our Work',
    subtitle: 'Published projects, research publications, and products from across our departments.',
    projectsTabLabel: 'Projects',
    publicationsTabLabel: 'Publications',
    productsTabLabel: 'Products',
    emptyTitle: 'Nothing published yet',
    emptySubtitle: 'Published projects, publications, and products will appear here once released.',
    searchPlaceholder: 'Search our work...'
  },
  contact: {
    heading: 'Got a question? That’s how we start.',
    subtext: 'Write to us or find us online. We’d love to hear from you.',
    directEyebrow: 'Direct Channel',
    directHeading: 'Get in touch',
    directDescription:
      'For business inquiries, research partnerships, press queries, and multidisciplinary collaborations.',
    emailBoxLabel: 'Official Inquiries Email',
    sendEmailLabel: 'Send an email',
    copyEmailLabel: 'Copy email',
    copiedEmailLabel: 'Copied to clipboard',
    formHeading: 'Send a direct message',
    formNamePlaceholder: 'Your name',
    formEmailPlaceholder: 'you@example.com',
    formSubjectPlaceholder: 'Subject (optional)',
    formMessagePlaceholder: 'How can we help or collaborate?',
    formSubmitLabel: 'Send message',
    formSuccessMessage: 'Thank you. Your message has been received.',
    responseNote: '',
    channelsEyebrow: 'Official Channels',
    channelsHeading: 'Find us online',
    channelsDescription: 'Connect with our community, explore public updates, and follow ongoing research initiatives.',
    channelsVisitLabel: 'Visit',
    channelsFooterNote: 'Stay connected through official Masters Of All publications and media.'
  },
  footer: {
    blurb: 'An ecosystem for explorers, creators, innovators and problem-solvers.',
    departmentsHeading: 'Departments',
    communityHeading: 'Community',
    copyrightSuffix: 'All rights reserved.'
  },
  notFound: {
    badge: '404 · Page Not Found',
    heading: 'Page not found',
    message: 'The page or resource you are looking for does not exist or has been relocated.',
    homeButtonLabel: 'Return to Home'
  },
  maintenance: {
    badge: 'Scheduled Maintenance',
    heading: 'We’ll be right back.',
    message: 'Masters Of All is undergoing brief scheduled maintenance. Please check back shortly.'
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
  organizationAddress: '',
  language: 'en',
  timezone: 'UTC',
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
    keywords: 'Masters Of All, MoA, multidisciplinary research, innovation, RDD',
    sitemapEnabled: true,
    robotsEnabled: true
  },
  announcementBar: {
    enabled: false,
    text: '',
    linkUrl: '',
    linkLabel: '',
    expiresAt: ''
  },
  navigation: [
    { id: 'nav-home', label: 'Home', path: '/' },
    { id: 'nav-about', label: 'About', path: '/about' },
    { id: 'nav-departments', label: 'Departments', path: '/departments' },
    { id: 'nav-projects', label: 'Our Work', path: '/projects' },
    { id: 'nav-contact', label: 'Contact', path: '/contact' }
  ],
  footerColumns: [],
  notFoundText: 'The page or resource you are looking for does not exist or has been relocated.',
  maintenanceMode: false,
  maintenanceAllowlist: [],
  redirects: [],
  projectStatuses: ['Concept', 'In Development', 'Active', 'Completed', 'On Hold'],
  projectCategories: ['Research', 'Open Source', 'Architecture', 'Fellowship', 'Publication'],
  securityPolicy: {
    minPasswordLength: 12,
    requireUppercase: true,
    requireNumber: true,
    requireSymbol: true,
    sessionTimeoutMinutes: 120,
    enforce2FAForAdmins: true,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15
  }
};

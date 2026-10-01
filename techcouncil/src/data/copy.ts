// The site's words, shared by the live site and the redesign options so the
// facts can never drift apart between them.
import { featuredProject } from './projects';

export const HERO = {
  title: 'Student-built tech for a smarter TIS.',
  lede: 'The TIS Tech Council is making Tashkent International School a smarter, more connected campus, with tools and projects built by students.',
};

export const MISSION = {
  line: 'Our mission is to make technology part of TIS’s DNA.',
  support:
    'We’re students who think our school deserves better tech, so we build it. Tools for teachers and students, projects that make campus run smoother, and a direct line for your ideas.',
};

export const ABOUT = {
  title: 'We build the tech our campus is missing.',
  body: [
    'The TIS Tech Council is a group of students at Tashkent International School who think our school deserves better tools, so we make them.',
    'We design, build and run projects for students and teachers, and we start from what people at TIS actually ask for.',
  ],
};

export const WORK = [
  {
    title: 'Build tools for the school',
    body: 'Websites, bots and small systems that fix everyday problems at TIS, built and maintained by students.',
  },
  {
    title: 'Run tech projects',
    body: 'Every project goes from an idea to a plan to something people at TIS actually use, with a team and a launch date.',
  },
  {
    title: 'Listen to student ideas',
    body: 'The best projects start as someone’s suggestion. Anyone at TIS can send one, and the council reads every one.',
  },
];

export const SUGGEST = {
  title: 'What tech does TIS need?',
  lede: 'Slow Wi-Fi in the library? An app you wish existed? Tell us. The best ideas become real projects.',
  promises: [
    ['Anonymous by default', 'Add your name only if you’d like a reply.'],
    ['Private', 'Only the council reads suggestions. They’re never posted publicly.'],
    ['Taken seriously', 'Popular ideas go straight into our project pipeline.'],
  ] as const,
  placeholder: 'e.g. A live board outside the gym showing which courts are free',
  thanksTitle: 'Idea received.',
  thanksBody: 'Thanks for helping build a smarter TIS. The council reads every suggestion.',
};

export const FAQ = [
  {
    q: 'Who can send a suggestion?',
    a: 'Anyone at Tashkent International School: students, teachers and staff. Pick a category, write your idea, and send it.',
  },
  {
    q: 'Is my suggestion anonymous?',
    a: 'Yes, by default. Your name and grade are only attached if you switch anonymous off and choose to add them.',
  },
  {
    q: 'Who reads the suggestions?',
    a: 'Only the Tech Council. Suggestions are never posted publicly. We store a scrambled (hashed) version of your connection address only to stop spam, never the address itself.',
  },
  {
    q: 'What happens after I send one?',
    a: 'The council reads every suggestion. The most popular and doable ideas become projects that a team plans, builds and launches.',
  },
  ...(featuredProject ? [{ q: `What is ${featuredProject.name}?`, a: `${featuredProject.tagline} ${featuredProject.description}` }] : []),
];

export const MOTTO = 'Challenge | Explore | Connect';

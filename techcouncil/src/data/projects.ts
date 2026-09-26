// Every project on the site is defined here.
//
// - `featured` shows the large card with countdown and detail view.
// - `pipeline` shows the dimmed "In the pipeline" cards (not clickable).
// - `accent` colours are used only inside that project's card, so each project
//   keeps its own brand inside the Tech Council site.

export type ProjectStatus = 'live' | 'building' | 'pipeline';

export interface Project {
  id: string;
  name: string;
  /** Logo shown on a light tile (original artwork). */
  logo?: string;
  /** Optional transparent version for dark surfaces. */
  logoDark?: string;
  tagline: string;
  description: string;
  features: string[];
  status: ProjectStatus;
  /** Human-readable date label. */
  date?: string;
  /** Countdown window (ISO strings with timezone). */
  event?: { start: string; end: string; timezoneLabel: string };
  stack: string[];
  /** Leave empty until the site is public; the button then reads "Link coming soon". */
  link: string;
  accent: { navy: string; primary: string; secondary: string; tertiary: string };
  featured?: boolean;
  /** Emoji-free glyph name for pipeline cards. */
  icon?: 'bot' | 'air' | 'feedback';
}

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  live: 'Live',
  building: 'Building',
  pipeline: 'In the pipeline',
};

export const projects: Project[] = [
  {
    id: 'tismun',
    name: 'TISMUN',
    logo: '/projects/tismun-logo.png',
    logoDark: '/projects/tismun-logo-dark.svg',
    tagline: 'The official platform for TISMUN 2026.',
    description:
      'A full conference platform for TIS Model United Nations, with delegate and chair management, committee pages, and an Emergency Session committee whose topic is time-locked and released live during the conference.',
    features: [
      'Delegate and chair management, with a personal view for every delegate',
      'Committee pages with rooms, chairs, delegations and background papers',
      'Chair dashboard: roll call, timers, speakers’ list, caucuses, motions and voting',
      'Emergency Session committee whose topic is time-locked and released live',
      'Secretariat view of every committee at once',
    ],
    status: 'live',
    date: 'October 15–16, 2026',
    event: {
      // Tashkent time is UTC+5 all year (no daylight saving).
      start: '2026-10-15T00:00:00+05:00',
      end: '2026-10-17T00:00:00+05:00',
      timezoneLabel: 'Tashkent time',
    },
    stack: ['React', 'Vite', 'TypeScript', 'Tailwind', 'Cloudflare Pages', 'D1'],
    // TODO: paste the public TISMUN URL here.
    link: '',
    accent: { navy: '#2D3748', primary: '#E89A3C', secondary: '#8B2332', tertiary: '#2A7C74' },
    featured: true,
  },
  {
    id: 'telegram-bot',
    name: 'Telegram bot',
    tagline: 'Announcements, schedules and reminders, right inside Telegram.',
    description: '',
    features: [],
    status: 'pipeline',
    stack: [],
    link: '',
    accent: { navy: '#0E1629', primary: '#4DE8FA', secondary: '#2F6FF5', tertiary: '#8AB2FF' },
    icon: 'bot',
  },
  {
    id: 'air-quality',
    name: 'Air quality monitor',
    tagline: 'Live CO₂ and PM2.5 readings from classrooms around campus.',
    description: '',
    features: [],
    status: 'pipeline',
    stack: [],
    link: '',
    accent: { navy: '#0E1629', primary: '#4DE8FA', secondary: '#2F6FF5', tertiary: '#8AB2FF' },
    icon: 'air',
  },
  {
    id: 'feedback',
    name: 'Student feedback site',
    tagline: 'A simple, anonymous way to tell the school what’s working.',
    description: '',
    features: [],
    status: 'pipeline',
    stack: [],
    link: '',
    accent: { navy: '#0E1629', primary: '#4DE8FA', secondary: '#2F6FF5', tertiary: '#8AB2FF' },
    icon: 'feedback',
  },
];

export const featuredProject = projects.find((p) => p.featured);
export const pipelineProjects = projects.filter((p) => p.status === 'pipeline');

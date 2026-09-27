// Everything about the founders lives here. To add a photo, drop a portrait
// image (roughly 4:5, under 200 KB) into /public/founders/ and point `photo`
// at it. If the file is missing the card shows an animated initials avatar.
// A bio of '[PLACEHOLDER]' is shown on the site as "Bio coming soon".

export interface Founder {
  id: string;
  name: string;
  role: string;
  photo: string;
  tagline: string;
  bio: string;
  links?: { label: string; href: string }[];
}

export const founders: Founder[] = [
  {
    id: 'yassir',
    name: 'Yassir Abduhakimov',
    role: 'Co-founder',
    photo: '/founders/yassir.jpg',
    tagline: 'Builds AI tools for students.',
    bio: 'IB Diploma student and founder of Talaba AI (talabaai.app), an AI exam-prep platform for students in Uzbekistan. Interned at the Ministry of Digital Technologies of Uzbekistan.',
    links: [{ label: 'talabaai.app', href: 'https://talabaai.app' }],
  },
  {
    id: 'dovud',
    name: 'Dovud Kasimov',
    role: 'Co-founder',
    photo: '/founders/dovud.jpg',
    tagline: 'Co-founder, TIS Tech Council.',
    bio: '[PLACEHOLDER]',
  },
  {
    id: 'damirbek',
    name: 'Damirbek Xolnazarov',
    role: 'Co-founder',
    photo: '/founders/damirbek.jpg',
    tagline: 'Co-founder, TIS Tech Council.',
    bio: '[PLACEHOLDER]',
  },
];

export const isPlaceholder = (text: string) => /^\s*\[PLACEHOLDER\]\s*$/i.test(text);

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

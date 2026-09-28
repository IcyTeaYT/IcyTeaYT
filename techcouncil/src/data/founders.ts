// Everything about the founders lives here. To add a photo, drop a portrait
// image (roughly 4:5, under 200 KB) into /public/founders/ and point `photo`
// at it. If the file is missing the card shows an animated initials avatar.
// A bio of '[PLACEHOLDER]' is shown on the site as "Bio coming soon".
// A blank line (\n\n) in a bio starts a new paragraph.

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
    tagline: 'Making technology part of TIS’s DNA.',
    bio: 'I’m Yassir Abduhakimov, co-founder of the TIS Tech Council. My goal is simple: make technology part of TIS’s DNA. Our mission is to create a school culture where innovation is second nature and every student has the power to build what they imagine.',
  },
  {
    id: 'dovud',
    name: 'Dovud Kasimov',
    role: 'Co-founder',
    photo: '/founders/dovud.jpg',
    tagline: 'Grade 11 student, athlete and developer.',
    bio: 'I’m a Grade 11 student, athlete, and developer with a strong interest in technology and innovation. I have experience developing startups and building technology-driven projects, and I enjoy finding creative ways to use technology to solve real-world problems.\n\nAs a member of the Tech Council, I want to use my experience and interest in technology to help improve our school, support students and teachers, and contribute to making our school community more innovative, connected, and efficient.',
  },
  {
    id: 'damirbek',
    name: 'Damirbek Xolnazarov',
    role: 'Co-founder',
    photo: '/founders/damirbek.jpg',
    tagline: 'AI, economics and entrepreneurship.',
    bio: 'I’m Damirbek Xolnazarov, a high school student at Tashkent International School passionate about AI, technology, economics, and entrepreneurship. I build software projects that aim to solve real-world problems, especially in education and accessibility. I’m also involved in student leadership, public speaking, and youth initiatives, where I work to create more opportunities for students in Uzbekistan. I’m especially interested in combining technology, research, and entrepreneurship to make a meaningful impact.',
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

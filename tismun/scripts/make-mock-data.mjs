import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = '/home/user/IcyTeaYT/tismun/src/data/mock';
mkdirSync(OUT, { recursive: true });

const committees = [
  {
    id: 'hrc-russian',
    name: 'Human Rights Committee (Russian)',
    abbr: 'HRC RU',
    t1: 'Rebuilding Human Rights Frameworks After Global Disruption: Displacement, Survival, and the Ethics of Humanitarian Protection',
    t2: 'Restoring International Human Rights Standards After the Pandemic: Displacement and the Morality of Survival in the Modern World',
    room: 'Room 502',
    chairs: ['Laziza', 'Nazira', 'Iman'],
    desc: 'The Human Rights Committee debated in Russian. Delegates take the same two questions as the English-language Human Rights Committees \u2014 how rights frameworks are rebuilt after a global shock, and what states owe displaced people \u2014 but do so entirely in Russian, from opening speeches to the final resolution.',
    countries: [
      ['Armenia', 'AM'], ['Belarus', 'BY'], ['Georgia', 'GE'], ['Kazakhstan', 'KZ'],
      ['Kyrgyzstan', 'KG'], ['Latvia', 'LV'], ['Moldova', 'MD'], ['Mongolia', 'MN'],
      ['Russian Federation', 'RU'], ['Tajikistan', 'TJ'], ['Turkmenistan', 'TM'],
      ['Ukraine', 'UA'], ['Uzbekistan', 'UZ'],
    ],
  },
  {
    id: 'hrc-1',
    name: 'Human Rights Committee 1',
    abbr: 'HRC 1',
    t1: 'Rebuilding Human Rights Frameworks After Global Disruption: Displacement, Survival, and the Ethics of Humanitarian Protection',
    t2: 'Restoring International Human Rights Standards After the Pandemic: Displacement and the Morality of Survival in the Modern World',
    room: 'Room 503',
    chairs: ['Zhanel', 'Sanzhar'],
    desc: 'The Human Rights Committee is where states answer for their record and where new standards are written. Delegates will balance the principle of non-interference against the duty to protect, and will find that the hardest negotiations are over language rather than intent. Strong position papers cite specific instruments and cases.',
    countries: [
      ['Argentina', 'AR'], ['Belgium', 'BE'], ['Brazil', 'BR'], ['France', 'FR'],
      ['Gambia', 'GM'], ['Germany', 'DE'], ['India', 'IN'], ['Japan', 'JP'],
      ['Kenya', 'KE'], ['Malaysia', 'MY'], ['Morocco', 'MA'], ['Qatar', 'QA'],
      ['South Africa', 'ZA'], ['Viet Nam', 'VN'],
    ],
  },
  {
    id: 'hrc-2',
    name: 'Human Rights Committee 2',
    abbr: 'HRC 2',
    t1: 'Rebuilding Human Rights Frameworks After Global Disruption: Displacement, Survival, and the Ethics of Humanitarian Protection',
    t2: 'Restoring International Human Rights Standards After the Pandemic: Displacement and the Morality of Survival in the Modern World',
    room: 'Room 504',
    chairs: ['Dilafruz', 'Yana', 'Maryam'],
    desc: 'A second Human Rights Committee taking the same two questions, so that twice as many delegates get the floor. Expect the two committees to reach different answers \u2014 which is the point.',
    countries: [
      ['Australia', 'AU'], ['Bangladesh', 'BD'], ['Canada', 'CA'], ['Chile', 'CL'],
      ['Egypt', 'EG'], ['Ethiopia', 'ET'], ['Indonesia', 'ID'], ['Italy', 'IT'],
      ['Mexico', 'MX'], ['Netherlands', 'NL'], ['Nigeria', 'NG'], ['Norway', 'NO'],
      ['Pakistan', 'PK'], ['Philippines', 'PH'],
    ],
  },
  {
    id: 'sc',
    name: 'Security Council',
    abbr: 'SC',
    t1: 'Re-Evaluating the Threshold of Intervention: State Sovereignty, Humanitarian Aid Blockades, and the Ethics of Coercive Force',
    t2: 'Navigating Catastrophic Regional Displacement: Sovereign Borders, Ethics of Forced Migration, and the Mandate for Global Resettlement',
    room: 'Room 507',
    chairs: ['Natalia', 'Hollansa'],
    desc: 'The Security Council carries primary responsibility for the maintenance of international peace and security. With fifteen members and the veto in play, delegates negotiate under real constraint: a single permanent member can halt an otherwise unanimous resolution. Expect a demanding pace, and resolutions judged on whether they could survive a real vote.',
    countries: [
      ['China', 'CN'], ['France', 'FR'], ['Russian Federation', 'RU'], ['United Kingdom', 'GB'],
      ['United States', 'US'], ['Algeria', 'DZ'], ['Denmark', 'DK'], ['Greece', 'GR'],
      ['Guyana', 'GY'], ['Pakistan', 'PK'], ['Panama', 'PA'], ['Republic of Korea', 'KR'],
      ['Sierra Leone', 'SL'], ['Slovenia', 'SI'], ['Somalia', 'SO'],
    ],
  },
  {
    id: 'hsc-1',
    name: 'Historical Security Council 1',
    abbr: 'HSC 1',
    t1: 'The Congo Crisis: ONUC Involvement in National Conflicts, 1962',
    t2: 'The Cuban Missile Crisis: Preventing Nuclear War, 1962',
    room: 'Room 508',
    chairs: ['Timur', 'Martin'],
    desc: 'The Security Council as it stood in 1962. On the Congo: following independence from Belgium in 1960, the breakdown of civil order displaced tens of thousands, and the UN deployed its largest peacekeeping force at the time (ONUC), raising the question of where foreign intervention ends and national sovereignty begins. On Cuba: the United States has discovered Soviet nuclear missiles ninety miles from its mainland, and the Council has days, not weeks.',
    countries: [
      ['China', 'CN'], ['France', 'FR'], ['Russian Federation', 'RU'], ['United Kingdom', 'GB'],
      ['United States', 'US'], ['Chile', 'CL'], ['Egypt', 'EG'], ['Ghana', 'GH'],
      ['Ireland', 'IE'], ['Romania', 'RO'], ['Venezuela', 'VE'],
    ],
  },
  {
    id: 'hsc-2',
    name: 'Historical Security Council 2',
    abbr: 'HSC 2',
    t1: 'The Congo Crisis: ONUC Involvement in National Conflicts, 1962',
    t2: 'The Cuban Missile Crisis: Preventing Nuclear War, 1962',
    room: 'Room 509',
    chairs: ['David', 'Nigmat'],
    desc: 'A second Historical Security Council sitting in 1962 on the same two crises. Delegates are bound by what was known at the time: no hindsight, no later treaties, and no technology that did not yet exist.',
    countries: [
      ['China', 'CN'], ['France', 'FR'], ['Russian Federation', 'RU'], ['United Kingdom', 'GB'],
      ['United States', 'US'], ['Chile', 'CL'], ['Egypt', 'EG'], ['Ghana', 'GH'],
      ['Ireland', 'IE'], ['Romania', 'RO'], ['Venezuela', 'VE'],
    ],
  },
  {
    id: 'ga-2',
    name: 'General Assembly 2',
    abbr: 'GA 2',
    t1: 'Rebuilding Post-Conflict Economies and Infrastructure in the Age of Resource Scarcity',
    t2: 'Economic Inclusion and Financial Access for Mass Displaced Populations',
    room: 'Room 510',
    chairs: ['Yassir', 'Damirbek', 'Jihoo'],
    desc: 'The Economic and Financial Committee of the General Assembly. Debate here turns on numbers as much as principle \u2014 reconstruction costs, concessional finance, remittance corridors, access to banking \u2014 and delegates are expected to arrive knowing what their country can actually afford to promise.',
    countries: [
      ['Bangladesh', 'BD'], ['Brazil', 'BR'], ['China', 'CN'], ['Colombia', 'CO'],
      ['Germany', 'DE'], ['India', 'IN'], ['Jordan', 'JO'], ['Kenya', 'KE'],
      ['Nigeria', 'NG'], ['Poland', 'PL'], ['Saudi Arabia', 'SA'], ['T\u00fcrkiye', 'TR'],
      ['United States', 'US'], ['Uzbekistan', 'UZ'],
    ],
  },
  {
    id: 'ga-3',
    name: 'General Assembly 3',
    abbr: 'GA 3',
    t1: 'Protecting the Rights and Cultural Heritage of Climate-Displaced Populations',
    t2: 'Humanitarian Action and Protection Standards in Emerging High-Tech Conflict Zones',
    room: 'Room 511',
    chairs: ['Yuna', 'Sally', 'Gee'],
    desc: 'The Social, Humanitarian and Cultural Committee of the General Assembly. Its resolutions are not binding, which makes consensus-building the whole exercise: delegates must find language broad enough to attract signatures and precise enough to mean something.',
    countries: [
      ['Australia', 'AU'], ['Bolivia', 'BO'], ['Fiji', 'FJ'], ['France', 'FR'],
      ['Iraq', 'IQ'], ['Japan', 'JP'], ['Kiribati', 'KI'], ['Maldives', 'MV'],
      ['New Zealand', 'NZ'], ['Peru', 'PE'], ['Senegal', 'SN'], ['Sweden', 'SE'],
      ['Tuvalu', 'TV'], ['Viet Nam', 'VN'],
    ],
  },
];

// A deliberately mixed name pool — an international school roster in Tashkent.
const FIRST = [
  'Amir','Sofia','Timur','Elena','Jasur','Maya','Bekzod','Anika','Ruslan','Leyla',
  'Farrukh','Nadia','Otabek','Irina','Sardor','Yulia','Javohir','Kamola','Alisher','Diyora',
  'Ethan','Chloe','Ji-woo','Rahul','Mateo','Hana','Lukas','Priya','Noah','Amina',
  'Yusuf','Zoya','Emil','Sanjar','Madina','Artur','Laila','Daniyar','Vera','Omar',
  'Aisha','Marco','Seo-yeon','Ishaan','Clara','Tariq','Nina','Bobur','Freya','Karim',
  'Shokhrukh','Valeria','Aziz','Mira','Doston','Polina','Nikita','Sabina','Hugo','Anvar',
  'Eleanor','Rustam','Dilfuza','Jonas','Yasmin','Temur','Alina','Sohail','Greta','Iskandar',
  'Malak','Viktor','Nargiza','Felix','Zainab','Aron','Kristina','Shahzod','Emma','Bakhtiyor',
  'Layla','Pavel','Gulnora','Arman','Stella','Ibrahim','Katya','Jahongir','Rosa','Murod',
];
const LAST = [
  'Nazarov','Petrova','Alimov','Sokolova','Rakhimov','Fernandes','Usmanov','Kaur','Ibragimov','Haddad',
  'Yuldashev','Novak','Ergashev','Volkova','Kholmatov','Larsen','Tashkentov','Singh','Mirzaev','Saidova',
  'Whitmore','Dubois','Park','Sharma','Alvarez','Tanaka','Weber','Nair','Sullivan','Osman',
  'Qodirov','Lebedev','Andersen','Turgunov','Iskandarova','Meyer','Barakat','Seitov','Orlova','Farouk',
  'Bello','Rossi','Choi','Verma','Lindqvist','Aziz','Marek','Nurmatov','Halvorsen','Mansour',
  'Djalilov','Egorova','Sattorov','Kuznetsova','Bakhronov','Romanova','Vasiliev','Akhmedova','Moreau','Sobirov',
  'Hartley','Ismoilov','Khasanova','Berg','Zaman','Muminov','Popova','Rahman','Fischer','Yakubov',
  'Nasser','Kovalenko','Ahmadova','Schneider','Karimi','Laine','Melnyk','Umarov','Clarke','Rasulov',
  'Aminova','Sorokin','Nabieva','Petrosyan','Lindberg','Sayed','Morozova','Toshmatov','Mendes','Ochilov',
];

let cursor = 0;
const usedEmails = new Set();
function nextPerson() {
  for (let attempt = 0; attempt < FIRST.length * LAST.length; attempt += 1) {
    const first = FIRST[cursor % FIRST.length];
    const last = LAST[Math.floor(cursor / FIRST.length) % LAST.length + (cursor % 7)] ?? LAST[cursor % LAST.length];
    cursor += 1;
    const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
    const email = `${slug(first)}.${slug(last)}@demo.tis`;
    if (!usedEmails.has(email)) {
      usedEmails.add(email);
      return { fullName: `${first} ${last}`, email };
    }
  }
  throw new Error('name pool exhausted');
}

const userRows = [];
const committeeRows = [];

for (const c of committees) {
  committeeRows.push({
    'Committee ID': c.id,
    Name: c.name,
    Abbreviation: c.abbr,
    'Topic 1': c.t1,
    'Topic 2': c.t2,
    Chairs: c.chairs.join('; '),
    Room: c.room,
    'Background Paper URL': `/papers/${c.id}.pdf`,
    Description: c.desc,
  });

  // Chairs carry a committee but no country.
  for (const chairName of c.chairs) {
    const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
    // The leadership document lists chairs by first name only, so the demo
    // address pairs the name with the committee to stay unique.
    userRows.push({
      // Keep digits in the committee part: stripping them would collapse
      // hrc-1 and hrc-2 to the same address.
      Email: `${slug(chairName)}.${c.id.replace(/[^a-z0-9]/g, '')}@demo.tis`,
      'Full Name': chairName,
      Role: 'CHAIR',
      'Committee ID': c.id,
      Country: '',
      'Country Code': '',
      Title: '',
    });
  }

  for (const [country, code] of c.countries) {
    const person = nextPerson();
    userRows.push({
      Email: person.email,
      'Full Name': person.fullName,
      Role: 'DELEGATE',
      'Committee ID': c.id,
      Country: country,
      'Country Code': code,
      Title: '',
    });
  }
}

// The Secretariat: one account, no committee of its own, oversees all of them.
{
  const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
  const fullName = 'Kamron Yusupov';
  const [first, ...rest] = fullName.split(' ');
  userRows.push({
    Email: `${slug(first)}.${slug(rest.join(''))}@demo.tis`,
    'Full Name': fullName,
    Role: 'SECRETARIAT',
    'Committee ID': '',
    Country: '',
    'Country Code': '',
    Title: 'Secretary-General',
  });
}

// One unassigned delegate so the "not assigned yet" empty state is testable.
userRows.push({
  Email: 'unassigned.delegate@demo.tis',
  'Full Name': 'Sardor Nematov',
  Role: 'DELEGATE',
  'Committee ID': '',
  Country: '',
  'Country Code': '',
  Title: '',
});

const emails = userRows.map((r) => r.Email);
const dupes = emails.filter((e, i) => emails.indexOf(e) !== i);
if (dupes.length) throw new Error('duplicate emails: ' + [...new Set(dupes)].join(', '));

writeFileSync(`${OUT}/committees.json`, JSON.stringify(committeeRows, null, 2) + '\n');
writeFileSync(`${OUT}/users.json`, JSON.stringify(userRows, null, 2) + '\n');

console.log(`committees: ${committeeRows.length}`);
console.log(`users: ${userRows.length} (chairs ${userRows.filter(u=>u.Role==='CHAIR').length}, delegates ${userRows.filter(u=>u.Role==='DELEGATE').length})`);
for (const c of committees) {
  console.log(`  ${c.abbr.padEnd(7)} ${c.countries.length} delegations`);
}

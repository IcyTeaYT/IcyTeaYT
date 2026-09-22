import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = '/home/user/IcyTeaYT/tismun/src/data/mock';
mkdirSync(OUT, { recursive: true });

const committees = [
  {
    id: 'unsc',
    name: 'United Nations Security Council',
    abbr: 'UNSC',
    t1: 'The situation in the Sahel and the future of regional peace operations',
    t2: 'Maintaining international peace and security in the context of autonomous weapons systems',
    room: 'Assembly Hall',
    chairs: ['Aziza Karimova', 'Daniel Whitfield'],
    desc: 'The Security Council carries primary responsibility for the maintenance of international peace and security. With fifteen members and the veto in play, delegates in this committee negotiate under real constraint: a single permanent member can halt an otherwise unanimous resolution. Expect crisis updates, a demanding pace, and resolutions judged on whether they could survive a real vote.',
    countries: [
      ['China', 'CN'], ['France', 'FR'], ['Russian Federation', 'RU'], ['United Kingdom', 'GB'],
      ['United States', 'US'], ['Algeria', 'DZ'], ['Denmark', 'DK'], ['Greece', 'GR'],
      ['Guyana', 'GY'], ['Pakistan', 'PK'], ['Panama', 'PA'], ['Republic of Korea', 'KR'],
      ['Sierra Leone', 'SL'], ['Slovenia', 'SI'], ['Somalia', 'SO'],
    ],
  },
  {
    id: 'unhrc',
    name: 'United Nations Human Rights Council',
    abbr: 'UNHRC',
    t1: 'Protecting human rights defenders in contexts of shrinking civic space',
    t2: 'Human rights implications of biometric surveillance technologies',
    room: 'Room 204',
    chairs: ['Nilufar Rashidova', 'Thomas Okonkwo'],
    desc: 'The Human Rights Council is where states answer for their record and where new standards are written. Delegates will balance the principle of non-interference against the Council’s mandate to respond, and will find that the hardest negotiations are over language rather than intent. Strong position papers in this committee cite specific instruments and cases.',
    countries: [
      ['Argentina', 'AR'], ['Belgium', 'BE'], ['Brazil', 'BR'], ["Côte d'Ivoire", 'CI'],
      ['France', 'FR'], ['Gambia', 'GM'], ['Germany', 'DE'], ['Japan', 'JP'],
      ['Kenya', 'KE'], ['Malaysia', 'MY'], ['Morocco', 'MA'], ['Qatar', 'QA'],
      ['South Africa', 'ZA'], ['Viet Nam', 'VN'],
    ],
  },
  {
    id: 'who',
    name: 'World Health Organization',
    abbr: 'WHO',
    t1: 'Strengthening the pandemic preparedness and response accord',
    t2: 'Addressing antimicrobial resistance as a global health emergency',
    room: 'Science Block, Room 12',
    chairs: ['Malika Yusupova', 'Arjun Mehta'],
    desc: 'The World Health Organization coordinates the international response to health emergencies and sets the technical standards states build their systems around. This committee rewards delegates who can translate scientific evidence into workable policy, and who understand that financing, manufacturing capacity and equitable access decide whether a good framework ever reaches a patient.',
    countries: [
      ['Australia', 'AU'], ['Bangladesh', 'BD'], ['Botswana', 'BW'], ['Canada', 'CA'],
      ['Ethiopia', 'ET'], ['India', 'IN'], ['Indonesia', 'ID'], ['Italy', 'IT'],
      ['Peru', 'PE'], ['Philippines', 'PH'], ['Rwanda', 'RW'], ['Switzerland', 'CH'],
      ['Thailand', 'TH'], ['Uzbekistan', 'UZ'],
    ],
  },
  {
    id: 'disec',
    name: 'Disarmament and International Security Committee',
    abbr: 'DISEC',
    t1: 'Preventing an arms race in outer space',
    t2: 'Regulating the international trade in small arms and light weapons',
    room: 'Room 110',
    chairs: ['Kamila Abdullaeva', 'Sebastian Hoffmann'],
    desc: 'As the First Committee of the General Assembly, DISEC addresses disarmament and the threats to global security that no state can meet alone. Its resolutions are not binding, which makes consensus-building the whole exercise: delegates must find language broad enough to attract signatures and precise enough to mean something.',
    countries: [
      ['Brazil', 'BR'], ['China', 'CN'], ['Egypt', 'EG'], ['Germany', 'DE'],
      ['India', 'IN'], ['Indonesia', 'ID'], ['Japan', 'JP'], ['Kazakhstan', 'KZ'],
      ['Mexico', 'MX'], ['Nigeria', 'NG'], ['Pakistan', 'PK'], ['Russian Federation', 'RU'],
      ['Sweden', 'SE'], ['Türkiye', 'TR'], ['United States', 'US'],
    ],
  },
  {
    id: 'ecosoc',
    name: 'Economic and Social Council',
    abbr: 'ECOSOC',
    t1: 'Sovereign debt distress and the financing of the Sustainable Development Goals',
    t2: 'Closing the digital divide in landlocked developing countries',
    room: 'Library Seminar Room',
    chairs: ['Dilnoza Tursunova', 'Grace Adeyemi'],
    desc: 'ECOSOC coordinates the economic, social and environmental work of the United Nations system. Debate here turns on numbers as much as principle — debt service ratios, concessional finance, infrastructure costs — and delegates are expected to arrive knowing what their country can actually afford to promise.',
    countries: [
      ['Bolivia', 'BO'], ['Chile', 'CL'], ['China', 'CN'], ['Costa Rica', 'CR'],
      ['Czechia', 'CZ'], ['Ethiopia', 'ET'], ['France', 'FR'], ['Ghana', 'GH'],
      ['Nepal', 'NP'], ['Netherlands', 'NL'], ['Norway', 'NO'], ['Paraguay', 'PY'],
      ['Uzbekistan', 'UZ'], ['Zambia', 'ZM'],
    ],
  },
  {
    id: 'unep',
    name: 'United Nations Environment Programme',
    abbr: 'UNEP',
    t1: 'Transboundary water management in Central Asia',
    t2: 'Establishing a binding international framework on plastic pollution',
    room: 'Room 301',
    chairs: ['Zarina Islamova', 'Oliver Brennan'],
    desc: 'UNEP sets the global environmental agenda and brokers the agreements that hold states to it. Our first topic sits on this conference’s doorstep: the Amu Darya and Syr Darya basins support tens of millions of people across five states whose needs for water, energy and agriculture do not align. Delegates should come prepared to trade.',
    countries: [
      ['Brazil', 'BR'], ['Canada', 'CA'], ['Denmark', 'DK'], ['Egypt', 'EG'],
      ['India', 'IN'], ['Japan', 'JP'], ['Kazakhstan', 'KZ'], ['Kenya', 'KE'],
      ['Kyrgyzstan', 'KG'], ['Norway', 'NO'], ['Tajikistan', 'TJ'], ['Turkmenistan', 'TM'],
      ['United Arab Emirates', 'AE'], ['Uzbekistan', 'UZ'],
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
    const [first, ...rest] = chairName.split(' ');
    userRows.push({
      Email: `${slug(first)}.${slug(rest.join(''))}@demo.tis`,
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

// The Secretariat: no committee of their own, they oversee all of them.
for (const [fullName, title] of [
  ['Kamron Yusupov', 'Secretary-General'],
  ['Elina Sattorova', 'Deputy Secretary-General'],
  ['Bekhruz Karimov', 'Head of Chairs'],
]) {
  const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
  const [first, ...rest] = fullName.split(' ');
  userRows.push({
    Email: `${slug(first)}.${slug(rest.join(''))}@demo.tis`,
    'Full Name': fullName,
    Role: 'SECRETARIAT',
    'Committee ID': '',
    Country: '',
    'Country Code': '',
    Title: title,
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

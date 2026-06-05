const FIRST_NAMES = [
  "James","John","Robert","Michael","William","David","Richard","Joseph","Thomas","Charles",
  "Emma","Olivia","Sophia","Isabella","Mia","Charlotte","Amelia","Harper","Evelyn","Abigail",
  "Sarah","Jessica","Samantha","Ashley","Emily","Jennifer","Lisa","Angela","Patricia","Elizabeth",
  "Ryan","Kevin","Jason","Brian","Andrew","Daniel","Matthew","Joshua","Christopher","Nicholas",
  "Amanda","Stephanie","Melissa","Rebecca","Rachel","Laura","Megan","Amy","Brittany","Heather",
  "Alex","Jordan","Taylor","Morgan","Cameron","Casey","Drew","Riley","Avery","Quinn",
];

const LAST_NAMES = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Martinez","Wilson",
  "Anderson","Taylor","Thomas","Hernandez","Moore","Martin","Jackson","Thompson","White","Lopez",
  "Lee","Gonzalez","Harris","Clark","Lewis","Robinson","Walker","Perez","Hall","Young",
  "Allen","Sanchez","Wright","King","Scott","Green","Baker","Adams","Nelson","Carter",
  "Mitchell","Roberts","Turner","Phillips","Campbell","Parker","Evans","Edwards","Collins","Stewart",
];

export const INDUSTRIES = [
  "SaaS","FinTech","Healthcare","Manufacturing","Retail","Real Estate",
  "Marketing Agency","Consulting","Education","Logistics","Media","Legal",
  "E-Commerce","Construction","Insurance","Staffing","Cybersecurity",
  "PropTech","CleanTech","Automotive",
];

export const TITLE_LEVELS: Record<string, string[]> = {
  "c-suite": ["CEO","CTO","CFO","COO","CMO","CRO","President","Founder","Co-Founder","CPO"],
  "vp": ["VP of Sales","VP of Marketing","VP of Engineering","VP of Product","VP of Finance","VP of Operations","VP of Customer Success","VP of Business Development"],
  "director": ["Director of Sales","Director of Marketing","Director of Business Development","Director of Operations","Director of Finance","Director of Product"],
  "manager": ["Sales Manager","Marketing Manager","Account Manager","Business Development Manager","Operations Manager","Product Manager","Customer Success Manager"],
  "individual": ["Account Executive","BDR","SDR","Sales Representative","Marketing Specialist","Growth Manager","Partnerships Manager","Solutions Engineer"],
};

const ALL_TITLES = Object.values(TITLE_LEVELS).flat();

const WORDS_A = [
  "Tech","Digital","Cloud","Data","Smart","Pro","Global","Prime","Peak","Elite",
  "Core","Apex","Nexus","Fusion","Pulse","Orbit","Vertex","Edge","Catalyst","Harbor",
  "Bright","Swift","Bold","Clear","Sharp","Deep","True","Pure","Blue","Velo",
];
const WORDS_B = [
  "Labs","Hub","Works","Base","Scale","Flow","Stack","Sync","Link","Mind",
  "Shift","Force","Ware","Net","Deck","Yard","Point","Reach","Wave","Gate",
  "Forge","Hive","Span","Mark","Zone","Path","Lift","Cast","Beam","Bolt",
];
const COMPANY_TYPES = ["Inc","Corp","Group","Labs","Solutions","Systems","Partners","Co","Ventures","Platform"];
export const COMPANY_SIZES = ["1-10","11-50","51-200","201-500","501-1000","1000+"];

export const COUNTRIES = [
  "United States","United Kingdom","Canada","Germany","Australia","France","Netherlands","Singapore","India","Japan",
];

const CITIES: Record<string, string[]> = {
  "United States": ["New York, NY","Los Angeles, CA","Chicago, IL","Houston, TX","Phoenix, AZ","Philadelphia, PA","San Antonio, TX","San Diego, CA","Dallas, TX","San Jose, CA","Austin, TX","Denver, CO","Boston, MA","Seattle, WA","Nashville, TN","Atlanta, GA","Miami, FL","Portland, OR","Minneapolis, MN","Charlotte, NC"],
  "United Kingdom": ["London","Manchester","Birmingham","Leeds","Glasgow","Liverpool","Bristol","Edinburgh","Cardiff","Leicester","Sheffield","Bradford","Coventry","Nottingham"],
  "Canada": ["Toronto","Vancouver","Montreal","Calgary","Ottawa","Edmonton","Winnipeg","Quebec City","Hamilton","Kitchener"],
  "Germany": ["Berlin","Munich","Hamburg","Frankfurt","Cologne","Stuttgart","Düsseldorf","Dresden","Leipzig","Hannover"],
  "Australia": ["Sydney","Melbourne","Brisbane","Perth","Adelaide","Canberra","Gold Coast","Newcastle","Hobart"],
  "France": ["Paris","Lyon","Marseille","Toulouse","Nice","Nantes","Bordeaux","Strasbourg","Lille","Rennes"],
  "Netherlands": ["Amsterdam","Rotterdam","The Hague","Utrecht","Eindhoven","Groningen","Tilburg","Almere"],
  "Singapore": ["Singapore"],
  "India": ["Bangalore","Mumbai","Delhi","Hyderabad","Pune","Chennai","Kolkata","Ahmedabad"],
  "Japan": ["Tokyo","Osaka","Kyoto","Yokohama","Nagoya","Sapporo","Fukuoka"],
};

function h(n: number): number {
  let x = n ^ (n >>> 16);
  x = Math.imul(x, 0x45d9f3b);
  x = x ^ (x >>> 16);
  x = Math.imul(x, 0x45d9f3b);
  return Math.abs(x ^ (x >>> 16));
}

function pick<T>(arr: T[], seed: number): T {
  return arr[h(seed) % arr.length];
}

function strSeed(s: string): number {
  let v = 5381;
  for (let i = 0; i < s.length; i++) v = ((v << 5) + v + s.charCodeAt(i)) | 0;
  return Math.abs(v);
}

export interface FinderLead {
  id: string;
  fullName: string;
  title: string;
  company: string;
  location: string;
  country: string;
  industry: string;
  companySize: string;
  email: string;
  verified: boolean;
}

export interface FinderResponse {
  results: FinderLead[];
  total: number;
  page: number;
  pages: number;
}

export function searchLeads(opts: {
  q?: string;
  industry?: string;
  titleLevel?: string;
  companySize?: string;
  country?: string;
  verifiedOnly?: boolean;
  page: number;
  limit: number;
}): FinderResponse {
  const { q, industry, titleLevel, companySize, country, verifiedOnly, page, limit } = opts;

  let total = 4_892_341;
  if (q) total = Math.floor(total * 0.11);
  if (industry) total = Math.floor(total * 0.09);
  if (titleLevel) total = Math.floor(total * 0.15);
  if (companySize) total = Math.floor(total * 0.22);
  if (country) total = Math.floor(total * 0.18);
  if (verifiedOnly) total = Math.floor(total * 0.72);
  total = Math.max(total, limit);

  const baseSeed = strSeed([q, industry, titleLevel, companySize, country, verifiedOnly ? "1" : "0"].join("|"));
  const countriesPool = country ? [country] : COUNTRIES;
  const industriesPool = industry ? [industry] : INDUSTRIES;
  const titlesPool = titleLevel && TITLE_LEVELS[titleLevel] ? TITLE_LEVELS[titleLevel] : ALL_TITLES;
  const sizesPool = companySize ? [companySize] : COMPANY_SIZES;
  const tlds = ["com","io","co","net","ai"];

  const results: FinderLead[] = [];
  for (let i = 0; i < limit; i++) {
    const idx = (page - 1) * limit + i;
    const s = baseSeed + idx * 7919;

    const fn = pick(FIRST_NAMES, h(s + 1));
    const ln = pick(LAST_NAMES, h(s + 2));
    const ind = pick(industriesPool, h(s + 3));
    const title = pick(titlesPool, h(s + 4));
    const wa = pick(WORDS_A, h(s + 5));
    const wb = pick(WORDS_B, h(s + 6));
    const ct = pick(COMPANY_TYPES, h(s + 7));
    const ctr = pick(countriesPool, h(s + 8));
    const location = pick(CITIES[ctr] || ["Unknown"], h(s + 9));
    const size = pick(sizesPool, h(s + 10));
    const tld = pick(tlds, h(s + 11));
    const verified = verifiedOnly ? true : h(s + 12) % 4 !== 0;

    results.push({
      id: `f${baseSeed}_${idx}`,
      fullName: `${fn} ${ln}`,
      title,
      company: `${wa}${wb} ${ct}`,
      location,
      country: ctr,
      industry: ind,
      companySize: size,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${wa.toLowerCase()}${wb.toLowerCase()}.${tld}`,
      verified,
    });
  }

  return { results, total, page, pages: Math.ceil(total / limit) };
}

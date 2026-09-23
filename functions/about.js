// functions/about.js
//
// The About page, rendered at the edge as real HTML, built to the SOP
// "How to Build a Perfectly Optimized About Us Page".
//
// WHY THIS IS A FUNCTION AND NOT A REACT ROUTE
// The public site is a React/Vite SPA: every route returns the same empty
// index.html and the copy only exists after hydration. Google can render
// JavaScript; most LLM crawlers cannot. The SOP requires server-rendered HTML,
// so the page is rendered here, complete, in the first response. Humans get the
// same document.
//
// SOP RULES ENFORCED HERE, BECAUSE THEY ARE EASY TO BREAK LATER
//   - Eight sections in order: entity definition (H1), services, differentiators,
//     segments, team and origin, how it works, key facts, FAQ.
//   - Opening sentence is "[Brand] is a [category] that [does what] for [whom]",
//     third person, brand name inside the first five words.
//   - Six services, five differentiators, six FAQs. Not "about six".
//   - NO EM DASHES anywhere on the page. Commas, periods or parentheses.
//   - No unprovable adjectives (world-class, best-in-class, revolutionary).
//   - Key facts as a real table, never an image.
//   - Schema: Organization, Service, BreadcrumbList, FAQPage. FAQ answer text
//     matches the on-page answer word for word.
//   - Linked from the global footer of every page, and in the sitemap.
//
// EVERY NUMBER HERE IS CHECKED (23 Sep 2026)
//   41,856 parcels          properties in markets 1,2,3,5,8,9 (campbell-market)
//   46,151 recorded sales   property_sales (campbell-market)
//   296 condo buildings     buildings where is_catalogued (condo-market-sf)
//   18,566 condo sales      building_sales (condo-market-sf)
//   10 disclosure reviews   disclosure_reviews published (campbell-market)
//   41 CMAs                 cmas (mcmullen-properties)
//   699 articles            blog_posts is_published (mcmullen-properties)
// $1B+ represented, $31M top sale, 10+ years, $100M+ closed, 25+ projects built
// and the Four Seasons history are Tim's own published claims (agent_signatures,
// /meet-tim). The 1.5% to 3% commission scale was confirmed by Tim, 23 Sep 2026.
//
// NOT ON THIS PAGE, DELIBERATELY
//   - The brokerage's DRE number: the email signature says #02022092 and the
//     letters say #02228473. The SOP says confirm every fact in writing, and a
//     licence number two systems disagree on fails that test.
//   - Founder LinkedIn URL, which the SOP wants in the Person schema: no
//     confirmed profile. Put it in FOUNDER_SAMEAS and it flows into the schema.
//   - Client names: none are public, and a page covering probate is the wrong
//     place to start naming people.

const SITE = 'https://mcmullenresidential.com'
const FOUNDER_SAMEAS = [] // add the confirmed LinkedIn URL here

// Every market Tim runs, with its own public site. Each is a city he works, and
// each site publishes the whole record rather than the listings.
const MARKETS = [
  { name: 'The Campbell Market',      url: 'https://campbellrealestatemarket.com',    area: 'Campbell, 95008',                        note: '6,830 parcels' },
  { name: 'The Los Gatos Market',     url: 'https://losgatosrealestatemarket.com',    area: 'Los Gatos, 95030/95032/95033',           note: '8,303 parcels' },
  { name: 'The Saratoga Market',      url: 'https://saratogarealestatemarket.com',    area: 'Saratoga, 95070',                        note: '6,161 parcels' },
  { name: 'Condo Market SF',          url: 'https://www.sanfranciscocondomarket.com', area: 'San Francisco condominiums',             note: '296 catalogued buildings, 18,566 recorded sales' },
  { name: 'The Half Moon Bay Market', url: 'https://halfmoonbayrealestatemarket.com', area: 'Half Moon Bay and the San Mateo coast',  note: '5,942 parcels' },
  { name: 'The Discovery Bay Market', url: 'https://discoverybaymarket.com',          area: 'Discovery Bay, Contra Costa County',     note: '4,838 parcels' },
  { name: 'Eichler Market',           url: 'https://eichlermarket.com',               area: 'Eichler homes, Peninsula and South Bay', note: 'by tract and model' },
]
const PARTNER_MARKETS = [
  { name: 'The Penngrove Market', url: 'https://penngroverealestatemarket.com', area: 'Penngrove, Sonoma County' },
  { name: 'The Petaluma Market',  url: 'https://petalumarealestatemarket.com',  area: 'Petaluma, Sonoma County' },
]
const mlink = (m) => `<a href="${m.url}">${m.name}</a>`

// SOP section 8: six questions mirroring what people type. Each answer restates
// the brand name and carries at least one hard fact. These strings are the one
// source for both the visible FAQ and the FAQPage schema.
const FAQ = [
  {
    q: 'What is McMullen Properties?',
    a: 'McMullen Properties is a California real estate practice that sells homes, condominiums and estate property for owners, buyers, landlords and executors across the San Francisco Bay Area. It is run by Tim McMullen, a licensed broker (CA DRE #02016832) based in Campbell, and it operates seven public market sites covering 41,856 parcels and 46,151 recorded sales.',
  },
  {
    q: 'How much does McMullen Properties cost?',
    a: 'Commission runs on a sliding scale from 1.5% to 3%, set by the scope of work and agreed in writing before anything is signed. A home that is ready to list sits at the bottom of that range, and an engagement that includes managing a renovation, the trades and the schedule sits at the top. Valuations, disclosure reviews and date-of-death valuations are prepared at no charge.',
  },
  {
    q: 'How is McMullen Properties different from Compass or Redfin?',
    a: 'Compass and Redfin run team models, where a seller is routed through an inside agent, a listing coordinator and a showing agent. At McMullen Properties the broker who values the property is the one who negotiates the contract. McMullen Properties also publishes all 41,856 parcels in its markets rather than only the homes currently for sale, and prices commission by scope of work rather than at one fixed listing rate.',
  },
  {
    q: 'Who founded McMullen Properties?',
    a: 'Tim McMullen, Broker, CA DRE #02016832, founded the practice and runs it from Campbell, California. He has more than ten years in Bay Area real estate and was a sales executive on the launch team of San Francisco\u2019s $1.2B Four Seasons Private Residences at 706 Mission Street.',
  },
  {
    q: 'What services does McMullen Properties offer?',
    a: 'McMullen Properties handles listing and selling homes, project management and renovation before a sale, buyer representation and off-market offers, probate and estate property including date-of-death valuations, investment property (1031 exchanges, tenant-occupied sales and commercial), and property research through disclosure reviews and seven public market sites.',
  },
  {
    q: 'Does a valuation from McMullen Properties require a listing agreement?',
    a: 'No. A written valuation, a disclosure review and a date-of-death valuation for an estate are prepared at no charge and carry no obligation to list. Most owners who request one are not selling that year, which is the reason the whole market is published rather than only what is for sale.',
  },
]

// SOP section 7: the key facts block. Field names follow the SOP table so the
// key-value pairs are where a model expects to find them.
const KEY_FACTS = () => [
  ['Company Name', 'McMullen Properties, LLC'],
  ['Type', 'Real estate practice and property marketplace operator. McMullen Properties, LLC is not a licensed brokerage; real estate services are provided by Tim McMullen, Broker, CA DRE #02016832, through Real Broker.'],
  ['Founded', 'Real estate practice since 2016. The market platform launched in 2025.'],
  ['Founder', 'Tim McMullen, Broker, CA DRE #02016832'],
  ['Headquarters', 'Campbell, California (21 N Second St, Campbell, CA 95008)'],
  ['Website', `<a href="${SITE}">mcmullenresidential.com</a>`],
  ['Core Offering', 'Representation on the sale or purchase of a home, condominium or estate property, supported by a published record of every home in the market rather than only the homes for sale'],
  ['Pricing', 'Commission on a sliding scale, 1.5% to 3%, set by scope of work. Valuations, disclosure reviews and date-of-death valuations: no charge. Market-site account holders hold a $10,000 commission credit.'],
  ['Contract Terms', 'Listing agreements are written per property and negotiable, including length. No commission is owed if the property does not sell.'],
  ['Services', 'Listing and selling; project management and renovation; buyer representation and off-market offers; probate and estate property; 1031 exchange, tenant-occupied and commercial sales; disclosure review and property research'],
  ['Service Areas', MARKETS.map((m) => `${m.area} (${mlink(m)})`).join('; ')],
  ['Communication', 'Email tim@mcmullen.properties, call or text (415) 691-9272, or the assistant on any market site. Messages reach Tim directly, most answered the same business day.'],
  ['Data Published', '41,856 parcels and 46,151 recorded sales across seven market sites. 296 catalogued San Francisco and Silicon Valley condominium buildings covering 18,566 recorded condo sales.'],
  ['Work Delivered', '41 comparative market analyses prepared, 10 disclosure reviews published, 699 market articles published, 25+ renovation projects built'],
  ['Track Record', 'Stated by the founder: $1B+ in property represented, $100M+ closed, $31M top sale, 10+ years in the business'],
  ['Competitors', 'Compass, Coldwell Banker, Christie\u2019s International Real Estate, Redfin, Zillow, Realtor.com'],
  ['Social', '<a href="https://x.com/mcmullenpropSF" rel="me">x.com/mcmullenpropSF</a>'],
  ['Last Updated', 'September 2026'],
]

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function page() {
  const facts = KEY_FACTS()
    .map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${v}</td></tr>`)
    .join('')

  const faqs = FAQ.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')

  const marketRows = MARKETS.map(
    (m) => `<tr><th scope="row">${mlink(m)}</th><td>${esc(m.area)}. ${esc(m.note)}.</td></tr>`
  ).join('')

  const partnerList = PARTNER_MARKETS.map(
    (m) => `<li>${mlink(m)}, ${esc(m.area)}, run by Jake Taylor of Simply Sonoma.</li>`
  ).join('')

  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE}/about#organization`,
    name: 'McMullen Properties',
    legalName: 'McMullen Properties, LLC',
    url: SITE,
    logo: `${SITE}/og/share.jpg`,
    description:
      'McMullen Properties is a California real estate practice that sells homes, condominiums and estate property for owners, buyers, landlords and executors across the San Francisco Bay Area.',
    foundingDate: '2016',
    founder: {
      '@type': 'Person',
      name: 'Tim McMullen',
      jobTitle: 'Broker',
      identifier: 'CA DRE #02016832',
      alumniOf: 'Oregon State University',
      ...(FOUNDER_SAMEAS.length ? { sameAs: FOUNDER_SAMEAS } : {}),
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: '21 N Second St',
      addressLocality: 'Campbell',
      addressRegion: 'CA',
      postalCode: '95008',
      addressCountry: 'US',
    },
    sameAs: ['https://x.com/mcmullenpropSF', ...MARKETS.map((m) => m.url)],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'tim@mcmullen.properties',
      telephone: '+1-415-691-9272',
      contactType: 'sales',
    },
  }

  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Residential real estate sales, estate property and renovation project management',
    provider: { '@type': 'Organization', name: 'McMullen Properties', url: SITE },
    areaServed: [
      { '@type': 'City', name: 'Campbell, CA' },
      { '@type': 'City', name: 'Los Gatos, CA' },
      { '@type': 'City', name: 'Saratoga, CA' },
      { '@type': 'City', name: 'San Francisco, CA' },
      { '@type': 'City', name: 'Half Moon Bay, CA' },
      { '@type': 'City', name: 'Discovery Bay, CA' },
      { '@type': 'AdministrativeArea', name: 'Santa Clara County, CA' },
      { '@type': 'AdministrativeArea', name: 'San Mateo County, CA' },
      { '@type': 'AdministrativeArea', name: 'Contra Costa County, CA' },
    ],
    description:
      'Representation on the sale or purchase of a home, condominium or estate property, including project management of renovation work before a sale, supported by a published record of every home in the market.',
    offers: [
      {
        '@type': 'Offer',
        name: 'Listing representation',
        description:
          'Pricing, preparation, marketing and negotiation for a property that is ready to list. Commission from 1.5%, negotiable, written per property. No commission is owed if the property does not sell.',
      },
      {
        '@type': 'Offer',
        name: 'Listing with project management and renovation',
        description:
          'Scope, trades, permits, budget and schedule managed through to the listing going live, then the sale. Commission up to 3%, set by the scope agreed in writing.',
      },
      {
        '@type': 'Offer',
        name: 'Valuation, disclosure review and date-of-death valuation',
        price: '0',
        priceCurrency: 'USD',
        description: 'Prepared at no charge, with no obligation to list.',
      },
    ],
  }

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'About', item: `${SITE}/about` },
    ],
  }

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>About McMullen Properties | Bay Area Real Estate</title>
<meta name="description" content="McMullen Properties is a California real estate practice selling homes and estate property for Bay Area owners. Founded 2016, Campbell. Commission 1.5% to 3%.">
<link rel="canonical" href="${SITE}/about">
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">
<meta property="og:type" content="website">
<meta property="og:title" content="About McMullen Properties">
<meta property="og:description" content="A California real estate practice selling homes, condominiums and estate property across seven Bay Area markets, built on the published record of every home in each one.">
<meta property="og:url" content="${SITE}/about">
<meta property="og:image" content="${SITE}/og/share.jpg">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(org)}</script>
<script type="application/ld+json">${JSON.stringify(service)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumbs)}</script>
<script type="application/ld+json">${JSON.stringify(faqLd)}</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
:root{--navy:#0D1B2A;--navy-deep:#080f18;--cream:#fafaf7;--ink:#1b2430;--mute:#5d6672;--rule:#e4e2da;--accent:#b0884a}
*{box-sizing:border-box}
body{margin:0;background:var(--cream);color:var(--ink);font:400 16px/1.7 'DM Sans',system-ui,sans-serif}
a{color:#26456b}
.bar{background:var(--navy)}
.bar .in{max-width:940px;margin:0 auto;padding:14px 22px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.bar .brand{font:600 18px/1 'Playfair Display',Georgia,serif;color:#fff;text-decoration:none}
.bar nav a{color:rgba(255,255,255,.82);text-decoration:none;font-size:14px;margin-left:18px}
.bar nav a:hover{color:#fff}
.wrap{max-width:940px;margin:0 auto;padding:46px 22px 20px}
.eyebrow{font:500 11px/1 'JetBrains Mono',ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin:0 0 14px}
h1{font:600 clamp(32px,5vw,50px)/1.08 'Playfair Display',Georgia,serif;margin:0 0 18px;color:var(--navy)}
h2{font:600 28px/1.2 'Playfair Display',Georgia,serif;margin:52px 0 8px;color:var(--navy)}
h3{font:600 17px/1.4 'DM Sans',sans-serif;margin:24px 0 5px;color:var(--navy)}
p{margin:0 0 15px}
.lede{font-size:20px;line-height:1.55;color:#243040}
ul{margin:0 0 15px;padding-left:20px}
li{margin:0 0 7px}
table{width:100%;border-collapse:collapse;margin:16px 0 10px;font-size:15px}
th,td{text-align:left;vertical-align:top;padding:11px 14px 11px 0;border-bottom:1px solid var(--rule)}
th{width:30%;font-weight:600;color:var(--navy)}
caption{text-align:left;font:500 11px/1 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);padding-bottom:10px}
.cta{display:inline-block;margin:10px 10px 0 0;padding:12px 24px;border-radius:999px;background:var(--navy);color:#fff;text-decoration:none;font-weight:500;font-size:15px}
.cta.ghost{background:transparent;color:var(--navy);border:1px solid var(--rule)}
footer.site{background:var(--navy-deep);color:rgba(255,255,255,.72);margin-top:60px;padding:40px 0}
footer.site .in{max-width:940px;margin:0 auto;padding:0 22px;font-size:14px}
footer.site a{color:#fff;text-decoration:none;margin-right:16px}
footer.site .fine{font-size:12.5px;line-height:1.7;color:rgba(255,255,255,.55);margin-top:18px}
@media(max-width:620px){th{width:42%}.bar nav a{margin:0 14px 0 0}}
</style>
</head><body>

<div class="bar"><div class="in">
  <a class="brand" href="/">McMullen Properties</a>
  <nav>
    <a href="/listings">Listings</a><a href="/services">Services</a>
    <a href="/meet-tim">Meet Tim</a><a href="/blog">Market news</a><a href="/about">About</a>
  </nav>
</div></div>

<div class="wrap">

<p class="eyebrow">About</p>
<h1>About McMullen Properties</h1>

<p class="lede">McMullen Properties is a California real estate practice that sells homes,
condominiums and estate property for owners, buyers, landlords and executors across the San
Francisco Bay Area.</p>

<p>The practice is run by Tim McMullen, a licensed broker (CA DRE #02016832) based in
Campbell, California. Alongside the sales work it operates seven public market sites that
publish the complete record of every home in the areas they cover, 41,856 parcels and 46,151
recorded sales, so an owner can see what a property is worth to the market before speaking to
anyone. Commission runs on a sliding scale from 1.5% to 3%, set by the scope of the work
rather than by a fixed rate card.</p>

<p>
  <a class="cta" href="/contact">Talk to Tim</a>
  <a class="cta ghost" href="/services">See the services</a>
</p>

<h2>What McMullen Properties Does</h2>

<h3>Listing and selling homes</h3>
<p>Full seller representation: pricing from recorded sales, preparation, photography,
marketing and negotiation, with the broker who valued the property handling the contract.
Sellers get a price supported by the same public record their buyers can read.</p>

<h3>Project management and renovation before a sale</h3>
<p>Where a property cannot reach its price in its current condition, the work runs as part of
the engagement: scope, trades, permits, budget, schedule and capital timing, through to the
listing going live. Owners get one person accountable for both the renovation and the sale,
which is the work at the top of the commission scale.</p>

<h3>Buyer representation and off-market offers</h3>
<p>Buyers can make a written offer on any home in a covered market, listed or not, and it is
delivered to the owner of record. That turns a search restricted to current listings into a
search across every house on the street.</p>

<h3>Probate and estate property</h3>
<p>For executors, administrators and trustees: a written date-of-death valuation at no
charge, the clear-out handled when the family lives elsewhere, and a sale run to the standard
the court and the attorney expect. The valuation is a broker\u2019s opinion of value, separate
from the probate referee\u2019s Inventory and Appraisal that the court arranges.</p>

<h3>Investment property: 1031 exchange, tenant-occupied and commercial sales</h3>
<p>Rentals are sold with the tenancy in place or through a compliant buyout, and proceeds can
move into replacement property through a 1031 exchange alongside the owner\u2019s CPA. Landlords
get an exit that does not depend on the property being empty first.</p>

<h3>Property research: disclosure review, valuations and the market sites</h3>
<p>Disclosure packages are read and reduced to the repairs, assessments and litigation that
matter before a contingency expires, and written valuations are prepared on request. Ten
disclosure reviews and 699 market articles have been published, and each market has its own
public site.</p>

<table>
  <caption>Markets operated by McMullen Properties</caption>
  <tbody>${marketRows}</tbody>
</table>

<p>Two further markets on the same platform are run by a partner agent rather than by Tim:</p>
<ul>${partnerList}</ul>

<h2>What Makes McMullen Properties Different</h2>

<h3>Commission priced to the work, 1.5% to 3%</h3>
<p>Most brokerages quote a single listing rate whatever the property needs. McMullen
Properties sets the rate by scope, from 1.5% for a home that is ready to list up to 3% where
the engagement includes managing a renovation, and the scope and the rate are agreed in
writing before anything is signed.</p>

<h3>The whole market is published, not only the listings</h3>
<p>Zillow, Redfin and Realtor.com publish homes that are for sale. McMullen Properties
publishes all 41,856 parcels and 46,151 recorded sales in its markets, so every home has a
page whether or not it is listed, and any owner can be reached with a written offer.</p>

<h3>One broker from the first call to the closing</h3>
<p>Team models at Compass and Redfin route a seller through an inside agent, a listing
coordinator and a showing agent. At McMullen Properties the broker who values the property is
the one who negotiates the contract.</p>

<h3>Renovation managed in house rather than referred out</h3>
<p>Most brokerages hand a seller a contractor list, or offer a concierge loan against the
sale proceeds. McMullen Properties runs the project itself, with 25+ renovation projects
built to date, so the preparation and the pricing are decided by the same person.</p>

<h3>Condominium buildings researched as buildings</h3>
<p>Most agents price a condominium from unit comparables alone. The San Francisco practice
keeps a catalogue of 296 buildings covering 18,566 recorded sales and reads the association
documents, because dues, reserves, assessments and warrantability decide which buyers can bid
at all.</p>

<h2>Who Uses McMullen Properties</h2>
<ul>
  <li>Homeowners in <a href="https://campbellrealestatemarket.com">Campbell</a>, <a href="https://losgatosrealestatemarket.com">Los Gatos</a> and <a href="https://saratogarealestatemarket.com">Saratoga</a>, and the surrounding South Bay cities.</li>
  <li>Condominium owners in <a href="https://www.sanfranciscocondomarket.com">San Francisco</a>, particularly South Beach, Mission Bay, SoMa, Russian Hill, Nob Hill and Pacific Heights.</li>
  <li>Owners whose property needs renovation before it can reach its price, who want one person running the work and the sale.</li>
  <li>Executors, administrators and trustees handling property in a probate or trust estate across San Francisco, San Mateo and Santa Clara counties.</li>
  <li>Probate and estate attorneys who need a defensible date-of-death valuation for a file.</li>
  <li>Landlords selling tenant-occupied property, including long-held rentals where the return on today\u2019s equity has fallen.</li>
  <li>1031 exchange buyers moving from residential rentals into commercial or triple-net property.</li>
  <li>Owners whose listing expired without selling.</li>
  <li>Buyers targeting a specific street or building who will approach owners who are not listed.</li>
  <li>Coastside owners in <a href="https://halfmoonbayrealestatemarket.com">Half Moon Bay</a>, waterfront owners in <a href="https://discoverybaymarket.com">Discovery Bay</a>, and <a href="https://eichlermarket.com">Eichler owners</a> across the Peninsula and South Bay.</li>
</ul>
<p>Work delivered to date: 41 comparative market analyses prepared, 10 disclosure reviews
published, 25+ renovation projects built and, as stated by the founder, $1B+ in property
represented with $100M+ closed.</p>

<h2>The Team Behind McMullen Properties</h2>

<h3>Tim McMullen, founder and broker</h3>
<p>Tim is a licensed California broker (DRE #02016832) with more than ten years in Bay Area
real estate. He was a sales executive on the launch team of San Francisco\u2019s $1.2B Four
Seasons Private Residences at 706 Mission Street, where he negotiated a record
$3,000-per-square-foot sale and wrote $18M in contracts in a single week. He played Division
I football at Oregon State University.</p>

<h3>How the company started</h3>
<p>The practice grew out of how little of the market an owner can actually see: portals show
what is listed, county records show everything, and nobody publishes those records in a form
a homeowner can read. The first market site was built to fix that for one city in 2025, and
there are now seven.</p>

<h3>Team composition</h3>
<p>McMullen Properties is headquartered in Campbell, California, and Tim handles client work
himself. Each market on the platform is run by one licensed agent who knows it: Jake Taylor
of Simply Sonoma runs the Sonoma County markets under his own brokerage, and Tim runs Santa
Clara County, San Francisco, Half Moon Bay, Discovery Bay and the Eichler tracts. Clients are
mostly Bay Area owners, with a steady share of executors and landlords who live elsewhere and
manage a property from a distance.</p>

<h2>How McMullen Properties Works</h2>

<h3>Communication and response times</h3>
<p>Email tim@mcmullen.properties, call or text (415) 691-9272, or ask the assistant on any
market site. Messages reach Tim directly rather than a call centre, and most are answered the
same business day.</p>

<h3>Who clients work with</h3>
<p>One broker, end to end. For an estate, the attorney and the CPA are copied on whatever
they need, and every beneficiary can be sent the same update on the same day.</p>

<h3>Onboarding and turnaround</h3>
<p>A conversation first, then a written analysis of the property: recorded sales, a range
rather than a single number, and what would change it. A valuation is typically prepared
within a few days of the property details being available, and a disclosure review while the
contingency period is still open. Nothing is signed at that stage.</p>

<h3>Preparation and renovation timing</h3>
<p>Where work is needed before listing, the scope, budget and schedule are set with the owner
up front, and the listing date is fixed against that schedule rather than the other way
round.</p>

<h2>Key Facts</h2>
<table>
  <caption>Key facts about McMullen Properties</caption>
  <tbody>${facts}</tbody>
</table>

<h2>Frequently Asked Questions</h2>
${faqs}

</div>

<footer class="site"><div class="in">
  <a href="/">Home</a><a href="/listings">Listings</a><a href="/services">Services</a>
  <a href="/meet-tim">Meet Tim</a><a href="/blog">Market news</a><a href="/about">About</a>
  <a href="/contact">Contact</a>
  <p class="fine">
    McMullen Properties, LLC, 21 N Second St, Campbell, CA 95008. Telephone (415) 691-9272.
    McMullen Properties, LLC is not a licensed real estate brokerage. Real estate services are
    provided by Tim McMullen, Broker, CA DRE #02016832, through Real Broker. Nothing on this
    page is legal, tax or investment advice. Commission rates are negotiable and are not set
    by law. Last updated September 2026.
  </p>
</div></footer>

</body></html>`
}

export async function onRequest() {
  return new Response(page(), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Crawlable and cacheable, but never stale for long: the facts table is the
      // part that dates, and a wrong fact is worse than a slow page.
      'cache-control': 'public, max-age=600, s-maxage=3600',
    },
  })
}

// functions/about.js
//
// The About page, rendered at the edge as real HTML.
//
// WHY THIS IS A FUNCTION AND NOT A REACT ROUTE
// The public site is a React/Vite SPA: every route is served the same empty
// index.html and the copy only exists after hydration. Crawlers that do not run
// JavaScript — and that includes most AI answer engines — see nothing. An About
// page exists precisely to be read by those crawlers, so it is rendered here,
// complete, in the first response. Humans get the same document.
//
// WHAT IS IN IT, AND WHY IT IS SHAPED THIS WAY
// Value proposition, services, differentiators, who it is for, the people, how
// the work runs, a key-facts table, and an FAQ — in that order, with headings a
// parser can follow and a <table> rather than styled divs, because a table is
// what gets quoted back accurately.
//
// EVERY NUMBER HERE IS CHECKED (23 Sep 2026)
//   41,856 parcels          properties in markets 1,2,3,5,8,9 (campbell-market)
//   46,151 recorded sales   property_sales (campbell-market)
//   296 condo buildings     buildings where is_catalogued (condo-market-sf)
//   18,566 condo sales      building_sales (condo-market-sf)
//   10 disclosure reviews   disclosure_reviews published (campbell-market)
//   41 CMAs                 cmas (mcmullen-properties)
//   699 articles            blog_posts is_published (mcmullen-properties)
// $1B+ represented, $31M top sale, 10+ years, $100M+ closed and the Four Seasons
// history are Tim's own published claims (agent_signatures, /meet-tim).
//
// NOT ON THIS PAGE, DELIBERATELY
//   - The brokerage's DRE number: the signature says #02022092 and the letters
//     say #02228473. Publishing a licence number that two systems disagree on is
//     the one mistake this page must not make. Add it once reconciled.
//   - Client names: none are public, and a page about estates and probate is the
//     wrong place to start naming people.

const SITE = 'https://mcmullenresidential.com'

// Every market Tim runs, with its own public site. Each one is a city he works
// and can be checked by anyone: the sites publish the whole record, not listings.
const MARKETS = [
  { name: 'The Campbell Market',      url: 'https://campbellrealestatemarket.com',      area: 'Campbell, 95008',                 note: '6,830 parcels' },
  { name: 'The Los Gatos Market',     url: 'https://losgatosrealestatemarket.com',      area: 'Los Gatos, 95030/95032/95033',    note: '8,303 parcels' },
  { name: 'The Saratoga Market',      url: 'https://saratogarealestatemarket.com',      area: 'Saratoga, 95070',                 note: '6,161 parcels' },
  { name: 'Condo Market SF',          url: 'https://www.sanfranciscocondomarket.com',   area: 'San Francisco condominiums',      note: '296 catalogued buildings, 18,566 recorded sales' },
  { name: 'The Half Moon Bay Market', url: 'https://halfmoonbayrealestatemarket.com',   area: 'Half Moon Bay and the San Mateo coast', note: '5,942 parcels' },
  { name: 'The Discovery Bay Market', url: 'https://discoverybaymarket.com',            area: 'Discovery Bay, Contra Costa County', note: '4,838 parcels' },
  { name: 'Eichler Market',           url: 'https://eichlermarket.com',                 area: 'Eichler homes, Peninsula and South Bay', note: 'by tract and model' },
]
const PARTNER_MARKETS = [
  { name: 'The Penngrove Market', url: 'https://penngroverealestatemarket.com', area: 'Penngrove, Sonoma County' },
  { name: 'The Petaluma Market',  url: 'https://petalumarealestatemarket.com',  area: 'Petaluma, Sonoma County' },
]
const mlink = (m) => `<a href="${m.url}">${m.name}</a>`
const UPDATED = '2026-09-23'

const FAQ = [
  {
    q: 'What does McMullen Properties charge to sell a home?',
    a: 'Commission runs on a sliding scale from 1.5% to 3%, set by how much work the sale needs. A straightforward listing in a market where the data is already published sits at the bottom of the range; a property needing project management, a renovation or a full repositioning before it can sell for top dollar sits at the top. What a buyer\u2019s agent is paid is separate, negotiated, and agreed in writing before the home goes on the market. Commissions are not set by law and are always negotiable.',
  },
  {
    q: 'What decides where in the 1.5% to 3% range my sale falls?',
    a: 'The scope of work, agreed before anything is signed. Pricing, marketing and negotiation are in every engagement; project management of a renovation, trade coordination, permits and the capital timing that comes with them are not, and they move the number up. You see the scope and the rate together, in writing.',
  },
  {
    q: 'Do I have to list my home to find out what it is worth?',
    a: 'No. Every home in a covered market has its own page with the recorded sales around it, and you can ask for a written analysis without listing. Owners regularly use it to test a number privately and decide not to sell.',
  },
  {
    q: 'What is the $10,000 commission credit?',
    a: 'Account holders on the market sites hold a $10,000 credit that applies against commission on a future sale with Tim. It is attached to the home when the account is created, has no expiry, and costs nothing to hold.',
  },
  {
    q: 'Do you charge for a date-of-death valuation in a probate matter?',
    a: 'No. The valuation is prepared at no charge for the estate and its attorney, and carries no obligation to list. It is a broker\u2019s opinion of value, not a certified appraisal, and it is separate from the probate referee\u2019s Inventory and Appraisal that the court arranges.',
  },
  {
    q: 'Can you sell a property with tenants still living in it?',
    a: 'Yes. Tenant-occupied sales are a normal part of the work, either to an investor with the tenancy in place or, where a buyout is appropriate, under the rules that apply to it. Which path is better depends on the lease, the rent and the local ordinance.',
  },
  {
    q: 'Which areas do you cover?',
    a: 'Santa Clara County (Campbell, Los Gatos, Saratoga and the surrounding cities), San Francisco condominiums, the San Mateo coast at Half Moon Bay, Discovery Bay in Contra Costa County, and Eichler homes across the Peninsula and South Bay. Probate work covers San Francisco, San Mateo and Santa Clara counties.',
  },
  {
    q: 'Who will I actually work with?',
    a: 'Tim McMullen, the broker, handles the listing, the pricing conversation and the negotiation himself. There is no team of associates the file gets passed to after the first meeting.',
  },
  {
    q: 'Is McMullen Properties a brokerage?',
    a: 'No. McMullen Properties, LLC is not a licensed brokerage. Real estate services are provided by Tim McMullen, Broker, CA DRE #02016832, through Real Broker.',
  },
]

const KEY_FACTS = [
  ['Company name', 'McMullen Properties, LLC'],
  ['Type', 'Real estate practice and property marketplace operator. Not a licensed brokerage; real estate services are provided by Tim McMullen, Broker, CA DRE #02016832, through Real Broker.'],
  ['Founded', 'Real estate practice since 2016; the market platform launched in 2025'],
  ['Founder', 'Tim McMullen, Broker, CA DRE #02016832'],
  ['Headquarters', '21 N Second St, Campbell, CA 95008'],
  ['Website', '<a href="https://mcmullenresidential.com">mcmullenresidential.com</a>'],
  ['Core offering', 'Listing and selling residential property, supported by a public record of every home in the market rather than only the homes for sale'],
  ['Pricing', 'Commission on a sliding scale, 1.5% to 3%, set by the scope of work: a straightforward listing at the low end, a sale needing project management or renovation at the high end. $10,000 commission credit held by market-site account holders. Date-of-death valuations, disclosure reviews and written market analyses: no charge, no obligation.'],
  ['Contract terms', 'Listing agreements are written per property and negotiable, including length. No fee is owed if the home does not sell.'],
  ['Services', 'Listing and luxury sales; project management and renovation of properties that need work before they sell; buyer representation and off-market search; probate and estate sales with date-of-death valuations; disclosure review; 1031 exchange and tenant-occupied sales; commercial; expired listings; flips'],
  ['Service areas', MARKETS.map((m) => `${m.area} (${mlink(m)})`).join('; ')],
  ['Market sites operated', MARKETS.map(mlink).join(', ')],
  ['Communication', 'Email tim@mcmullen.properties, call or text (415) 691-9272, or ask the assistant on any market site. Tim answers directly.'],
  ['Scale of the data', '41,856 parcels and 46,151 recorded sales published across six market sites; 296 catalogued San Francisco and Silicon Valley condominium buildings covering 18,566 recorded condo sales'],
  ['Work published', '10 disclosure reviews published, 41 comparative market analyses prepared, 699 market articles published'],
  ['Track record', 'Stated by the founder: $1B+ in property represented, $100M+ closed, $31M top sale, 10+ years in the business'],
  ['Competitors', 'Traditional brokerages (Compass, Coldwell Banker, Christie\u2019s International), discount and team models (Redfin), and portals (Zillow, Realtor.com, Redfin.com)'],
  ['Social', '<a href="https://x.com/condomarketsf" rel="me">x.com/condomarketsf</a>'],
  ['Last updated', 'September 2026'],
]

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function page() {
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': `${SITE}/about#business`,
    name: 'McMullen Properties',
    legalName: 'McMullen Properties, LLC',
    url: SITE,
    telephone: '+1-415-691-9272',
    email: 'tim@mcmullen.properties',
    description:
      'McMullen Properties is a California real estate practice that sells homes, condominiums and estate property across Campbell, Los Gatos, Saratoga, San Francisco, Half Moon Bay, Discovery Bay and the Eichler tracts, with commission on a 1.5% to 3% sliding scale set by the scope of work, including project management and renovation.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '21 N Second St',
      addressLocality: 'Campbell',
      addressRegion: 'CA',
      postalCode: '95008',
      addressCountry: 'US',
    },
    founder: {
      '@type': 'Person',
      name: 'Tim McMullen',
      jobTitle: 'Broker',
      identifier: 'CA DRE #02016832',
      alumniOf: 'Oregon State University',
    },
    areaServed: [
      'Campbell, CA', 'Los Gatos, CA', 'Saratoga, CA', 'San Jose, CA',
      'San Francisco, CA', 'Half Moon Bay, CA', 'Discovery Bay, CA',
      'Santa Clara County, CA', 'San Mateo County, CA', 'Contra Costa County, CA',
    ],
    sameAs: ['https://x.com/condomarketsf'],
    makesOffer: [
      'Listing and selling residential property',
      'Project management and renovation of property before sale',
      'Buyer representation and off-market search',
      'Probate and estate sales, including date-of-death valuations',
      'Disclosure package review',
      '1031 exchange and tenant-occupied sales',
      'Commercial sales',
      'Pre-sale improvement and flips',
    ],
  }

  const facts = KEY_FACTS.map(
    ([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${v}</td></tr>`
  ).join('')

  const marketRows = MARKETS.map(
    (m) => `<tr><th scope="row">${mlink(m)}</th><td>${esc(m.area)} &mdash; ${esc(m.note)}</td></tr>`
  ).join('')

  const partnerList = PARTNER_MARKETS.map(
    (m) => `<li>${mlink(m)} &mdash; ${esc(m.area)}, run by Jake Taylor of Simply Sonoma</li>`
  ).join('')

  const faqs = FAQ.map(
    (f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`
  ).join('')

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>About McMullen Properties — Bay Area real estate, Campbell to San Francisco</title>
<meta name="description" content="McMullen Properties is a California real estate practice selling homes, condominiums and estate property across Campbell, Los Gatos, Saratoga, San Francisco, Half Moon Bay and Discovery Bay. Commission on a 1.5%-3% sliding scale, including project management and renovation. Tim McMullen, Broker, CA DRE #02016832.">
<link rel="canonical" href="${SITE}/about">
<meta property="og:type" content="website">
<meta property="og:title" content="About McMullen Properties">
<meta property="og:description" content="A California real estate practice selling homes, condominiums and estate property across seven Bay Area markets, built on the public record of every home in each one.">
<meta property="og:url" content="${SITE}/about">
<meta property="og:image" content="${SITE}/og/share.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="last-modified" content="${UPDATED}">
<script type="application/ld+json">${JSON.stringify(orgLd)}</script>
<script type="application/ld+json">${JSON.stringify(faqLd)}</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{--ink:#17140f;--paper:#faf8f3;--rule:#e6e1d6;--mute:#6f6a60;--accent:#b06f24}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.65 Inter,system-ui,sans-serif}
.wrap{max-width:820px;margin:0 auto;padding:44px 22px 90px}
a{color:var(--accent)}
nav.top{font-size:14px;margin:0 0 26px}
nav.top a{margin-right:16px;text-decoration:none}
h1{font-family:Fraunces,Georgia,serif;font-size:clamp(30px,5vw,44px);line-height:1.1;margin:0 0 14px;font-weight:600}
h2{font-family:Fraunces,Georgia,serif;font-size:26px;margin:44px 0 6px;font-weight:600}
h3{font-size:17px;margin:22px 0 4px;font-weight:600}
p{margin:0 0 14px}
.lede{font-size:19px;color:#2c2721}
ul{margin:0 0 14px;padding-left:20px}
li{margin:0 0 6px}
table{width:100%;border-collapse:collapse;margin:14px 0 8px;font-size:15px}
th,td{text-align:left;vertical-align:top;padding:10px 12px 10px 0;border-bottom:1px solid var(--rule)}
th{width:32%;font-weight:600;color:#2c2721}
.note{font-size:13.5px;color:var(--mute);border-top:1px solid var(--rule);margin-top:40px;padding-top:16px}
.cta{display:inline-block;margin:8px 10px 0 0;padding:11px 20px;border-radius:999px;background:var(--accent);color:#fff;text-decoration:none;font-weight:600;font-size:15px}
.cta.ghost{background:transparent;color:var(--accent);border:1px solid var(--rule)}
@media(max-width:620px){th{width:42%}}
</style>
</head><body>
<div class="wrap">

<nav class="top">
  <a href="/">Home</a><a href="/listings">Listings</a><a href="/services">Services</a>
  <a href="/meet-tim">Meet Tim</a><a href="/blog">Market news</a>
</nav>

<h1>About McMullen Properties</h1>

<p class="lede">McMullen Properties is a California real estate practice that sells homes,
condominiums and estate property for owners, buyers, landlords and executors across the San
Francisco Bay Area &mdash; and, where a property needs work first, manages the renovation
that gets it there.</p>

<p>It is run by Tim McMullen, a licensed broker based in Campbell. Alongside the sales
practice it operates seven public market sites &mdash; ${MARKETS.map(mlink).join(', ')}
&mdash; which publish the complete record of every home in the areas they cover, 41,856
parcels and 46,151 recorded sales, so an owner can see what their home is worth to the market
without speaking to anyone.</p>

<p>Commission runs on a sliding scale from 1.5% to 3%, set by the scope of the work rather
than by a rate card: a straightforward listing in a market where the record is already
published sits at the bottom of that range, and a property that needs managing through a
renovation before it can sell for top dollar sits at the top.</p>

<p>
  <a class="cta" href="/contact">Talk to Tim</a>
  <a class="cta ghost" href="/services">See the services</a>
</p>

<h2>What McMullen Properties does</h2>

<h3>Listing and selling homes</h3>
<p>Full representation for sellers: pricing from recorded sales, preparation, photography,
marketing and negotiation, at the low end of the 1.5% to 3% scale where the home is ready to
go. Tim handles the pricing conversation and the negotiation himself rather than passing the
file to an associate.</p>

<h3>Project management and renovation before a sale</h3>
<p>Where a house cannot reach its price in the condition it is in, the work is run as part of
the engagement: scope, trades, permits, budget, schedule and the capital timing, through to
the listing going live. This is the work at the top of the commission scale, and it is why
the scale exists &mdash; a managed renovation is a different job from listing a home that is
already ready.</p>

<h3>Buyer representation and off-market search</h3>
<p>Buyers can make a written offer on any home in a covered market, listed or not, and it is
delivered to the owner. That turns a search limited to what is currently for sale into a
search across every house on the street.</p>

<h3>Probate and estate sales</h3>
<p>For executors and administrators: a written date-of-death valuation at no charge, the
clear-out handled where the family lives elsewhere, and the sale run to the standard the
court and the attorney expect. The valuation is a broker&rsquo;s opinion of value, separate
from the probate referee&rsquo;s appraisal the court arranges.</p>

<h3>Disclosure review</h3>
<p>The disclosure package on a property, read and reduced to what actually matters: the
repairs, the assessments, the litigation and the questions to ask before the contingency
expires. Ten reviews have been published so far, each one permanent knowledge about that
building.</p>

<h3>1031 exchanges and tenant-occupied sales</h3>
<p>Selling a rental without the tenancy derailing it: sell occupied to an investor, or run a
compliant buyout where that is the better path. Where the owner wants to stay invested, the
proceeds can move into replacement property through a 1031 exchange, alongside their CPA.</p>

<h3>Commercial sales</h3>
<p>Smaller commercial and mixed-use assets, typically for owners moving out of residential
landlording into a building where the tenant pays the taxes, insurance and maintenance.</p>

<h3>Flips and investment projects</h3>
<p>For investors: sourcing off-market, underwriting the numbers, and renovating for resale
rather than for perfection &mdash; spending where buyers pay and skipping where they do not.
Twenty-five-plus projects built to date.</p>

<h3>Market intelligence</h3>
<p>Each market site publishes every parcel, its recorded sales, its street and its
neighbourhood, plus written analysis of what actually sold. In San Francisco that extends to
296 catalogued condominium buildings covering 18,566 recorded sales on
<a href="https://www.sanfranciscocondomarket.com">Condo Market SF</a>.</p>

<h2>What makes McMullen Properties different</h2>

<h3>Commission priced to the work: 1.5% to 3%</h3>
<p>Most brokerages quote one listing rate whatever the property needs. Here the rate is set
by scope: 1.5% at the low end for a home that is ready to list, up to 3% where the engagement
includes managing a renovation, the trades and the schedule that get it to market. You see
the scope and the rate together, before anything is signed, and commissions are negotiable at
any brokerage.</p>

<h3>The whole market is published, not only the listings</h3>
<p>Portals such as Zillow, Redfin and Realtor.com show homes that are for sale. The market
sites publish all 41,856 parcels and 46,151 recorded sales in their areas, so every home has
a page whether or not it is on the market, and every owner can be reached with an offer.</p>

<h3>One broker from the first call to the closing</h3>
<p>Team models at brokerages such as Redfin and Compass route a seller through several
people: an inside agent, a listing coordinator, a showing agent. Here the broker who values
the property is the one who negotiates the contract.</p>

<h3>Condominium buildings understood as buildings</h3>
<p>Most agents price a condominium from unit comparables. The San Francisco practice keeps a
catalogue of 296 buildings and reads the association documents, because dues, reserves,
assessments and warrantability decide which buyers can bid at all.</p>

<h3>The analysis is free and carries no obligation</h3>
<p>A written valuation, a disclosure review, a date-of-death valuation for an estate: no
charge, no listing agreement, and no requirement to sell. Most owners who ask for one are
not selling this year, and that is the point.</p>

<h2>Who uses McMullen Properties</h2>
<ul>
  <li>Homeowners in <a href="https://campbellrealestatemarket.com">Campbell</a>,
      <a href="https://losgatosrealestatemarket.com">Los Gatos</a> and
      <a href="https://saratogarealestatemarket.com">Saratoga</a>, and the surrounding South Bay cities.</li>
  <li>Condominium owners in <a href="https://www.sanfranciscocondomarket.com">San Francisco</a>,
      particularly in South Beach, Mission Bay, SoMa and the northern neighbourhoods.</li>
  <li>Executors, administrators and trustees handling a property in a probate or trust estate across San Francisco, San Mateo and Santa Clara counties.</li>
  <li>Probate and estate attorneys who need a defensible date-of-death valuation for a file.</li>
  <li>Landlords selling tenant-occupied property, including long-held rentals where the return on today&rsquo;s equity has fallen.</li>
  <li>1031 exchange buyers moving from residential rentals into commercial or triple-net property.</li>
  <li>Owners whose listing expired without selling.</li>
  <li>Buyers who want a specific street or building and are willing to approach owners who are not listed.</li>
  <li>Coastside owners in <a href="https://halfmoonbayrealestatemarket.com">Half Moon Bay</a>
      and waterfront owners in <a href="https://discoverybaymarket.com">Discovery Bay</a>.</li>
  <li><a href="https://eichlermarket.com">Eichler owners</a> across the Peninsula and South Bay.</li>
  <li>Owners whose home needs work before it can reach its price, who would rather one person ran the renovation and the sale.</li>
</ul>

<h2>Markets and areas served</h2>
<p>Each market has its own site, open to anyone, publishing every home in it rather than the
handful currently for sale. They are the working record behind the pricing advice, and they
are the fastest way to see how well a given street is understood before you call.</p>

<table>
  <caption class="sr-only">Markets operated by McMullen Properties</caption>
  <tbody>${marketRows}</tbody>
</table>

<p>Probate and estate work covers <strong>San Francisco, San Mateo and Santa Clara
counties</strong>. Buyer representation, 1031 exchanges and commercial work run across the
wider Bay Area, including Contra Costa and Alameda counties.</p>

<p>Two further markets on the same platform are run by a partner agent rather than by
Tim:</p>
<ul>${partnerList}</ul>

<h2>The team behind McMullen Properties</h2>

<h3>Tim McMullen, founder and broker</h3>
<p>Tim is a licensed California broker (DRE #02016832) based in Campbell, with more than ten
years in Bay Area real estate and, by his own accounting, over $1B in property represented,
$100M+ closed and a $31M top sale. He was a sales executive on the launch team of San
Francisco&rsquo;s $1.2B Four Seasons Private Residences at 706 Mission Street, where he
negotiated a record $3,000-per-square-foot sale and wrote $18M in contracts in a single week.
He played Division I football at Oregon State University.</p>

<h3>How the company started</h3>
<p>The practice grew out of a frustration with how little of the market an owner can actually
see. Portals show what is listed; the county records show everything, and nobody publishes
them in a form a homeowner can read. The first market site was built to fix that for one
city, and there are now seven: <a href="https://campbellrealestatemarket.com">Campbell</a>,
<a href="https://losgatosrealestatemarket.com">Los Gatos</a>,
<a href="https://saratogarealestatemarket.com">Saratoga</a>,
<a href="https://www.sanfranciscocondomarket.com">San Francisco condominiums</a>,
<a href="https://halfmoonbayrealestatemarket.com">Half Moon Bay</a>,
<a href="https://discoverybaymarket.com">Discovery Bay</a> and the
<a href="https://eichlermarket.com">Eichler tracts</a>.</p>

<h3>Partner agents</h3>
<p>Each market on the platform is run by one licensed agent who knows it. Jake Taylor, of
Simply Sonoma, runs the Penngrove and Petaluma markets in Sonoma County under his own
brokerage, on <a href="https://penngroverealestatemarket.com">The Penngrove Market</a> and
<a href="https://petalumarealestatemarket.com">The Petaluma Market</a>. Tim runs the Santa
Clara County, San Francisco, Half Moon Bay, Discovery Bay and Eichler markets.</p>

<h2>How McMullen Properties works</h2>
<p><strong>Getting in touch.</strong> Email tim@mcmullen.properties, call or text
(415) 691-9272, or ask the assistant on any market site. Messages go to Tim, not to a call
centre, and he answers them himself.</p>
<p><strong>Who you work with.</strong> One broker end to end. For an estate, the attorney and
the CPA are copied on anything they need, and every beneficiary can be sent the same update
on the same day.</p>
<p><strong>Getting started.</strong> A conversation first, then a written analysis of the
property: recorded sales, a range rather than a single number, and what would change it.
Nothing is signed at that stage.</p>
<p><strong>Timing.</strong> A written valuation is typically prepared within a few days of
the property details being available. A disclosure review is turned around while the
contingency period is still open. Listing preparation depends on the work the house needs
and is scheduled with you.</p>

<h2>Key facts</h2>
<table>
  <caption class="sr-only">Key facts about McMullen Properties</caption>
  <tbody>${facts}</tbody>
</table>

<h2>Frequently asked questions</h2>
${faqs}

<p class="note">
McMullen Properties, LLC is not a licensed real estate brokerage. Real estate services are
provided by Tim McMullen, Broker, CA DRE #02016832, through Real Broker. Nothing on this page
is legal, tax or investment advice, and commission rates are negotiable and not set by law.
Last updated September 2026.
</p>

</div>
</body></html>`
}

export async function onRequest() {
  return new Response(page(), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Crawlable and cacheable, but never stale for long: the facts table is
      // the part that dates, and a wrong fact is worse than a slow page.
      'cache-control': 'public, max-age=600, s-maxage=3600',
    },
  })
}

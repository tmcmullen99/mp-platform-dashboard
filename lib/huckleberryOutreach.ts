// Static Top-100 Jackson Hole outreach-target map layer for the gated
// Huckleberry analytics view. Pins are the PRIMARY RESIDENCES of the Top-100
// owners whose wealthy neighbors we are personally emailing. Pre-projected to
// the dashboard's 975x610 Albers canvas (x/y match the existing bubble map).
//
// PRIVACY: this bundle contains owner names + metros + AGGREGATE neighbor-
// outreach counts only. It carries NO recipient email addresses. It must be
// rendered ONLY behind the gated /analytics view (pass showOutreachLayer).

export type OutreachPin = {
  metro: string
  owners: number        // # of Top-100 owners whose primary home is in this metro
  x: number             // pre-projected canvas coords (975x610)
  y: number
  ownerNames: string[]
  topValue: number | null  // highest Jackson property value among them
  neighbors: number     // # of neighbor-recipients emailed into this metro's circles
}

// 78 metros · 100 Top-100 owners.
export const OUTREACH_PINS: OutreachPin[] = [
  {
    "metro": "New York, NY",
    "owners": 4,
    "x": 859.2,
    "y": 188.2,
    "ownerNames": [
      "Nathalie Young",
      "Gregory Shaw",
      "Georgia Bynum",
      "Paul Bebear"
    ],
    "topValue": 9068000,
    "neighbors": 0
  },
  {
    "metro": "Houston, TX",
    "owners": 3,
    "x": 499.9,
    "y": 481.7,
    "ownerNames": [
      "Jordan Doughtie",
      "Jere Overdyke",
      "Susan Carr"
    ],
    "topValue": 13351208,
    "neighbors": 3
  },
  {
    "metro": "Austin, TX",
    "owners": 3,
    "x": 453.4,
    "y": 469.9,
    "ownerNames": [
      "Jeffrey Moore",
      "Naomi Tate",
      "Paul Bell"
    ],
    "topValue": 12973192,
    "neighbors": 8
  },
  {
    "metro": "Charlotte, NC",
    "owners": 3,
    "x": 764.8,
    "y": 334.9,
    "ownerNames": [
      "Mary Stafford",
      "Alannah Nisbet",
      "John Wickham"
    ],
    "topValue": 9802000,
    "neighbors": 8
  },
  {
    "metro": "Dallas, TX",
    "owners": 3,
    "x": 472.4,
    "y": 413.0,
    "ownerNames": [
      "Christine Wagner",
      "William Chaney",
      "Tom Ferry"
    ],
    "topValue": 9758000,
    "neighbors": 0
  },
  {
    "metro": "Fort Lauderdale, FL",
    "owners": 2,
    "x": 812.0,
    "y": 536.8,
    "ownerNames": [
      "Jan Lundberg",
      "Skylar Kronrad"
    ],
    "topValue": 40200365,
    "neighbors": 3
  },
  {
    "metro": "Red Bank, NJ",
    "owners": 2,
    "x": 860.1,
    "y": 196.6,
    "ownerNames": [
      "Victoria Santulli",
      "Richard Santulli"
    ],
    "topValue": 25436267,
    "neighbors": 0
  },
  {
    "metro": "Winnetka, IL",
    "owners": 2,
    "x": 625.5,
    "y": 193.5,
    "ownerNames": [
      "Bethann Moritz",
      "Colin Egerter"
    ],
    "topValue": 21980438,
    "neighbors": 3
  },
  {
    "metro": "Santa Monica, CA",
    "owners": 2,
    "x": 71.6,
    "y": 335.3,
    "ownerNames": [
      "Susan Winfield",
      "Robert Weaver"
    ],
    "topValue": 19162939,
    "neighbors": 4
  },
  {
    "metro": "Norwalk, CT",
    "owners": 2,
    "x": 866.9,
    "y": 176.8,
    "ownerNames": [
      "David Keelan",
      "Wendy Carey"
    ],
    "topValue": 16367235,
    "neighbors": 8
  },
  {
    "metro": "San Francisco, CA",
    "owners": 2,
    "x": 24.3,
    "y": 233.9,
    "ownerNames": [
      "Allison Bhusri",
      "William Hudson"
    ],
    "topValue": 13248897,
    "neighbors": 4
  },
  {
    "metro": "Brookline, MA",
    "owners": 2,
    "x": 897.3,
    "y": 140.4,
    "ownerNames": [
      "Richard Lester",
      "Richard Lester"
    ],
    "topValue": 12585407,
    "neighbors": 8
  },
  {
    "metro": "Palm Beach, FL",
    "owners": 2,
    "x": 811.8,
    "y": 523.5,
    "ownerNames": [
      "Peter Grauer",
      "Arthur Kallop"
    ],
    "topValue": 12344453,
    "neighbors": 4
  },
  {
    "metro": "Nashville, TN",
    "owners": 2,
    "x": 654.5,
    "y": 327.5,
    "ownerNames": [
      "Steven Mason",
      "Philip Bredesen"
    ],
    "topValue": 12269450,
    "neighbors": 8
  },
  {
    "metro": "Spring, TX",
    "owners": 2,
    "x": 498.9,
    "y": 474.5,
    "ownerNames": [
      "Carmen Perez Masuelli",
      "Margaret Mckee"
    ],
    "topValue": 12249941,
    "neighbors": 4
  },
  {
    "metro": "Atlanta, GA",
    "owners": 2,
    "x": 704.4,
    "y": 377.6,
    "ownerNames": [
      "Robin Croft",
      "Herbert Korthoff"
    ],
    "topValue": 9062000,
    "neighbors": 3
  },
  {
    "metro": "Mamaroneck, NY",
    "owners": 1,
    "x": 862.5,
    "y": 181.9,
    "ownerNames": [
      "Giselle Vieira"
    ],
    "topValue": 21925495,
    "neighbors": 0
  },
  {
    "metro": "Old Greenwich, CT",
    "owners": 1,
    "x": 864.8,
    "y": 179.3,
    "ownerNames": [
      "Allan Karp"
    ],
    "topValue": 19186597,
    "neighbors": 4
  },
  {
    "metro": "Chicago, IL",
    "owners": 1,
    "x": 627.7,
    "y": 198.6,
    "ownerNames": [
      "Constantine Mihas"
    ],
    "topValue": 17304937,
    "neighbors": 4
  },
  {
    "metro": "Sewickley, PA",
    "owners": 1,
    "x": 756.6,
    "y": 213.0,
    "ownerNames": [
      "Elaine Park"
    ],
    "topValue": 15544482,
    "neighbors": 4
  },
  {
    "metro": "Sugar Land, TX",
    "owners": 1,
    "x": 494.7,
    "y": 484.9,
    "ownerNames": [
      "Mark Papa"
    ],
    "topValue": 15053821,
    "neighbors": 0
  },
  {
    "metro": "Chapel Hill, NC",
    "owners": 1,
    "x": 794.4,
    "y": 313.9,
    "ownerNames": [
      "Elizabeth Koszalka"
    ],
    "topValue": 13652327,
    "neighbors": 0
  },
  {
    "metro": "Maple Plain, MN",
    "owners": 1,
    "x": 525.0,
    "y": 133.0,
    "ownerNames": [
      "Gregory Page"
    ],
    "topValue": 13551502,
    "neighbors": 0
  },
  {
    "metro": "Armonk, NY",
    "owners": 1,
    "x": 861.8,
    "y": 177.9,
    "ownerNames": [
      "R Parks"
    ],
    "topValue": 12189143,
    "neighbors": 0
  },
  {
    "metro": "Rapid City, SD",
    "owners": 1,
    "x": 370.2,
    "y": 150.0,
    "ownerNames": [
      "Pamela Klein Teuber"
    ],
    "topValue": 12069500,
    "neighbors": 3
  },
  {
    "metro": "New Albany, OH",
    "owners": 1,
    "x": 713.7,
    "y": 230.2,
    "ownerNames": [
      "Philip Derrow"
    ],
    "topValue": 11884038,
    "neighbors": 3
  },
  {
    "metro": "Pasadena, CA",
    "owners": 1,
    "x": 78.6,
    "y": 333.9,
    "ownerNames": [
      "Robert H Smith"
    ],
    "topValue": 11729397,
    "neighbors": 4
  },
  {
    "metro": "Buffalo, NY",
    "owners": 1,
    "x": 769.0,
    "y": 156.3,
    "ownerNames": [
      "Margaret Whistler"
    ],
    "topValue": 11341320,
    "neighbors": 3
  },
  {
    "metro": "Grand Rapids, MI",
    "owners": 1,
    "x": 657.8,
    "y": 170.7,
    "ownerNames": [
      "Virginia Baysore"
    ],
    "topValue": 11305052,
    "neighbors": 0
  },
  {
    "metro": "Riverside, CT",
    "owners": 1,
    "x": 864.5,
    "y": 179.4,
    "ownerNames": [
      "Edward Keller"
    ],
    "topValue": 10280046,
    "neighbors": 4
  },
  {
    "metro": "Lantana, FL",
    "owners": 1,
    "x": 812.0,
    "y": 526.2,
    "ownerNames": [
      "Peter Lamelas"
    ],
    "topValue": 9992387,
    "neighbors": 3
  },
  {
    "metro": "Washington, DC",
    "owners": 1,
    "x": 817.0,
    "y": 240.1,
    "ownerNames": [
      "Elizabeth Galvin"
    ],
    "topValue": 9937000,
    "neighbors": 3
  },
  {
    "metro": "Bedford, NY",
    "owners": 1,
    "x": 862.6,
    "y": 175.9,
    "ownerNames": [
      "William Waterman"
    ],
    "topValue": 9859000,
    "neighbors": 3
  },
  {
    "metro": "Saddle River, NJ",
    "owners": 1,
    "x": 856.0,
    "y": 181.6,
    "ownerNames": [
      "Elizabeth Cerepak"
    ],
    "topValue": 9833000,
    "neighbors": 4
  },
  {
    "metro": "Omaha, NE",
    "owners": 1,
    "x": 487.6,
    "y": 219.0,
    "ownerNames": [
      "Sheri Andrews"
    ],
    "topValue": 9654288,
    "neighbors": 4
  },
  {
    "metro": "Norman, OK",
    "owners": 1,
    "x": 461.1,
    "y": 356.9,
    "ownerNames": [
      "Robert Stoops"
    ],
    "topValue": 9527000,
    "neighbors": 0
  },
  {
    "metro": "Lake Forest, IL",
    "owners": 1,
    "x": 623.4,
    "y": 190.2,
    "ownerNames": [
      "John Babnik"
    ],
    "topValue": 9495000,
    "neighbors": 0
  },
  {
    "metro": "Melville, NY",
    "owners": 1,
    "x": 868.6,
    "y": 184.1,
    "ownerNames": [
      "Christopher Pascucci"
    ],
    "topValue": 9429000,
    "neighbors": 0
  },
  {
    "metro": "Cambridge, MA",
    "owners": 1,
    "x": 897.3,
    "y": 139.5,
    "ownerNames": [
      "Nancy Cole"
    ],
    "topValue": 9328000,
    "neighbors": 4
  },
  {
    "metro": "Miami Beach, FL",
    "owners": 1,
    "x": 813.4,
    "y": 544.2,
    "ownerNames": [
      "David Kim"
    ],
    "topValue": 9315000,
    "neighbors": 3
  },
  {
    "metro": "Indianapolis, IN",
    "owners": 1,
    "x": 657.3,
    "y": 244.2,
    "ownerNames": [
      "David Ricks"
    ],
    "topValue": 9274000,
    "neighbors": 3
  },
  {
    "metro": "Inverness, IL",
    "owners": 1,
    "x": 619.5,
    "y": 193.8,
    "ownerNames": [
      "Richard Remick"
    ],
    "topValue": 9268000,
    "neighbors": 0
  },
  {
    "metro": "Orinda, CA",
    "owners": 1,
    "x": 29.0,
    "y": 232.8,
    "ownerNames": [
      "Kirsten Peck"
    ],
    "topValue": 9128000,
    "neighbors": 0
  },
  {
    "metro": "Arrington, TN",
    "owners": 1,
    "x": 657.3,
    "y": 334.6,
    "ownerNames": [
      "Elaine Ozburn"
    ],
    "topValue": 9074000,
    "neighbors": 0
  },
  {
    "metro": "Ponte Vedra Beach, FL",
    "owners": 1,
    "x": 772.4,
    "y": 448.9,
    "ownerNames": [
      "Lori Moffett"
    ],
    "topValue": 8980000,
    "neighbors": 0
  },
  {
    "metro": "Dedham, MA",
    "owners": 1,
    "x": 897.1,
    "y": 142.6,
    "ownerNames": [
      "James Atwood"
    ],
    "topValue": 8864000,
    "neighbors": 0
  },
  {
    "metro": "Osprey, FL",
    "owners": 1,
    "x": 760.8,
    "y": 520.3,
    "ownerNames": [
      "Wendy Weiss"
    ],
    "topValue": 8785000,
    "neighbors": 0
  },
  {
    "metro": "Naples, FL",
    "owners": 1,
    "x": 778.3,
    "y": 541.8,
    "ownerNames": [
      "Kathleen Boer"
    ],
    "topValue": 8750000,
    "neighbors": 0
  },
  {
    "metro": "South Pasadena, CA",
    "owners": 1,
    "x": 78.3,
    "y": 334.6,
    "ownerNames": [
      "Ann Messana"
    ],
    "topValue": 8705000,
    "neighbors": 0
  },
  {
    "metro": "Manchester, MA",
    "owners": 1,
    "x": 901.5,
    "y": 133.5,
    "ownerNames": [
      "Megan Clark"
    ],
    "topValue": 8649000,
    "neighbors": 0
  },
  {
    "metro": "Morristown, NJ",
    "owners": 1,
    "x": 850.9,
    "y": 188.2,
    "ownerNames": [
      "Gerald Scully"
    ],
    "topValue": 8572000,
    "neighbors": 0
  },
  {
    "metro": "Lighthouse Point, FL",
    "owners": 1,
    "x": 812.4,
    "y": 533.3,
    "ownerNames": [
      "Anjali Noble"
    ],
    "topValue": 8542000,
    "neighbors": 0
  },
  {
    "metro": "Bentonville, AR",
    "owners": 1,
    "x": 519.9,
    "y": 330.5,
    "ownerNames": [
      "Ruth Glass"
    ],
    "topValue": 8376000,
    "neighbors": 0
  },
  {
    "metro": "Bethesda, MD",
    "owners": 1,
    "x": 815.6,
    "y": 238.3,
    "ownerNames": [
      "Ann Cornell"
    ],
    "topValue": 8326000,
    "neighbors": 0
  },
  {
    "metro": "Salt Lake City, UT",
    "owners": 1,
    "x": 218.0,
    "y": 207.7,
    "ownerNames": [
      "Robert Fotheringham"
    ],
    "topValue": 8325000,
    "neighbors": 0
  },
  {
    "metro": "White Plains, NY",
    "owners": 1,
    "x": 861.5,
    "y": 180.1,
    "ownerNames": [
      "Valerie Stone"
    ],
    "topValue": 8299000,
    "neighbors": 0
  },
  {
    "metro": "Libertyville, IL",
    "owners": 1,
    "x": 621.5,
    "y": 189.8,
    "ownerNames": [
      "Markelle Rule"
    ],
    "topValue": 8246000,
    "neighbors": 0
  },
  {
    "metro": "Los Altos, CA",
    "owners": 1,
    "x": 27.1,
    "y": 244.0,
    "ownerNames": [
      "Dolores Boyd"
    ],
    "topValue": 8160000,
    "neighbors": 0
  },
  {
    "metro": "Memphis, TN",
    "owners": 1,
    "x": 596.9,
    "y": 355.4,
    "ownerNames": [
      "David Bowlin"
    ],
    "topValue": 8148000,
    "neighbors": 0
  },
  {
    "metro": "Pound Ridge, NY",
    "owners": 1,
    "x": 863.7,
    "y": 175.5,
    "ownerNames": [
      "Sarah Markowitz"
    ],
    "topValue": 7929000,
    "neighbors": 0
  },
  {
    "metro": "Pittsburgh, PA",
    "owners": 1,
    "x": 760.2,
    "y": 214.6,
    "ownerNames": [
      "Norman Wolff"
    ],
    "topValue": 7756000,
    "neighbors": 0
  },
  {
    "metro": "Towson, MD",
    "owners": 1,
    "x": 822.1,
    "y": 227.2,
    "ownerNames": [
      "Mark Weinman"
    ],
    "topValue": 7734000,
    "neighbors": 0
  },
  {
    "metro": "Rancho Mirage, CA",
    "owners": 1,
    "x": 108.1,
    "y": 350.2,
    "ownerNames": [
      "Tanya Heathman"
    ],
    "topValue": 7732000,
    "neighbors": 0
  },
  {
    "metro": "Potomac, MD",
    "owners": 1,
    "x": 813.5,
    "y": 237.9,
    "ownerNames": [
      "Durke Thompson"
    ],
    "topValue": 7713000,
    "neighbors": 0
  },
  {
    "metro": "Rhinebeck, NY",
    "owners": 1,
    "x": 854.4,
    "y": 160.8,
    "ownerNames": [
      "Helen Vandervoort"
    ],
    "topValue": 7673000,
    "neighbors": 0
  },
  {
    "metro": "Los Angeles, CA",
    "owners": 1,
    "x": 76.3,
    "y": 335.6,
    "ownerNames": [
      "Linda Pennell"
    ],
    "topValue": 7646000,
    "neighbors": 0
  },
  {
    "metro": "Mequon, WI",
    "owners": 1,
    "x": 619.6,
    "y": 168.5,
    "ownerNames": [
      "Scott Schroeder"
    ],
    "topValue": 7645000,
    "neighbors": 0
  },
  {
    "metro": "Villanova, PA",
    "owners": 1,
    "x": 840.3,
    "y": 208.4,
    "ownerNames": [
      "Lynda Hitschler"
    ],
    "topValue": 7644000,
    "neighbors": 0
  },
  {
    "metro": "Sandy Springs, GA",
    "owners": 1,
    "x": 704.1,
    "y": 373.6,
    "ownerNames": [
      "Jennifer Hayes"
    ],
    "topValue": 7430000,
    "neighbors": 0
  },
  {
    "metro": "Darien, CT",
    "owners": 1,
    "x": 866.1,
    "y": 177.9,
    "ownerNames": [
      "Meredith George"
    ],
    "topValue": 7427000,
    "neighbors": 0
  },
  {
    "metro": "Santa Fe, NM",
    "owners": 1,
    "x": 306.3,
    "y": 337.0,
    "ownerNames": [
      "Benjamin Krieger"
    ],
    "topValue": 7328000,
    "neighbors": 0
  },
  {
    "metro": "Greenwich, CT",
    "owners": 1,
    "x": 863.8,
    "y": 179.7,
    "ownerNames": [
      "Marta Kasjaniuk"
    ],
    "topValue": 7063000,
    "neighbors": 0
  },
  {
    "metro": "Brimfield, IL",
    "owners": 1,
    "x": 591.5,
    "y": 225.3,
    "ownerNames": [
      "Royal Coulter"
    ],
    "topValue": 7010000,
    "neighbors": 0
  },
  {
    "metro": "North Palm Beach, FL",
    "owners": 1,
    "x": 811.0,
    "y": 521.1,
    "ownerNames": [
      "Peter Wilby"
    ],
    "topValue": 6942000,
    "neighbors": 0
  },
  {
    "metro": "Brooklyn, NY",
    "owners": 1,
    "x": 860.4,
    "y": 188.7,
    "ownerNames": [
      "Hope Dana"
    ],
    "topValue": 6827000,
    "neighbors": 0
  },
  {
    "metro": "Lincoln, NE",
    "owners": 1,
    "x": 476.0,
    "y": 229.2,
    "ownerNames": [
      "Thomas Smith"
    ],
    "topValue": 6787000,
    "neighbors": 0
  },
  {
    "metro": "Santa Barbara, CA",
    "owners": 1,
    "x": 52.0,
    "y": 320.9,
    "ownerNames": [
      "Haley Bernstein"
    ],
    "topValue": 6715000,
    "neighbors": 0
  },
  {
    "metro": "Saint Petersburg, FL",
    "owners": 1,
    "x": 756.0,
    "y": 508.0,
    "ownerNames": [
      "Richard Atkin"
    ],
    "topValue": 6641000,
    "neighbors": 0
  }
]

// Campaign rollups derived from the crosswalk (aggregates only).
export const OUTREACH_TOTALS = { neighborsTargeted: 124, ownerCirclesTouched: 34, metros: 78 } as const

// Store recipes: how to find the promo code box on each store's checkout page.
// Add a new store by copying one of these blocks and filling in the selectors.
//
// To find selectors: open the store's checkout, right-click the promo code box,
// choose "Inspect", then copy the id or class from the highlighted element.

const CLOVER_RECIPES = [
  {
    id: "example-shop",
    name: "Example Shop",
    matches: ["example.com"],
    codeInput: "#promo-code, input[name='promoCode'], input[name='discount']",
    applyButton: "#apply-promo, button[type='submit'].promo",
    total: ".order-total, #cart-total"
  },
  {
    id: "homedepot",
    name: "Home Depot",
    matches: ["homedepot.com"],
    codeInput: "input[name*='promo' i], input[id*='promo' i], input[placeholder*='promo' i]",
    applyButton: "button[class*='promo' i], button[data-testid*='promo' i]",
    total: "[data-testid*='total' i], [class*='order-total' i], [class*='total' i]"
  },
  {
    id: "generic",
    name: "This store",
    matches: ["*"],
    // Generic fallback: guesses based on common naming across most stores.
    codeInput: [
      // English
      "input[name*='promo' i]", "input[id*='promo' i]", "input[placeholder*='promo' i]", "input[aria-label*='promo' i]",
      "input[name*='coupon' i]", "input[id*='coupon' i]", "input[placeholder*='coupon' i]", "input[aria-label*='coupon' i]",
      "input[name*='discount' i]", "input[id*='discount' i]", "input[placeholder*='discount' i]", "input[aria-label*='discount' i]",
      "input[name*='voucher' i]", "input[id*='voucher' i]", "input[placeholder*='voucher' i]",
      // German
      "input[name*='gutschein' i]", "input[id*='gutschein' i]", "input[placeholder*='gutschein' i]", "input[aria-label*='gutschein' i]",
      "input[name*='rabatt' i]", "input[id*='rabatt' i]", "input[placeholder*='rabatt' i]",
      "input[name*='aktionscode' i]", "input[placeholder*='aktionscode' i]",
      // Dutch / French / Spanish / Italian
      "input[name*='kortingscode' i]", "input[placeholder*='kortingscode' i]",
      "input[name*='cupon' i]", "input[placeholder*='cupon' i]", "input[placeholder*='cupón' i]",
      "input[name*='reduction' i]", "input[placeholder*='promotionnel' i]",
      "input[name*='sconto' i]", "input[placeholder*='sconto' i]",
      // last, broad: a field that just says "code"
      "input[placeholder*='code' i]", "input[aria-label*='code' i]"
    ].join(", "),
    applyButton: [
      "button[id*='promo' i]", "button[id*='coupon' i]", "button[id*='apply' i]",
      "button[class*='promo' i]", "button[class*='coupon' i]", "button[class*='apply' i]",
      "button[class*='gutschein' i]", "button[class*='rabatt' i]",
      "button[class*='einlosen' i]", "button[class*='anwenden' i]"
    ].join(", "),
    // Note: content.js also finds the apply button by its visible text
    // ("Apply", "Einlösen", "Anwenden", "Appliquer"...) so most stores work
    // even when the button has no promo/coupon in its id or class.
    total: [
      "[class*='total' i]",
      "[id*='total' i]"
    ].join(", ")
  }
];

// Codes Clover knows about, per store.
// Evergreen entries are programs that stay valid for months, not scraped codes.
const CLOVER_CODES = {
  "asus.com": [
    "MEWC15",
    "WEEKENDER30",
    "APCLOVE26",
    "NS4529",
    "TWITCHCON2025"
  ],
  "amazon.nl": [
    "CHARITY20OFF",
    "TUISTESAVE10",
    "JB9MSKBZ",
    "U788AYRA",
    "26FP3PXP"
  ],
  "nike.com": [
    "NIKEHS25",
    "DAYONE",
    "VIAUNIDAYS",
    "71930629",
    "92053222"
  ],
  "ikea.com": [
    "IKEAFAMILY25",
    "SITESAVE15",
    "FAMILY2M",
    "IKEA2605ANIV",
    "WINTERWEEKEND",
    "56P10NS2T3WJJM1J"
  ],
  "aliexpress.com": [
    "012NEWUSOFF",
    "005NEWUSOFF",
    "003NEWUSOFF",
    "NEWUSOFF5",
    "MYDEIO24"
  ],
  "bambulab.com": [
    "7VHD7LN2RNOU",
    "WV1ZXFF6F9HS",
    "SLDID45SSZWI",
    "PUXFB3YJGFKL",
    "SFHMVUVEZSZ8"
  ],
  "prusa3d.com": [
    "CARLOS3D",
    "LTT",
    "TOMSHARDWARE",
    "SamPrentice",
    "3DMusketeers"
  ],
  "rayconglobal.com": [
    "SUNNY",
    "gift15",
    "TD20",
    "TMF15"
  ],
  "decathlon.nl": [
    "WHOLEU20",
    "STRAVA20",
    "HJRKNPVR",
    "Q8QR8D7Z",
    "DNMSQMSK"
  ],
  "elegoo.com": [
    "DEMAND20F",
    "IME20",
    "Demand15f",
    "IME15",
    "DEMAND10F",
    "IME10",
    "EA_10OFF100",
    "DEMAND4F",
    "IME4OFF"
  ],
  "nespresso.com": [
    "PICNIC2026",
    "LAWN2026",
    "TOTE2026",
    "PICNIC26",
    "LAWN26"
  ],
  "hp.com": [
    "SUMMERDEAL25",
    "BACK2SCHOOL25",
    "10ATTACH",
    "ultra600",
    "HPDD6QDUA122"
  ],
  "meta.com": [
    "DAVIDDEAL"
  ],
  "homedepot.com": [
    "ELECTROLUX20",
    "YORK15OFF",
    "REFRESH15",
    "CKNIGHT10",
    "7MD4H2YQ2"
  ],
  "incogni.com": [
    "SCIENCE"
  ],
  "squarespace.com": [
    "CORRIDOR"
  ],
  "xiaomi.com": [
    "16YEARS",
    "17TATO",
    "24XIAOMIWEEK",
    "FUTURE10",
    "XIAOMI17",
    "15APP2025",
    "XIAOMI",
    "BIENVENIDO2026",
    "50X65G"
  ],
  "mcdonalds.com": [
    "REGALO35",
    "PAPITAS",
    "SPACEJAM",
    "FREEMCAD",
    "MYMCDONALDS",
    "GLOVOAFILIZA",
    "WELCOME",
    "MCDEAL15",
    "MCDS2024",
    "MCDS2022",
    "MCDS2021",
    "TRYMCD",
    "QUARTER",
    "SCORE",
    "SAVE100"
  ],
  "subway.com": [
    "FLBOGO",
    "20OFFBOWL",
    "3SUBS",
    "FL799",
    "TWENTYOFF",
    "6INCH199",
    "FL1299",
    "699FL",
    "246MEATIER",
    "BRISKET1299",
    "SNACKRING",
    "2626PROMO"
  ],
  "topps.com": [
    "4JOSHD",
    "EMPLOYEE25",
    "SWASAVE20",
    "TOPPSBR15",
    "SASQUATCH",
    "GBW10",
    "THANKS",
    "XKVSX7FVUMQH",
    "15EIJ8UBPL17",
    "8MB9O7D4LXX7",
    "24F9S03O075WHT",
    "XF2YVEZ90Q7D",
    "Y5RXD9DW0MUN"
  ],
  "fanatics.com": [
    "TEES25",
    "25TEES",
    "4HGCPVZ6RL",
    "39SHIP",
    "JULY26",
    "25HATS",
    "CAPONEXPAZE",
    "PADDLE",
    "25SAVE",
    "OCEAN",
    "SHELL",
    "NIKE20",
    "20TEES",
    "MAMA",
    "TULIP",
    "MGP25",
    "MEMORIAL25",
    "SHIP99",
    "4HGCPVZ6RLV25"
  ],
  "ebay.com": [
    "JULYGRAIL",
    "LOGILAUNCH25",
    "LOWDERJULY26",
    "REFURBLOVE",
    "FAVELUXE15",
    "SUMMERDRIVE10",
    "FASHUPFEB20",
    "BB20SIGNATURE",
    "STYLEREFRESH",
    "FRESHLUXURY",
    "SUNSHINE20"
  ],
  "temu.com": [
    "ACW274625",
    "ACV671336",
    "ALJ305213",
    "ALB169449",
    "ALH040402",
    "ACY337016",
    "ALG007115",
    "FRE271944",
    "ACV721913"
  ],
  "godaddy.com": [
    "CJCFOSSIG3",
    "GDBB1901N",
    "GDWELCOME",
    "CJCOYBO25",
    "DISCOUNTCODE",
    "PSREDEEM",
    "NEW24",
    "INDYOYBO25",
    "SFACR1"
  ],
  "wordpress.com": [
    "DEC2025",
    "WP30XH9K"
  ],
  "etsy.com": [
    "HOARDLIZARD25",
    "BLUESKY",
    "EARLYWEEN",
    "MWA20",
    "BABYCOMEBACK2",
    "GOSHWOW25OFF",
    "GRANDOPEN20",
    "NICKURSIAK",
    "BLUESKY15",
    "THUNDERSTORM",
    "MELVYCART5",
    "5ETSYVERSARY",
    "FIRST5"
  ],
  "macys.com": [
    "ZXTZZPWFBNH5",
    "APPONLY20",
    "FRLEND",
    "ZRMMCSDXNGG6",
    "POP35",
    "GET35",
    "APPFINDS",
    "SIDUSS",
    "SGHSPRING2026",
    "PANDORA25"
  ],
  "kohls.com": [
    "CATCH15OFF",
    "BUYMINIS",
    "SHOP40",
    "HOME15",
    "INSTANT10"
  ],
  "get.store": [
    "STICKS2025",
    "yikes2026"
  ],
  "boot.dev": [
    "TRANIUM"
  ],
  "walmart.com": [
    "INHOMEDEVICE",
    "TODAY10",
    "MAKEUP",
    "PDV3CG49",
    "CLIP$4OFF2COUPON",
    "THANKFUL",
    "DOUBLE10",
    "EXPRESS",
    "SICKTRIP",
    "POTION25"
  ],
  "target.com": [
    "IHEARTDOGS20",
    "RIMMELLIP15",
    "SCHOOL",
    "BALANCER15",
    "FREETOJOIN",
    "10DAYSUSA"
  ],
  "melscience.com": [
    "ACTIONLAB"
  ],
  "anycubic.com": [
    "DWsave20",
    "WHERENERDYISCOOL",
    "25ANYCUBIC",
    "ACSUN20"
  ]
};

const CLOVER_EVERGREEN = [
  { store: "Nike", label: "Student discount", detail: "Verify through SheerID", pct: "10%" },
  { store: "Nike", label: "Military & first responder", detail: "Verify through SheerID", pct: "10%" },
  { store: "Nike", label: "Teacher & school staff", detail: "Verify through SheerID", pct: "10%" },
  { store: "Nike", label: "Birthday offer", detail: "Members get it by email", pct: "10%" }
];

// Creator deals: offers that live behind a creator's link rather than a code.
// Clover only ever tells you one exists and lets you choose. It never
// redirects you, and it stays quiet if you already arrived through
// somebody's referral link, because that credit is already theirs.
const CLOVER_CREATOR_DEALS = [
  {
    store: "squarespace.com",
    creator: "Corridor Crew",
    deal: "10% off your first purchase",
    kind: "link",
    value: "https://www.squarespace.com/?channel=youtube&subchannel=corridor&source=samandniko"
  },
  {
    store: "incogni.com",
    creator: "Steve Mould",
    deal: "60% off an annual plan",
    kind: "link",
    value: "https://incogni.com/science",
    code: "SCIENCE"
  },
  {
    store: "meta.com",
    creator: "David",
    deal: "10% off any game, headset purchases included",
    kind: "code",
    value: "DAVIDDEAL"
  },
  {
    store: "get.store",
    creator: "Yikes",
    deal: "Discount on a .store domain",
    kind: "link",
    value: "https://go.store/yikes26",
    code: "yikes2026"
  },
  {
    store: "prusa3d.com",
    creator: "Tom's Hardware",
    deal: "Discount on filament and accessories",
    kind: "code",
    value: "TOMSHARDWARE"
  },
  {
    store: "prusa3d.com",
    creator: "Linus Tech Tips",
    deal: "Discount on select ranges",
    kind: "code",
    value: "LTT"
  },
  {
    store: "prusa3d.com",
    creator: "3D Musketeers",
    deal: "Creator discount",
    kind: "code",
    value: "3DMusketeers"
  }
];

// Query keys that mean somebody already referred this visit.
const REFERRAL_KEYS = [
  "tag","ref","referrer","aff","affiliate","affid","partner",
  "utm_source","utm_medium","utm_campaign","irclickid","clickid",
  "cjevent","sscid","ranMID","awc","gclid"
];

if (typeof window !== "undefined") {
  window.CLOVER_CREATOR_DEALS = CLOVER_CREATOR_DEALS;
  window.REFERRAL_KEYS = REFERRAL_KEYS;
}

if (typeof window !== "undefined") {
  window.CLOVER_RECIPES = CLOVER_RECIPES;
  window.CLOVER_CODES = CLOVER_CODES;
  window.CLOVER_EVERGREEN = CLOVER_EVERGREEN;
}

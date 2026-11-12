/* Clover data. Edited by hand; rules in CLOVER-PROJECT.md: verified = a person tested it, two-week freshness, no impossible claims. */

const CATS = {
  other:"Other", fashion:"Fashion", tech:"Tech and gaming",
  food:"Food and delivery", home:"Home and furniture",
  beauty:"Beauty", hobby:"Hobby and making", travel:"Travel"
};


const COUNTRIES = {
  XX:"Anywhere", NL:"Netherlands", DE:"Germany", EU:"EU wide",
  UK:"United Kingdom", US:"United States", FR:"France"
};


const EVERGREEN = [
  {group:"Student platforms", store:"UNiDAYS", label:"Free student discount network",
   detail:"Verify once with a university email or student ID. Covers Adidas, Apple, ASOS, IKEA, Nike, Ray-Ban and more across Europe. Strongest for tech and premium brands.", pct:"varies"},
  {group:"Student platforms", store:"Student Beans", label:"Free student discount network",
   detail:"Verify with a university email or a photo of your student ID, takes about two minutes. Strongest for fashion, food and lifestyle. Works from age 16 up.", pct:"varies"},
  {group:"Student platforms", store:"Both at once", label:"The actual pro move",
   detail:"The two platforms only partly overlap on brands, so a discount missing from one is often sitting on the other. Both are free, so there is no reason to pick.", pct:"stack"},

  {group:"Verify once, use all year", store:"Nike", label:"Student, teacher, military, first responder",
   detail:"Verified through SheerID. Students aged 16 and up, school staff, medical professionals and military all qualify. Needs a free Nike membership.", pct:"10%"},
  {group:"Verify once, use all year", store:"Nike", label:"Birthday offer",
   detail:"Members get a code by email during their birthday month. Applies to select styles.", pct:"10%"},
  {group:"Verify once, use all year", store:"ASOS", label:"Student discount",
   detail:"Listed through UNiDAYS with free delivery attached. Student Beans sometimes runs a bigger flash rate without the free delivery, so compare before you buy.", pct:"10-15%"},

  {group:"No verification needed", store:"Most stores", label:"Newsletter signup",
   detail:"Signing up for a store's email list usually triggers a first-order code within minutes. Free, instant, and it works on stores too small for any coupon site.", pct:"10-15%"},
  {group:"No verification needed", store:"Most stores", label:"Abandoned cart",
   detail:"Fill a cart while logged in, then leave it. Many stores email a code within a day or two to pull you back.", pct:"5-15%"},
];


const EVER_NAMED = ["UNiDAYS","Student Beans","Nike","ASOS"];

const DEALS = [
  {store:"squarespace.com", creator:"Corridor Crew", deal:"10% off your first purchase",
   kind:"link", value:"https://www.squarespace.com/?channel=youtube&subchannel=corridor&source=samandniko"},
  {store:"incogni.com", creator:"Steve Mould", deal:"60% off an annual plan",
   kind:"link", value:"https://incogni.com/science", code:"SCIENCE"},
  {store:"meta.com", creator:"David", deal:"10% off any game on the Quest store, headset purchases included",
   kind:"code", value:"DAVIDDEAL"},
  {store:"meta.com", creator:"David Duggan", deal:"Quest 3S with 30 dollars of free store credit",
   kind:"link", value:"https://www.meta.com/affiliates/97xpz3cqX"},
  {store:"meta.com", creator:"David Duggan", deal:"10 percent off, I am Cat VR",
   kind:"link", value:"https://www.meta.com/affiliates/8Xx2vh1Xr"},
  {store:"get.store", creator:"Yikes", deal:"Discount on a .store domain",
   kind:"link", value:"https://go.store/yikes26", code:"yikes2026"},
  {store:"get.store", creator:"Sticks", deal:"Discount on a .store domain, tested and working despite the 2025 name",
   kind:"link", value:"https://go.store/sticks", code:"STICKS2025"},
  {store:"boot.dev", creator:"Tranium", deal:"25% off your first payment",
   kind:"code", value:"TRANIUM"},
  {store:"melscience.com", creator:"The Action Lab", deal:"50% off science kits",
   kind:"code", value:"ACTIONLAB"},
  {store:"prusa3d.com", creator:"Tom's Hardware", deal:"Discount on filament and accessories", kind:"code", value:"TOMSHARDWARE"},
  {store:"prusa3d.com", creator:"Linus Tech Tips", deal:"Discount on select ranges", kind:"code", value:"LTT"},
  {store:"prusa3d.com", creator:"3D Musketeers", deal:"Creator discount", kind:"code", value:"3DMusketeers"},
  {store:"prusa3d.com", creator:"Carlos", deal:"Creator discount", kind:"code", value:"CARLOS3D"},
  {store:"prusa3d.com", creator:"Sam Prentice", deal:"Creator discount", kind:"code", value:"SamPrentice"},
  {store:"anycubic.com", creator:"DW", deal:"20 dollars off an Anycubic printer, tested and working", kind:"code", value:"DWsave20"},
  {store:"anycubic.com", creator:"Where Nerdy is Cool", deal:"15 dollars off the Kobra X, tested and working", kind:"code", value:"WHERENERDYISCOOL"},
];


const RIVALS = ["Simply<br>Codes", "Honey", "Capital One<br>Shopping", "Retail<br>MeNot", "Coupert"];

const COMPARE = [
  {feat:"Shows how often each code worked",
   note:"The share of people it worked for, not a badge somebody assigned",
   us:"yes", marks:["partly","no","no","no","no"]},
  {feat:"Dead codes retire themselves",
   note:"Enough failures and it hides, so the list does not rot",
   us:"yes", marks:["no","no","no","no","no"]},
  {feat:"Codes visible without clicking",
   note:"No Get Code button that opens a tab to reveal it",
   us:"yes", marks:["no","no","no","no","no"]},
  {feat:"Restrictions written on the card",
   note:"Minimum spend, first order only, members only",
   us:"yes", marks:["yes","no","partly","partly","no"]},
  {feat:"Leaves creator links alone",
   note:"Nobody else's credit gets overwritten",
   us:"yes", marks:["partly","no","no","partly","no"]},
  {feat:"Codes rechecked every day",
   note:"Machines retest them. Clover waits for a person, which is slower",
   us:"no", marks:["yes","yes","yes","partly","yes"]},
  {feat:"Tells you if the price is actually good",
   note:"Price history, so a fake sale is obvious. Clover has none of this",
   us:"no", marks:["partly","yes","yes","no","partly"]},
  {feat:"Fills the code in at most shops",
   note:"Clover knows a handful properly and guesses at the rest",
   us:"partly", marks:["partly","yes","yes","no","yes"]},
  {feat:"Covers thousands of shops",
   note:"Clover has what people have entered, which is not thousands",
   us:"no", marks:["yes","yes","yes","yes","yes"]},
];


/* The starter codes. verified:true = Peter put it in a real cart (testedOn = the day). failed / failedTwice = tried and did not work. single = explicit one-use answer. */

const SEED = [
  // Asus
  {store:"asus.com", code:"MEWC15", note:"15% off, campaign style code", limits:"", cat:"tech", country:"XX"},
  {store:"asus.com", code:"TWITCHCON2025", note:"TwitchCon event code", limits:"Tied to a 2025 event, likely expired", cat:"tech", country:"XX"},
  {store:"asus.com", code:"NS4529", note:"Discount amount unknown", limits:"Short code, may be single use", cat:"tech", country:"XX"},
  {store:"asus.com", code:"APCLOVE26", note:"2026 campaign code", limits:"", cat:"tech", country:"XX"},
  {store:"asus.com", code:"WEEKENDER30", note:"30% off weekend promo", limits:"May only run on weekends", cat:"tech", country:"XX"},

  // Amazon
  {store:"amazon.nl", code:"CHARITY20OFF", note:"20% off charity promotion", limits:"Likely limited to select items", cat:"other", country:"NL"},
  {store:"amazon.nl", code:"TUISTESAVE10", note:"10% off site promo", limits:"", cat:"other", country:"NL"},
  {store:"amazon.nl", code:"JB9MSKBZ", note:"Discount amount unknown", limits:"Random string, probably issued to one account", cat:"other", country:"NL"},
  {store:"amazon.nl", code:"U788AYRA", note:"Discount amount unknown", limits:"Random string, probably single use", cat:"other", country:"NL"},
  {store:"amazon.nl", code:"26FP3PXP", note:"Discount amount unknown", limits:"Random string, probably single use", cat:"other", country:"NL"},

  // Nike
  {store:"nike.com", code:"NIKEHS25", note:"Back to school style promo", limits:"", cat:"fashion", country:"XX"},
  {store:"nike.com", code:"DAYONE", note:"Member welcome code", limits:"Confirmed working. Usually needs a Nike account", cat:"fashion", country:"XX", verified:true, testedOn:"2026-07-24"},
  {store:"nike.com", code:"VIAUNIDAYS", note:"Student rate routed through UNiDAYS", limits:"Needs a verified UNiDAYS account linked", cat:"fashion", country:"EU"},
  {store:"nike.com", code:"71930629", note:"Discount amount unknown", limits:"Numeric code, likely issued to one order", cat:"fashion", country:"XX"},
  {store:"nike.com", code:"92053222", note:"Discount amount unknown", limits:"Numeric code, likely issued to one order", cat:"fashion", country:"XX"},

  // IKEA
  {store:"ikea.com", code:"IKEAFAMILY25", note:"25% off for Family members", limits:"Needs a free IKEA Family membership", cat:"home", country:"EU"},
  {store:"ikea.com", code:"FAMILY2M", note:"Family member promo", limits:"Needs IKEA Family", cat:"home", country:"EU"},
  {store:"ikea.com", code:"SITESAVE15", note:"15% off sitewide", limits:"", cat:"home", country:"EU"},
  {store:"ikea.com", code:"IKEA2605ANIV", note:"Anniversary promo", limits:"Dated campaign, likely expired", cat:"home", country:"EU"},
  {store:"ikea.com", code:"WINTERWEEKEND", note:"Weekend promo, still live despite the name", limits:"Works year round, not just winter", cat:"home", country:"EU", verified:true, testedOn:"2026-07-24"},
  {store:"ikea.com", code:"56P10NS2T3WJJM1J", note:"Discount amount unknown", limits:"Long random string, almost certainly single use", cat:"home", country:"EU"},

  // AliExpress
  {store:"aliexpress.com", code:"012NEWUSOFF", note:"New user discount, larger tier", limits:"First order only, new accounts", cat:"other", country:"XX"},
  {store:"aliexpress.com", code:"005NEWUSOFF", note:"New user discount, middle tier", limits:"First order only, new accounts", cat:"other", country:"XX"},
  {store:"aliexpress.com", code:"003NEWUSOFF", note:"New user discount, small tier", limits:"First order only, new accounts", cat:"other", country:"XX"},
  {store:"aliexpress.com", code:"NEWUSOFF5", note:"New user discount", limits:"First order only, new accounts", cat:"other", country:"XX"},
  {store:"aliexpress.com", code:"MYDEIO24", note:"Discount amount unknown", limits:"", cat:"other", country:"XX"},

  // Bambu Lab
  {store:"bambulab.com", code:"7VHD7LN2RNOU", note:"Discount amount unknown", limits:"Random string, looks like a personal referral code", cat:"hobby", country:"XX"},
  {store:"bambulab.com", code:"WV1ZXFF6F9HS", note:"Discount amount unknown", limits:"Random string, likely one use per account", cat:"hobby", country:"XX"},
  {store:"bambulab.com", code:"SLDID45SSZWI", note:"Discount amount unknown", limits:"Random string, likely referral", cat:"hobby", country:"XX"},
  {store:"bambulab.com", code:"PUXFB3YJGFKL", note:"Discount amount unknown", limits:"Random string, likely referral", cat:"hobby", country:"XX"},
  {store:"bambulab.com", code:"SFHMVUVEZSZ8", note:"Discount amount unknown", limits:"Random string, likely referral", cat:"hobby", country:"XX"},

  // Prusa
  {store:"prusa3d.com", code:"CARLOS3D", note:"Creator code", limits:"Creator codes often apply to filament or select items only", cat:"hobby", country:"EU"},
  {store:"prusa3d.com", code:"LTT", note:"Linus Tech Tips creator code", limits:"May be region limited", cat:"hobby", country:"EU"},
  {store:"prusa3d.com", code:"TOMSHARDWARE", note:"Tom's Hardware creator code", limits:"", cat:"hobby", country:"EU"},
  {store:"prusa3d.com", code:"SamPrentice", note:"Creator code, note the mixed case", limits:"Enter exactly as written, case may matter", cat:"hobby", country:"EU"},
  {store:"prusa3d.com", code:"3DMusketeers", note:"Creator code, mixed case", limits:"Enter exactly as written", cat:"hobby", country:"EU"},

  // Raycon
  {store:"rayconglobal.com", code:"SUNNY", note:"20% off", limits:"Confirmed working. Not advertised on the site", cat:"tech", country:"XX", verified:true, testedOn:"2026-07-24"},
  {store:"rayconglobal.com", code:"gift15", note:"15% off gift promo", limits:"Lowercase as written", cat:"tech", country:"XX"},
  {store:"rayconglobal.com", code:"TD20", note:"20% off", limits:"", cat:"tech", country:"XX"},
  {store:"rayconglobal.com", code:"TMF15", note:"15% off creator code", limits:"", cat:"tech", country:"XX"},

  // Decathlon
  {store:"decathlon.nl", code:"WHOLEU20", note:"20% off promo", limits:"", cat:"other", country:"NL"},
  {store:"decathlon.nl", code:"STRAVA20", note:"20% off via Strava partnership", limits:"May need a linked Strava account", cat:"other", country:"NL"},
  {store:"decathlon.nl", code:"HJRKNPVR", note:"Discount amount unknown", limits:"Random string, likely single use", cat:"other", country:"NL"},
  {store:"decathlon.nl", code:"Q8QR8D7Z", note:"Discount amount unknown", limits:"Random string, likely single use", cat:"other", country:"NL"},
  {store:"decathlon.nl", code:"DNMSQMSK", note:"Discount amount unknown", limits:"Random string, likely single use", cat:"other", country:"NL"},

  // Elegoo
  {store:"elegoo.com", code:"DEMAND20F", note:"20% off, best of the DEMAND family", limits:"May need a minimum spend", cat:"hobby", country:"XX"},
  {store:"elegoo.com", code:"IME20", note:"20 dollars off", limits:"Confirmed working, a flat amount rather than a percentage", cat:"hobby", country:"XX", verified:true, testedOn:"2026-07-25"},
  {store:"elegoo.com", code:"Demand15f", note:"15% off, note the mixed case", limits:"Enter exactly as written", cat:"hobby", country:"XX"},
  {store:"elegoo.com", code:"IME15", note:"15 dollars off", limits:"Confirmed working, a flat amount", cat:"hobby", country:"XX", verified:true, testedOn:"2026-07-25"},
  {store:"elegoo.com", code:"DEMAND10F", note:"10% off", limits:"", cat:"hobby", country:"XX"},
  {store:"elegoo.com", code:"IME10", note:"10 dollars off", limits:"Confirmed working, a flat amount rather than a percentage", cat:"hobby", country:"XX", verified:true, testedOn:"2026-07-24"},
  {store:"elegoo.com", code:"EA_10OFF100", note:"10 off when you spend 100", limits:"Minimum spend of 100 required", cat:"hobby", country:"XX"},
  {store:"elegoo.com", code:"DEMAND4F", note:"Small discount, amount unclear", limits:"", cat:"hobby", country:"XX"},
  {store:"elegoo.com", code:"IME4OFF", note:"4 percent off", limits:"Confirmed working. Took 35 dollars off an 878 dollar order, so it is a percentage despite the name", cat:"hobby", country:"XX", verified:true, testedOn:"2026-07-25"},

  // Nespresso
  {store:"nespresso.com", code:"PICNIC2026", note:"Summer picnic promo", limits:"", cat:"food", country:"EU"},
  {store:"nespresso.com", code:"LAWN2026", note:"Summer campaign code", limits:"", cat:"food", country:"EU"},
  {store:"nespresso.com", code:"TOTE2026", note:"Free tote bag with order", limits:"Usually needs a minimum number of sleeves", cat:"food", country:"EU"},
  {store:"nespresso.com", code:"PICNIC26", note:"Short form of the picnic promo", limits:"Try this if the long form fails", cat:"food", country:"EU"},
  {store:"nespresso.com", code:"LAWN26", note:"Short form of the lawn promo", limits:"Try this if the long form fails", cat:"food", country:"EU"},

  // HP
  {store:"hp.com", code:"HYPERMON20", note:"20% off monitors", limits:"Rejected on the US site, so it may be Europe only. Nobody has tried it on a European HP store yet", cat:"tech", country:"EU", failed:true},
  {store:"hp.com", code:"SUMMERDEAL25", note:"25% off summer promo", limits:"Usually excludes new releases", cat:"tech", country:"EU"},
  {store:"hp.com", code:"BACK2SCHOOL25", note:"25% off back to school", limits:"Seasonal, strongest around August. Not tested yet", cat:"tech", country:"EU"},
  {store:"hp.com", code:"10ATTACH", note:"10% off when adding an accessory", limits:"Needs a qualifying item in the cart", cat:"tech", country:"EU"},
  {store:"hp.com", code:"ultra600", note:"Discount on Ultra range, lowercase as written", limits:"Likely tied to specific models", cat:"tech", country:"EU"},
  {store:"hp.com", code:"HPDD6QDUA122", note:"Discount amount unknown", limits:"Random string, likely single use", cat:"tech", country:"EU"},

  // Meta Quest store
  {store:"meta.com", code:"DAVIDDEAL", note:"10% off any game on the Quest store", limits:"Confirmed working. Games only, not hardware or accessories. Works on headset purchases", cat:"tech", country:"XX", verified:true, testedOn:"2026-07-24"},

  // Topps, verified within two weeks. Several look like random tokens but are
  // being used by a dozen or more people a day, so they are marked reusable.
  {store:"topps.com", code:"4JOSHD", note:"10% off storewide", limits:"Confirmed working. Shared code, not one per account", cat:"hobby", country:"XX", single:false, verified:true, testedOn:"2026-07-24"},
  {store:"topps.com", code:"EMPLOYEE25", note:"25% off select items", limits:"Strong track record elsewhere, used 18 times today", cat:"hobby", country:"XX"},
  {store:"topps.com", code:"SWASAVE20", note:"20% off favourites", limits:"", cat:"hobby", country:"XX"},
  {store:"topps.com", code:"TOPPSBR15", note:"15% off storewide", limits:"", cat:"hobby", country:"XX"},
  {store:"topps.com", code:"SASQUATCH", note:"10% off storewide", limits:"", cat:"hobby", country:"XX"},
  {store:"topps.com", code:"GBW10", note:"10% off select items", limits:"", cat:"hobby", country:"XX"},
  {store:"topps.com", code:"THANKS", note:"10% off storewide", limits:"Minimum order 100", cat:"hobby", country:"XX"},
  {store:"topps.com", code:"XKVSX7FVUMQH", note:"10% off storewide", limits:"Odd looking but used 13 times today", cat:"hobby", country:"XX", single:false},
  {store:"topps.com", code:"15EIJ8UBPL17", note:"10% off storewide", limits:"", cat:"hobby", country:"XX", single:false},
  {store:"topps.com", code:"8MB9O7D4LXX7", note:"10% off storewide", limits:"Members only", cat:"hobby", country:"XX", single:false},
  {store:"topps.com", code:"24F9S03O075WHT", note:"20 off storewide", limits:"Members only, minimum order 200", cat:"hobby", country:"XX", single:false},
  {store:"topps.com", code:"XF2YVEZ90Q7D", note:"10% off storewide", limits:"", cat:"hobby", country:"XX", single:false},
  {store:"topps.com", code:"Y5RXD9DW0MUN", note:"10% off storewide", limits:"", cat:"hobby", country:"XX", single:false},

  // Fanatics, verified within two weeks
  {store:"fanatics.com", code:"TEES25", note:"25% off storewide", limits:"Very strong track record elsewhere, 225 uses today", cat:"fashion", country:"US"},
  {store:"fanatics.com", code:"25TEES", note:"25% off storewide", limits:"Strong track record elsewhere", cat:"fashion", country:"US"},
  {store:"fanatics.com", code:"4HGCPVZ6RL", note:"10% off storewide", limits:"Looks random but is a shared code, 172 uses today", cat:"fashion", country:"US", single:false},
  {store:"fanatics.com", code:"39SHIP", note:"Free shipping storewide", limits:"Minimum order 39, selected countries", cat:"fashion", country:"US"},
  {store:"fanatics.com", code:"JULY26", note:"Free shipping storewide", limits:"", cat:"fashion", country:"US"},
  {store:"fanatics.com", code:"25HATS", note:"25% off Argentina hats", limits:"Argentina hats only", cat:"fashion", country:"US"},
  {store:"fanatics.com", code:"CAPONEXPAZE", note:"35% off select items", limits:"", cat:"fashion", country:"US", single:false},
  {store:"fanatics.com", code:"PADDLE", note:"25 off storewide", limits:"", cat:"fashion", country:"US"},
  {store:"fanatics.com", code:"25SAVE", note:"25% off storewide", limits:"", cat:"fashion", country:"US"},
  {store:"fanatics.com", code:"OCEAN", note:"25% off storewide", limits:"", cat:"fashion", country:"US"},
  {store:"fanatics.com", code:"SHELL", note:"25% off storewide", limits:"", cat:"fashion", country:"US"},
  {store:"fanatics.com", code:"NIKE20", note:"20% off storewide", limits:"", cat:"fashion", country:"US"},
  {store:"fanatics.com", code:"20TEES", note:"20% off storewide", limits:"", cat:"fashion", country:"US"},
  {store:"fanatics.com", code:"MAMA", note:"20% off storewide", limits:"", cat:"fashion", country:"US"},
  {store:"fanatics.com", code:"TULIP", note:"20% off storewide", limits:"", cat:"fashion", country:"US"},
  {store:"fanatics.com", code:"MGP25", note:"25% off selected lines", limits:"Email exclusive", cat:"fashion", country:"US"},
  {store:"fanatics.com", code:"MEMORIAL25", note:"25% off Florida and Atlanta races", limits:"Those races only", cat:"fashion", country:"US"},
  {store:"fanatics.com", code:"SHIP99", note:"Free shipping on jerseys", limits:"Jerseys only, special restrictions", cat:"fashion", country:"US"},
  {store:"fanatics.com", code:"4HGCPVZ6RLV25", note:"5% off select items", limits:"", cat:"fashion", country:"US", single:false},

  // Subway, verified within two weeks. The three marked strong are the ones
  // SimplyCodes lists as verified with a high health score.
  {store:"subway.com", code:"FLBOGO", note:"Buy one get one free, storewide", limits:"Strong track record elsewhere, verified 10 hours ago", cat:"food", country:"US"},
  {store:"subway.com", code:"20OFFBOWL", note:"20% off storewide", limits:"Strong track record elsewhere, verified 10 hours ago", cat:"food", country:"US"},
  {store:"subway.com", code:"3SUBS", note:"Free gift storewide", limits:"Strong track record elsewhere, verified 5 hours ago", cat:"food", country:"US"},
  {store:"subway.com", code:"FL799", note:"Footlong for 7", limits:"Select items", cat:"food", country:"US"},
  {store:"subway.com", code:"TWENTYOFF", note:"20% off storewide", limits:"", cat:"food", country:"US"},
  {store:"subway.com", code:"6INCH199", note:"1 off a sub when you buy a footlong", limits:"Members only", cat:"food", country:"US"},
  {store:"subway.com", code:"FL1299", note:"Two footlongs for 12.99", limits:"Footlongs only", cat:"food", country:"US"},
  {store:"subway.com", code:"699FL", note:"7 off storewide", limits:"Members only", cat:"food", country:"US"},
  {store:"subway.com", code:"246MEATIER", note:"2 for 6 protein pockets", limits:"Protein pockets only", cat:"food", country:"US"},
  {store:"subway.com", code:"BRISKET1299", note:"Discount on bourbon brisket", limits:"Members only", cat:"food", country:"US"},
  {store:"subway.com", code:"SNACKRING", note:"5 off storewide", limits:"", cat:"food", country:"US"},
  {store:"subway.com", code:"2626PROMO", note:"6 off storewide", limits:"", cat:"food", country:"US"},

  // McDonald's, from SimplyCodes community submissions verified within two weeks
  {store:"mcdonalds.com", code:"REGALO35", note:"35% off storewide", limits:"Verified 40 minutes ago, most used code on the list", cat:"food", country:"XX"},
  {store:"mcdonalds.com", code:"PAPITAS", note:"10% off storewide", limits:"", cat:"food", country:"XX"},
  {store:"mcdonalds.com", code:"SPACEJAM", note:"10% off select items", limits:"", cat:"food", country:"XX"},
  {store:"mcdonalds.com", code:"FREEMCAD", note:"Free gift storewide", limits:"", cat:"food", country:"XX"},
  {store:"mcdonalds.com", code:"MYMCDONALDS", note:"Free gift when you download the app", limits:"App download required", cat:"food", country:"XX"},
  {store:"mcdonalds.com", code:"GLOVOAFILIZA", note:"Free delivery storewide", limits:"", cat:"food", country:"XX"},
  {store:"mcdonalds.com", code:"WELCOME", note:"5% off select items", limits:"", cat:"food", country:"XX"},
  {store:"mcdonalds.com", code:"MCDEAL15", note:"Bonus points when you sign up", limits:"Sign up required", cat:"food", country:"XX"},
  {store:"mcdonalds.com", code:"MCDS2024", note:"5 off McDelivery on Uber Eats", limits:"Members only, Uber Eats", cat:"food", country:"US"},
  {store:"mcdonalds.com", code:"MCDS2022", note:"5 off McDelivery on Uber Eats", limits:"New customers only, Uber Eats", cat:"food", country:"US"},
  {store:"mcdonalds.com", code:"MCDS2021", note:"5 off first Uber Eats order", limits:"Uber Eats, first order", cat:"food", country:"US"},
  {store:"mcdonalds.com", code:"TRYMCD", note:"5 off DoorDash delivery", limits:"DoorDash, minimum order 15", cat:"food", country:"US", single:false},
  {store:"mcdonalds.com", code:"QUARTER", note:"Free Quarter Pounder with cheese", limits:"DoorDash, minimum order 20", cat:"food", country:"US"},
  {store:"mcdonalds.com", code:"SCORE", note:"Free CrispyJuicyTender sandwich", limits:"DoorDash, minimum order 15", cat:"food", country:"US"},
  {store:"mcdonalds.com", code:"SAVE100", note:"100 delivery credit on Postmates", limits:"Postmates only", cat:"food", country:"US"},

  // eBay, curated from SimplyCodes July 2026, all within two weeks
  {store:"ebay.com", code:"JULYGRAIL", note:"150 off select items", limits:"Members only", cat:"other", country:"XX", single:false},
  {store:"ebay.com", code:"LOGILAUNCH25", note:"25% off the Logitech brand outlet", limits:"Members only, Logitech outlet listings", cat:"other", country:"XX", single:false},
  {store:"ebay.com", code:"LOWDERJULY26", note:"20% off Lowder Sports Cards", limits:"One seller, sports cards", cat:"hobby", country:"XX", single:false},
  {store:"ebay.com", code:"REFURBLOVE", note:"15% off select items, mostly refurbished", limits:"Select listings", cat:"other", country:"XX", single:false},
  {store:"ebay.com", code:"FAVELUXE15", note:"15% off select watches", limits:"Select watch listings", cat:"other", country:"XX", single:false},
  {store:"ebay.com", code:"SUMMERDRIVE10", note:"10% off vehicle accessories and parts", limits:"", cat:"other", country:"XX", single:false},
  {store:"ebay.com", code:"FASHUPFEB20", note:"Buy 3 get 1 for 50 off mens fashion", limits:"Must order 4 items", cat:"fashion", country:"XX", single:false},
  {store:"ebay.com", code:"BB20SIGNATURE", note:"20% off select items", limits:"", cat:"other", country:"XX", single:false},
  {store:"ebay.com", code:"STYLEREFRESH", note:"Up to 20% off watches, handbags, clothing", limits:"Select listings", cat:"fashion", country:"XX", single:false},
  {store:"ebay.com", code:"FRESHLUXURY", note:"15% off in the Crocs store", limits:"Crocs store listings", cat:"fashion", country:"XX", single:false},
  {store:"ebay.com", code:"SUNSHINE20", note:"20% off select items", limits:"", cat:"other", country:"XX", single:false},

  // Temu, curated, all recent. The random-looking codes are shared promo
  // strings, many people report using the same ones
  {store:"temu.com", code:"ACW274625", note:"40% off storewide", limits:"", cat:"other", country:"XX", single:false},
  {store:"temu.com", code:"ACV671336", note:"50% off storewide", limits:"Minimum order 100", cat:"other", country:"XX", single:false},
  {store:"temu.com", code:"ALJ305213", note:"30% off storewide", limits:"", cat:"other", country:"XX", single:false},
  {store:"temu.com", code:"ALB169449", note:"30% off storewide", limits:"", cat:"other", country:"XX", single:false},
  {store:"temu.com", code:"ALH040402", note:"30% off storewide", limits:"Must use the Temu app", cat:"other", country:"XX", single:false},
  {store:"temu.com", code:"ACY337016", note:"100 off storewide", limits:"", cat:"other", country:"XX", single:false},
  {store:"temu.com", code:"ALG007115", note:"70% off storewide", limits:"Minimum order 1", cat:"other", country:"XX", single:false},
  {store:"temu.com", code:"FRE271944", note:"Free gift storewide", limits:"Must use the Temu app", cat:"other", country:"XX", single:false},
  {store:"temu.com", code:"ACV721913", note:"30% off storewide", limits:"Must use the Temu app", cat:"other", country:"XX", single:false},

  // GoDaddy, curated. Skipped the codes claiming 98 percent off, that is
  // not a real GoDaddy discount
  {store:"godaddy.com", code:"CJCFOSSIG3", note:"Discount storewide", limits:"Members only", cat:"tech", country:"XX", single:false},
  {store:"godaddy.com", code:"GDBB1901N", note:"Free gift storewide", limits:"", cat:"tech", country:"XX", single:false},
  {store:"godaddy.com", code:"GDWELCOME", note:"Discount on select items", limits:"Members only", cat:"tech", country:"XX", single:false},
  {store:"godaddy.com", code:"CJCOYBO25", note:"25% off buying a domain", limits:"Members only", cat:"tech", country:"XX", single:false},
  {store:"godaddy.com", code:"DISCOUNTCODE", note:"15% off select items", limits:"First and second orders", cat:"tech", country:"XX", single:false},
  {store:"godaddy.com", code:"PSREDEEM", note:"20% off storewide", limits:"New customers only", cat:"tech", country:"XX", single:false},
  {store:"godaddy.com", code:"NEW24", note:"10% off all domain plans", limits:"", cat:"tech", country:"XX", single:false},
  {store:"godaddy.com", code:"INDYOYBO25", note:"25% off select items", limits:"", cat:"tech", country:"XX", single:false},
  {store:"godaddy.com", code:"SFACR1", note:"30% off storewide", limits:"", cat:"tech", country:"XX", single:false},

  // WordPress, only two live codes exist
  {store:"wordpress.com", code:"DEC2025", note:"70% off single themes", limits:"Named after last December but still being used", cat:"tech", country:"XX", single:false},
  {store:"wordpress.com", code:"WP30XH9K", note:"30% off storewide", limits:"Members only", cat:"tech", country:"XX", single:false},

  // Etsy, curated. Nearly all Etsy codes belong to one seller shop, so the
  // shop is named. Skipped two codes claiming storewide Etsy discounts,
  // Etsy does not do platform-wide codes
  {store:"etsy.com", code:"HOARDLIZARD25", note:"25% off at GreatGoblinGrotto", limits:"One shop", cat:"hobby", country:"XX", single:false},
  {store:"etsy.com", code:"BLUESKY", note:"20% off at Beadolio by Connie", limits:"One shop", cat:"hobby", country:"XX", single:false},
  {store:"etsy.com", code:"EARLYWEEN", note:"20% off at NefariousNovelties", limits:"One shop", cat:"hobby", country:"XX", single:false},
  {store:"etsy.com", code:"MWA20", note:"20% off a disability pride tote bag", limits:"One product", cat:"hobby", country:"XX", single:false},
  {store:"etsy.com", code:"BABYCOMEBACK2", note:"40% off select items", limits:"", cat:"hobby", country:"XX", single:false},
  {store:"etsy.com", code:"GOSHWOW25OFF", note:"25% off select items", limits:"", cat:"hobby", country:"XX", single:false},
  {store:"etsy.com", code:"GRANDOPEN20", note:"20% off at KnottyNCozy", limits:"One shop, minimum order 30", cat:"hobby", country:"XX", single:false},
  {store:"etsy.com", code:"NICKURSIAK", note:"30% off at NickUrsiak", limits:"One shop", cat:"hobby", country:"XX", single:false},
  {store:"etsy.com", code:"BLUESKY15", note:"15% off thank you items", limits:"", cat:"hobby", country:"XX", single:false},
  {store:"etsy.com", code:"THUNDERSTORM", note:"10% off at Massiveus", limits:"One shop", cat:"hobby", country:"XX", single:false},
  {store:"etsy.com", code:"MELVYCART5", note:"5% off select items", limits:"", cat:"hobby", country:"XX", single:false},
  {store:"etsy.com", code:"5ETSYVERSARY", note:"5% off select items", limits:"", cat:"hobby", country:"XX", single:false},
  {store:"etsy.com", code:"FIRST5", note:"5 off your first order", limits:"First order only", cat:"hobby", country:"XX"},

  // Macys, curated. The wine codes are for the Macys wine shop. Skipped
  // FREND claiming 75 percent off storewide, that is not a real discount
  {store:"macys.com", code:"ZXTZZPWFBNH5", note:"25% off storewide", limits:"Shared promo string, works for many people", cat:"fashion", country:"US", single:false},
  {store:"macys.com", code:"APPONLY20", note:"20% off all designer clearance", limits:"Macys app only", cat:"fashion", country:"US", single:false},
  {store:"macys.com", code:"FRLEND", note:"15% off, often applied automatically", limits:"", cat:"fashion", country:"US", single:false},
  {store:"macys.com", code:"ZRMMCSDXNGG6", note:"25% off storewide", limits:"Shared promo string, works for many people", cat:"fashion", country:"US", single:false},
  {store:"macys.com", code:"POP35", note:"35% off wine", limits:"Macys wine shop", cat:"food", country:"US", single:false},
  {store:"macys.com", code:"GET35", note:"35% off wines", limits:"Macys wine shop", cat:"food", country:"US", single:false},
  {store:"macys.com", code:"APPFINDS", note:"20 off select items", limits:"", cat:"fashion", country:"US", single:false},
  {store:"macys.com", code:"SIDUSS", note:"25% off select items", limits:"", cat:"fashion", country:"US", single:false},
  {store:"macys.com", code:"SGHSPRING2026", note:"50 off storewide", limits:"Minimum order 200", cat:"fashion", country:"US", single:false},
  {store:"macys.com", code:"PANDORA25", note:"25% off Pandora jewelry", limits:"Minimum order 145", cat:"fashion", country:"US", single:false},

  // Kohls, verified codes only. Every community code was three weeks old
  // or more, so none made the cut
  {store:"kohls.com", code:"CATCH15OFF", note:"15% off storewide", limits:"", cat:"fashion", country:"US", single:false},
  {store:"kohls.com", code:"BUYMINIS", note:"50% off qualifying minis products", limits:"Must order 2 items", cat:"fashion", country:"US", single:false},
  {store:"kohls.com", code:"SHOP40", note:"40% off select items", limits:"US store", cat:"fashion", country:"US", single:false},
  {store:"kohls.com", code:"HOME15", note:"15% off home products", limits:"Members only, minimum order 50", cat:"home", country:"US", single:false},
  {store:"kohls.com", code:"INSTANT10", note:"10% off select items", limits:"", cat:"fashion", country:"US", single:false},

  // .store domain registry, creator codes that also work typed straight in
  {store:"get.store", code:"STICKS2025", note:"Discount on a .store domain", limits:"Confirmed working despite the 2025 name. Crediting Sticks", cat:"tech", country:"XX", single:false, verified:true, testedOn:"2026-07-27"},

  {store:"boot.dev", code:"TRANIUM", note:"25% off your first payment", limits:"Confirmed working. First payment only. Crediting Tranium", cat:"tech", country:"XX", single:false, verified:true, testedOn:"2026-07-27"},

  // Walmart, heavily curated. Seven codes claiming 20 to 100 percent off
  // storewide were refused, Walmart does not discount storewide by code.
  // What survives is the realistic stuff, delivery credits and small offs
  {store:"walmart.com", code:"INHOMEDEVICE", note:"150 off storewide", limits:"Tied to the InHome delivery programme, the one code their bot verifies", cat:"other", country:"US", single:false},
  {store:"walmart.com", code:"TODAY10", note:"10 off select items", limits:"Maximum order 150", cat:"other", country:"US", single:false},
  {store:"walmart.com", code:"MAKEUP", note:"10 off", limits:"", cat:"other", country:"US", single:false},
  {store:"walmart.com", code:"PDV3CG49", note:"5 off select items", limits:"Shared promo string", cat:"other", country:"US", single:false},
  {store:"walmart.com", code:"CLIP$4OFF2COUPON", note:"4 off", limits:"The dollar sign is part of the code", cat:"other", country:"US", single:false},
  {store:"walmart.com", code:"THANKFUL", note:"Free shipping", limits:"", cat:"other", country:"US", single:false},
  {store:"walmart.com", code:"DOUBLE10", note:"10 off pickup and delivery orders", limits:"Second and third order only, minimum 50, members", cat:"other", country:"US", single:false},
  {store:"walmart.com", code:"EXPRESS", note:"Express delivery fee credited", limits:"Minimum order 50, members", cat:"other", country:"US", single:false},
  {store:"walmart.com", code:"SICKTRIP", note:"Free shipping", limits:"Minimum order 50, new customers only", cat:"other", country:"US"},
  {store:"walmart.com", code:"POTION25", note:"25% off the Enhance store", limits:"One marketplace seller, members only", cat:"other", country:"US", single:false},

  // Target. Their own listing has no machine-checked codes at all, so
  // every one of these is community only. Skipped BOGO claiming 25% off
  // all of Target, KAMARHEWITT whose minimum order was garbled nonsense,
  // and one entry whose code was literally the word NOTAPPLICABLE
  {store:"target.com", code:"IHEARTDOGS20", note:"20% off one item", limits:"One item, tiny minimum order", cat:"other", country:"US", single:false},
  {store:"target.com", code:"RIMMELLIP15", note:"15% off select items", limits:"Looks tied to Rimmel lip products", cat:"other", country:"US", single:false},
  {store:"target.com", code:"SCHOOL", note:"15% off two items", limits:"Back to school promo", cat:"other", country:"US", single:false},
  {store:"target.com", code:"BALANCER15", note:"15% off select items", limits:"", cat:"other", country:"US", single:false},
  {store:"target.com", code:"FREETOJOIN", note:"20 off", limits:"New customers only", cat:"other", country:"US", single:false},
  {store:"target.com", code:"10DAYSUSA", note:"10% off the board game 10 Days in the USA", limits:"That one game", cat:"hobby", country:"US", single:false},

  {store:"melscience.com", code:"ACTIONLAB", note:"50% off", limits:"Confirmed working. Creator code from The Action Lab, science kit subscriptions", cat:"hobby", country:"XX", single:false, verified:true, testedOn:"2026-07-29"},

  // Anycubic. The rest of their SimplyCodes listing was tested by hand and
  // rejected as nonexistent, so it was all removed. Their page shows
  // hundreds of near identical codes at 100 percent health that do not
  // exist, which is worth remembering about health scores

  // Anycubic. A batch of 13 codes was taken from a listing that showed them
  // all as verified with high health scores. Every one was rejected at the
  // checkout, on two different regional stores. They were removed rather
  // than left sitting here looking plausible. This one was found by hand

  // Anycubic. Every code from the listing was rejected as not existing.
  // These two are the ones that turned out to be real
  {store:"anycubic.com", code:"25ANYCUBIC", note:"15 dollars off", limits:"Confirmed working", cat:"hobby", country:"XX", single:false, verified:true, testedOn:"2026-08-06"},
  {store:"anycubic.com", code:"ACSUN20", note:"20 dollars off select items", limits:"Confirmed working. Selected products only, not storewide", cat:"hobby", country:"XX", single:false, verified:true, testedOn:"2026-08-06"},






  {store:"anycubic.com", code:"DWsave20", note:"20 dollars off an Anycubic 3D printer", limits:"Confirmed working. Creator code, printers only. Gets the Kobra X to 279.99", cat:"hobby", country:"XX", single:false, verified:true, testedOn:"2026-08-06"},

  {store:"anycubic.com", code:"WHERENERDYISCOOL", note:"15 dollars off the Kobra X", limits:"Confirmed working. That printer, creator code so using it credits them", cat:"hobby", country:"XX", single:false, verified:true, testedOn:"2026-08-06"},

  // Xiaomi, verified within two weeks
  {store:"xiaomi.com", code:"16YEARS", note:"150 off storewide", limits:"Anniversary promo, likely a minimum spend", cat:"tech", country:"EU"},
  {store:"xiaomi.com", code:"17TATO", note:"50 off select items", limits:"Selected products only", cat:"tech", country:"EU"},
  {store:"xiaomi.com", code:"24XIAOMIWEEK", note:"15% off storewide", limits:"", cat:"tech", country:"EU"},
  {store:"xiaomi.com", code:"FUTURE10", note:"10% off storewide", limits:"", cat:"tech", country:"EU"},
  {store:"xiaomi.com", code:"XIAOMI17", note:"10% off Xiaomi 17 Ultra", limits:"Xiaomi 17 Ultra only, special restrictions apply", cat:"tech", country:"EU"},
  {store:"xiaomi.com", code:"15APP2025", note:"15 off in the Mi Store app", limits:"App only, minimum order 150", cat:"tech", country:"EU"},
  {store:"xiaomi.com", code:"XIAOMI", note:"5% off, app exclusive", limits:"Mi Store app only", cat:"tech", country:"EU"},
  {store:"xiaomi.com", code:"BIENVENIDO2026", note:"5% off select items", limits:"Spanish wording, so probably the ES store", cat:"tech", country:"EU"},
  {store:"xiaomi.com", code:"50X65G", note:"50 off the Poco X6 5G", limits:"That phone only, last confirmed a month ago", cat:"tech", country:"EU"},

  // Squarespace
  {store:"squarespace.com", code:"CORRIDOR", note:"10% off your first purchase", limits:"First purchase only. Go through the Corridor Crew link first, the code may not be needed", cat:"other", country:"XX"},

  // Incogni
  {store:"incogni.com", code:"SCIENCE", note:"60% off an annual plan", limits:"Annual plans only. Go to incogni.com/science first, then enter the code", cat:"other", country:"XX"},

  // Home Depot
  {store:"homedepot.com", code:"ELECTROLUX20", note:"20% off Electrolux appliances", limits:"Electrolux brand only", cat:"home", country:"US"},
  {store:"homedepot.com", code:"YORK15OFF", note:"15% off", limits:"", cat:"home", country:"US"},
  {store:"homedepot.com", code:"REFRESH15", note:"15% off refresh promo", limits:"", cat:"home", country:"US"},
  {store:"homedepot.com", code:"CKNIGHT10", note:"10% off creator code", limits:"", cat:"home", country:"US"},
  {store:"homedepot.com", code:"7MD4H2YQ2", note:"Discount amount unknown", limits:"Random string, likely single use", cat:"home", country:"US"},
];


// Pure, UI-free logic for the shopping list: text normalization, the Swedish
// grocery database, fuzzy category matching, and small helpers. Kept in its own
// module so it can be unit-tested without rendering React.

// Normalize text: lowercase + strip accents (å/ä/ö → a/a/o) via NFD decomposition.
export const normalize = (text) => {
  return text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

// Categories in display order.
export const categories = [
  'Frukt & Grönt',
  'Mejeri',
  'Kött & Fisk',
  'Skafferi',
  'Bröd & Bakelser',
  'Fryst',
  'Dryck',
  'Godis & Snacks',
  'Hushåll',
  'Övrigt'
];

// Visual metadata per category (emoji + accent colour) used by the UI.
export const categoryMeta = {
  'Frukt & Grönt': { emoji: '🥬', accent: 'text-lime-400' },
  'Mejeri': { emoji: '🥛', accent: 'text-sky-300' },
  'Kött & Fisk': { emoji: '🥩', accent: 'text-rose-300' },
  'Skafferi': { emoji: '🥫', accent: 'text-amber-300' },
  'Bröd & Bakelser': { emoji: '🍞', accent: 'text-orange-300' },
  'Fryst': { emoji: '🧊', accent: 'text-cyan-300' },
  'Dryck': { emoji: '🧃', accent: 'text-teal-300' },
  'Godis & Snacks': { emoji: '🍫', accent: 'text-fuchsia-300' },
  'Hushåll': { emoji: '🧻', accent: 'text-indigo-300' },
  'Övrigt': { emoji: '📦', accent: 'text-gray-300' },
  'Osorterat': { emoji: '🗂️', accent: 'text-yellow-400' }
};

// Comprehensive Swedish grocery database with proper capitalization.
export const groceryDB = [
  // Frukt & Grönt
  { name: 'Morot', emoji: '🥕', category: 'Frukt & Grönt', aliases: ['morötter', 'moro'], keywords: ['grönsak'] },
  { name: 'Potatis', emoji: '🥔', category: 'Frukt & Grönt', aliases: ['potatisar', 'pota'], keywords: ['grönsak'] },
  { name: 'Tomat', emoji: '🍅', category: 'Frukt & Grönt', aliases: ['tomater'], keywords: ['grönsak'] },
  { name: 'Gurka', emoji: '🥒', category: 'Frukt & Grönt', aliases: ['gurkor'], keywords: ['grönsak'] },
  { name: 'Lök', emoji: '🧅', category: 'Frukt & Grönt', aliases: ['lökar', 'gul lök', 'rödlök'], keywords: ['grönsak'] },
  { name: 'Vitlök', emoji: '🧄', category: 'Frukt & Grönt', aliases: ['vitlökar'], keywords: ['grönsak'] },
  { name: 'Paprika', emoji: '🫑', category: 'Frukt & Grönt', aliases: ['paprikor', 'röd paprika'], keywords: ['grönsak'] },
  { name: 'Sallad', emoji: '🥬', category: 'Frukt & Grönt', aliases: ['isbergssallad', 'romansallad'], keywords: ['grönsak'] },
  { name: 'Broccoli', emoji: '🥦', category: 'Frukt & Grönt', aliases: ['broccolli'], keywords: ['grönsak'] },
  { name: 'Blomkål', emoji: '🥦', category: 'Frukt & Grönt', aliases: ['blomkålen'], keywords: ['grönsak'] },
  { name: 'Kål', emoji: '🥬', category: 'Frukt & Grönt', aliases: ['vitkål', 'vitkålen', 'kålen'], keywords: ['grönsak'] },
  { name: 'Grönkål', emoji: '🥬', category: 'Frukt & Grönt', aliases: ['grönkålen'], keywords: ['grönsak'] },
  { name: 'Rödkål', emoji: '🥬', category: 'Frukt & Grönt', aliases: ['rödkålen'], keywords: ['grönsak'] },
  { name: 'Spetskål', emoji: '🥬', category: 'Frukt & Grönt', aliases: ['spetskålen'], keywords: ['grönsak'] },
  { name: 'Savojkål', emoji: '🥬', category: 'Frukt & Grönt', aliases: ['savojkålen'], keywords: ['grönsak'] },
  { name: 'Brysselkål', emoji: '🥬', category: 'Frukt & Grönt', aliases: ['brysselkålen'], keywords: ['grönsak'] },
  { name: 'Spenat', emoji: '🥬', category: 'Frukt & Grönt', aliases: ['färsk spenat'], keywords: ['grönsak'] },
  { name: 'Ruccola', emoji: '🥬', category: 'Frukt & Grönt', aliases: ['rucola'], keywords: ['grönsak'] },
  { name: 'Champinjoner', emoji: '🍄', category: 'Frukt & Grönt', aliases: ['champinjon', 'svamp'], keywords: ['grönsak'] },
  { name: 'Zucchini', emoji: '🥒', category: 'Frukt & Grönt', aliases: ['zuccini'], keywords: ['grönsak'] },
  { name: 'Aubergine', emoji: '🍆', category: 'Frukt & Grönt', aliases: ['auberginer'], keywords: ['grönsak'] },
  { name: 'Selleri', emoji: '🥬', category: 'Frukt & Grönt', aliases: ['selleristjälk'], keywords: ['grönsak'] },
  { name: 'Palsternacka', emoji: '🥕', category: 'Frukt & Grönt', aliases: ['palsternackor'], keywords: ['grönsak'] },
  { name: 'Purjolök', emoji: '🧅', category: 'Frukt & Grönt', aliases: ['purjo'], keywords: ['grönsak'] },
  // Färska örter
  { name: 'Koriander', emoji: '🌿', category: 'Frukt & Grönt', aliases: ['färsk koriander', 'koriandern'], keywords: ['ört', 'krydda'] },
  { name: 'Persilja', emoji: '🌿', category: 'Frukt & Grönt', aliases: ['färsk persilja', 'bladpersilja', 'persiljan'], keywords: ['ört', 'krydda'] },
  { name: 'Dill', emoji: '🌿', category: 'Frukt & Grönt', aliases: ['färsk dill', 'dillen'], keywords: ['ört', 'krydda'] },
  { name: 'Gräslök', emoji: '🌿', category: 'Frukt & Grönt', aliases: ['färsk gräslök', 'gräslöken'], keywords: ['ört', 'krydda'] },
  { name: 'Basilika', emoji: '🌿', category: 'Frukt & Grönt', aliases: ['färsk basilika', 'basilikan'], keywords: ['ört', 'krydda'] },
  { name: 'Mynta', emoji: '🌿', category: 'Frukt & Grönt', aliases: ['färsk mynta', 'myntan'], keywords: ['ört', 'krydda'] },
  { name: 'Timjan', emoji: '🌿', category: 'Frukt & Grönt', aliases: ['färsk timjan', 'timjanen'], keywords: ['ört', 'krydda'] },
  { name: 'Rosmarin', emoji: '🌿', category: 'Frukt & Grönt', aliases: ['färsk rosmarin', 'rosmarinen'], keywords: ['ört', 'krydda'] },
  { name: 'Salvia', emoji: '🌿', category: 'Frukt & Grönt', aliases: ['färsk salvia', 'salvian'], keywords: ['ört', 'krydda'] },

  // Frukt
  { name: 'Äpple', emoji: '🍎', category: 'Frukt & Grönt', aliases: ['äpplen', 'äpplena'], keywords: ['frukt'] },
  { name: 'Banan', emoji: '🍌', category: 'Frukt & Grönt', aliases: ['bananer'], keywords: ['frukt'] },
  { name: 'Apelsin', emoji: '🍊', category: 'Frukt & Grönt', aliases: ['apelsiner'], keywords: ['frukt'] },
  { name: 'Clementin', emoji: '🍊', category: 'Frukt & Grönt', aliases: ['clementiner'], keywords: ['frukt'] },
  { name: 'Druvor', emoji: '🍇', category: 'Frukt & Grönt', aliases: ['vindruvor', 'röda druvor'], keywords: ['frukt'] },
  { name: 'Päron', emoji: '🍐', category: 'Frukt & Grönt', aliases: ['päronen'], keywords: ['frukt'] },
  { name: 'Mango', emoji: '🥭', category: 'Frukt & Grönt', aliases: ['mangon'], keywords: ['frukt'] },
  { name: 'Avokado', emoji: '🥑', category: 'Frukt & Grönt', aliases: ['avokador'], keywords: ['frukt'] },
  { name: 'Lime', emoji: '🍋', category: 'Frukt & Grönt', aliases: ['limefrukter'], keywords: ['frukt'] },
  { name: 'Citron', emoji: '🍋', category: 'Frukt & Grönt', aliases: ['citroner'], keywords: ['frukt'] },
  { name: 'Jordgubbar', emoji: '🍓', category: 'Frukt & Grönt', aliases: ['jordgubbe'], keywords: ['frukt', 'bär'] },
  { name: 'Blåbär', emoji: '🫐', category: 'Frukt & Grönt', aliases: ['blåbären'], keywords: ['frukt', 'bär'] },
  { name: 'Hallon', emoji: '🍓', category: 'Frukt & Grönt', aliases: ['hallonen'], keywords: ['frukt', 'bär'] },
  { name: 'Vattenmelon', emoji: '🍉', category: 'Frukt & Grönt', aliases: ['melon'], keywords: ['frukt'] },

  // Mejeri
  { name: 'Mjölk', emoji: '🥛', category: 'Mejeri', aliases: ['mellanmjölk', 'standardmjölk', 'mjo'], keywords: ['mejeri'] },
  { name: 'Filmjölk', emoji: '🥛', category: 'Mejeri', aliases: ['fil'], keywords: ['mejeri'] },
  { name: 'Yoghurt', emoji: '🥛', category: 'Mejeri', aliases: ['naturell yoghurt', 'turkisk yoghurt'], keywords: ['mejeri'] },
  { name: 'Kvarg', emoji: '🥛', category: 'Mejeri', aliases: ['kvargen'], keywords: ['mejeri'] },
  { name: 'Smör', emoji: '🧈', category: 'Mejeri', aliases: ['bregott', 'smöret'], keywords: ['mejeri'] },
  { name: 'Margarin', emoji: '🧈', category: 'Mejeri', aliases: ['becel', 'lätt margarin'], keywords: ['mejeri'] },
  { name: 'Ost', emoji: '🧀', category: 'Mejeri', aliases: ['hårdost', 'lagrad ost'], keywords: ['mejeri'] },
  { name: 'Riven ost', emoji: '🧀', category: 'Mejeri', aliases: ['rivven ost'], keywords: ['mejeri', 'ost'] },
  { name: 'Mozzarella', emoji: '🧀', category: 'Mejeri', aliases: ['mozz', 'buffelmozzarella'], keywords: ['mejeri', 'ost'] },
  { name: 'Fetaost', emoji: '🧀', category: 'Mejeri', aliases: ['feta'], keywords: ['mejeri', 'ost'] },
  { name: 'Keso', emoji: '🧀', category: 'Mejeri', aliases: ['kesoen'], keywords: ['mejeri'] },
  { name: 'Ägg', emoji: '🥚', category: 'Mejeri', aliases: ['äggen', 'frilandsägg'], keywords: ['mejeri'] },
  { name: 'Grädde', emoji: '🥛', category: 'Mejeri', aliases: ['matlagningsgrädde'], keywords: ['mejeri'] },
  { name: 'Vispgrädde', emoji: '🥛', category: 'Mejeri', aliases: ['visp', 'grädde 36%', 'vispgrädden'], keywords: ['mejeri'] },
  { name: 'Crème fraiche', emoji: '🥛', category: 'Mejeri', aliases: ['creme fraiche', 'fraiche', 'cr', 'créme fraiche'], keywords: ['mejeri'] },
  { name: 'Gräddfil', emoji: '🥛', category: 'Mejeri', aliases: ['gräddfilen'], keywords: ['mejeri'] },
  { name: 'Cheddar', emoji: '🧀', category: 'Mejeri', aliases: ['cheddarost'], keywords: ['mejeri', 'ost'] },
  { name: 'Parmesan', emoji: '🧀', category: 'Mejeri', aliases: ['parmesanost', 'riven parmesan'], keywords: ['mejeri', 'ost'] },
  { name: 'Halloumi', emoji: '🧀', category: 'Mejeri', aliases: ['halloumin'], keywords: ['mejeri', 'ost'] },
  { name: 'Färskost', emoji: '🧀', category: 'Mejeri', aliases: ['philadelphia', 'philadelphiaost'], keywords: ['mejeri', 'ost'] },
  { name: 'Brie', emoji: '🧀', category: 'Mejeri', aliases: ['brieost'], keywords: ['mejeri', 'ost'] },
  { name: 'Gräddost', emoji: '🧀', category: 'Mejeri', aliases: ['gräddosten'], keywords: ['mejeri', 'ost'] },

  // Kött & Fisk
  { name: 'Köttfärs', emoji: '🥩', category: 'Kött & Fisk', aliases: ['färs', 'nötfärs', 'blandfärs'], keywords: ['kött'] },
  { name: 'Kycklingfilé', emoji: '🍗', category: 'Kött & Fisk', aliases: ['kyckling', 'kycklingbröst'], keywords: ['kött', 'fågel'] },
  { name: 'Fläskfilé', emoji: '🥩', category: 'Kött & Fisk', aliases: ['fläsk'], keywords: ['kött'] },
  { name: 'Bacon', emoji: '🥓', category: 'Kött & Fisk', aliases: ['baconet', 'baconstrimlor'], keywords: ['kött'] },
  { name: 'Korv', emoji: '🌭', category: 'Kött & Fisk', aliases: ['korvar', 'prinskorv', 'falukorv'], keywords: ['kött', 'korv'] },
  { name: 'Salami', emoji: '🍖', category: 'Kött & Fisk', aliases: ['salamikorv', 'tryffelsalami', 'milano'], keywords: ['kött', 'korv', 'tryffel'] },
  { name: 'Skinka', emoji: '🍖', category: 'Kött & Fisk', aliases: ['skinkan', 'kokt skinka'], keywords: ['kött'] },
  { name: 'Lax', emoji: '🐟', category: 'Kött & Fisk', aliases: ['laxfilé', 'gravad lax'], keywords: ['fisk'] },
  { name: 'Torsk', emoji: '🐟', category: 'Kött & Fisk', aliases: ['torskfilé'], keywords: ['fisk'] },
  { name: 'Räkor', emoji: '🦐', category: 'Kött & Fisk', aliases: ['skalade räkor', 'räka'], keywords: ['fisk', 'skaldjur'] },
  { name: 'Köttbullar', emoji: '🍖', category: 'Kött & Fisk', aliases: ['kottbullar'], keywords: ['kött'] },
  { name: 'Kassler', emoji: '🍖', category: 'Kött & Fisk', aliases: ['rökt kassler'], keywords: ['kött'] },
  { name: 'Kalkonfilé', emoji: '🍗', category: 'Kött & Fisk', aliases: ['kalkon'], keywords: ['kött', 'fågel'] },
  { name: 'Entrecôte', emoji: '🥩', category: 'Kött & Fisk', aliases: ['entrecote'], keywords: ['kött'] },

  // Skafferi
  { name: 'Pasta', emoji: '🍝', category: 'Skafferi', aliases: ['spaghetti', 'makaroner', 'penne', 'pastan'], keywords: ['torrvara'] },
  { name: 'Ris', emoji: '🍚', category: 'Skafferi', aliases: ['jasminris', 'basmatris', 'riset'], keywords: ['torrvara'] },
  { name: 'Mjöl', emoji: '🌾', category: 'Skafferi', aliases: ['vetemjöl', 'mjölet'], keywords: ['bakning'] },
  { name: 'Socker', category: 'Skafferi', aliases: ['strösocker', 'sockret'], keywords: ['bakning'] },
  { name: 'Salt', emoji: '🧂', category: 'Skafferi', aliases: ['bordssalt', 'saltet'], keywords: ['krydda'] },
  { name: 'Peppar', emoji: '🧂', category: 'Skafferi', aliases: ['svartpeppar', 'pepparn'], keywords: ['krydda'] },
  { name: 'Olja', emoji: '🫒', category: 'Skafferi', aliases: ['matolja', 'rapsolja'], keywords: ['matlagning'] },
  { name: 'Olivolja', emoji: '🫒', category: 'Skafferi', aliases: ['extra virgin olivolja'], keywords: ['matlagning'] },
  { name: 'Ketchup', emoji: '🍅', category: 'Skafferi', aliases: ['felix ketchup', 'ketchupen'], keywords: ['sås'] },
  { name: 'Senap', category: 'Skafferi', aliases: ['dijonsenap', 'senapen'], keywords: ['sås'] },
  { name: 'Majonnäs', category: 'Skafferi', aliases: ['majonnäsen', 'majonäs'], keywords: ['sås'] },
  { name: 'Ättika', category: 'Skafferi', aliases: ['ättikan', 'vinäger', 'balsamico'], keywords: ['sås'] },
  { name: 'Soja', category: 'Skafferi', aliases: ['sojasås', 'sojan'], keywords: ['sås'] },
  { name: 'Honung', emoji: '🍯', category: 'Skafferi', aliases: ['honungen'], keywords: ['sötning'] },
  { name: 'Tomatpuré', emoji: '🍅', category: 'Skafferi', aliases: ['tomatpure', 'tomatpurén'], keywords: ['konserv'] },
  { name: 'Krossade tomater', emoji: '🍅', category: 'Skafferi', aliases: ['tomater på burk'], keywords: ['konserv'] },
  { name: 'Kokosmjölk', emoji: '🥥', category: 'Skafferi', aliases: ['kokosmjölken'], keywords: ['konserv'] },
  { name: 'Linser', emoji: '🫘', category: 'Skafferi', aliases: ['röda linser', 'gröna linser'], keywords: ['torrvara'] },
  { name: 'Bönor', emoji: '🫘', category: 'Skafferi', aliases: ['kidneybönor', 'svarta bönor'], keywords: ['konserv'] },
  { name: 'Kikärtor', emoji: '🫘', category: 'Skafferi', aliases: ['kikärtorna'], keywords: ['konserv'] },
  { name: 'Müsli', emoji: '🥣', category: 'Skafferi', aliases: ['musli', 'flingor'], keywords: ['frukost'] },
  { name: 'Havregryn', emoji: '🥣', category: 'Skafferi', aliases: ['havre', 'gryn'], keywords: ['frukost'] },

  // Bröd & Bakelser
  { name: 'Bröd', emoji: '🍞', category: 'Bröd & Bakelser', aliases: ['brödlimpa', 'formbröd'], keywords: ['bakverk'] },
  { name: 'Hamburgerbröd', emoji: '🍔', category: 'Bröd & Bakelser', aliases: ['hamburgare bröd'], keywords: ['bakverk'] },
  { name: 'Wraps', emoji: '🌯', category: 'Bröd & Bakelser', aliases: ['tortilla'], keywords: ['bakverk'] },
  { name: 'Pitabröd', emoji: '🫓', category: 'Bröd & Bakelser', aliases: ['pita'], keywords: ['bakverk'] },
  { name: 'Knäckebröd', emoji: '🍞', category: 'Bröd & Bakelser', aliases: ['knäcke'], keywords: ['bakverk'] },
  { name: 'Kavring', emoji: '🍞', category: 'Bröd & Bakelser', aliases: ['rågkavring'], keywords: ['bakverk'] },
  { name: 'Croissant', emoji: '🥐', category: 'Bröd & Bakelser', aliases: ['croissanter'], keywords: ['bakverk'] },
  { name: 'Frallor', emoji: '🥖', category: 'Bröd & Bakelser', aliases: ['fralla'], keywords: ['bakverk'] },

  // Fryst
  { name: 'Frysta bär', emoji: '🫐', category: 'Fryst', aliases: ['frysta hallon', 'frysta blåbär'], keywords: ['fryst'] },
  { name: 'Frysta grönsaker', emoji: '🥦', category: 'Fryst', aliases: ['wok mix', 'grönsaksblandning'], keywords: ['fryst'] },
  { name: 'Glass', emoji: '🍦', category: 'Fryst', aliases: ['vaniljglass', 'glassen'], keywords: ['fryst', 'dessert'] },
  { name: 'Pommes frites', emoji: '🍟', category: 'Fryst', aliases: ['pommes', 'strips'], keywords: ['fryst'] },
  { name: 'Fiskpinnar', emoji: '🐟', category: 'Fryst', aliases: ['fiskpinnarna'], keywords: ['fryst', 'fisk'] },
  { name: 'Pizzadeg', emoji: '🍕', category: 'Fryst', aliases: ['fryst pizzadeg'], keywords: ['fryst'] },

  // Dryck
  { name: 'Kaffe', emoji: '☕', category: 'Dryck', aliases: ['bryggkaffe', 'kaffet'], keywords: ['dryck'] },
  { name: 'Te', emoji: '🍵', category: 'Dryck', aliases: ['teet', 'teblad'], keywords: ['dryck'] },
  { name: 'Juice', emoji: '🧃', category: 'Dryck', aliases: ['apelsinjuice', 'äppeljuice'], keywords: ['dryck'] },
  { name: 'Cola', emoji: '🥤', category: 'Dryck', aliases: ['coca cola', 'coke'], keywords: ['dryck', 'läsk'] },
  { name: 'Vatten', emoji: '💧', category: 'Dryck', aliases: ['mineralvatten', 'ramlösa'], keywords: ['dryck'] },
  { name: 'Läsk', emoji: '🥤', category: 'Dryck', aliases: ['fanta', 'sprite'], keywords: ['dryck'] },
  { name: 'Öl', emoji: '🍺', category: 'Dryck', aliases: ['ölen', 'folköl'], keywords: ['dryck', 'alkohol'] },

  // Godis & Snacks
  { name: 'Chips', category: 'Godis & Snacks', aliases: ['chipsen', 'estrella', 'olw'], keywords: ['snacks'] },
  { name: 'Godis', emoji: '🍬', category: 'Godis & Snacks', aliases: ['lösgodis', 'godiset'], keywords: ['snacks'] },
  { name: 'Choklad', emoji: '🍫', category: 'Godis & Snacks', aliases: ['chokladen', 'marabou'], keywords: ['snacks'] },
  { name: 'Nötter', emoji: '🥜', category: 'Godis & Snacks', aliases: ['cashewnötter', 'mandlar'], keywords: ['snacks'] },
  { name: 'Popcorn', emoji: '🍿', category: 'Godis & Snacks', aliases: ['popcornet'], keywords: ['snacks'] },
  { name: 'Kex', emoji: '🍪', category: 'Godis & Snacks', aliases: ['ballerina', 'digestive'], keywords: ['snacks'] },

  // Hushåll
  { name: 'Diskmedel', emoji: '🧴', category: 'Hushåll', aliases: ['yes', 'diskmedlet'], keywords: ['städning'] },
  { name: 'Toapapper', emoji: '🧻', category: 'Hushåll', aliases: ['toalettpapper', 'toarulle'], keywords: ['hygien'] },
  { name: 'Hushållspapper', emoji: '🧻', category: 'Hushåll', aliases: ['papper'], keywords: ['städning'] },
  { name: 'Tvättmedel', emoji: '🧴', category: 'Hushåll', aliases: ['tvättmedellet'], keywords: ['tvätt'] },
  { name: 'Soppåsar', emoji: '🗑️', category: 'Hushåll', aliases: ['soppåse', 'soppåsarna'], keywords: ['städning'] },
  { name: 'Blöjor', emoji: '👶', category: 'Hushåll', aliases: ['blöja', 'barnblöjor', 'pampers'], keywords: ['baby'] },
  { name: 'Våtservetter', emoji: '🧻', category: 'Hushåll', aliases: ['babyvåtservetter', 'våtservett'], keywords: ['baby'] },
  { name: 'Aluminiumfolie', category: 'Hushåll', aliases: ['folie', 'alfolie'], keywords: ['förvaring'] },
  { name: 'Plastfolie', category: 'Hushåll', aliases: ['plastfilm'], keywords: ['förvaring'] },
  { name: 'Diskborste', emoji: '🧽', category: 'Hushåll', aliases: ['diskborsten'], keywords: ['städning'] },
  { name: 'Tvål', emoji: '🧼', category: 'Hushåll', aliases: ['handtvål', 'tvålen'], keywords: ['hygien'] },
  { name: 'Tandkräm', emoji: '🪥', category: 'Hushåll', aliases: ['tandkrämen'], keywords: ['hygien'] },
  { name: 'Schampo', emoji: '🧴', category: 'Hushåll', aliases: ['schampot'], keywords: ['hygien'] },
  { name: 'Balsam', emoji: '🧴', category: 'Hushåll', aliases: ['hårbalsam'], keywords: ['hygien'] },
  { name: 'Duschtvål', emoji: '🧼', category: 'Hushåll', aliases: ['duschkräm', 'duschgel'], keywords: ['hygien'] },
  { name: 'Kattmat', emoji: '🐱', category: 'Hushåll', aliases: ['katt mat', 'torrfoder katt', 'våtfoder katt'], keywords: ['husdjur', 'katt'] },
  { name: 'Hundmat', emoji: '🐶', category: 'Hushåll', aliases: ['hund mat', 'torrfoder hund', 'våtfoder hund'], keywords: ['husdjur', 'hund'] },
  { name: 'Kattsand', emoji: '🐱', category: 'Hushåll', aliases: ['kattlådesand', 'sand'], keywords: ['husdjur', 'katt'] }
];

// Minimum lengths for the fuzzy partial-match step. These guard against short
// substrings producing false positives (e.g. "kal" matching inside "blomkal").
const MIN_INPUT_LEN_FOR_SUBSTRING = 4; // input contained inside a product name
const MIN_TERM_LEN_FOR_SUBSTRING = 3;  // product name/alias contained inside input

// Smart product finder with accent-insensitive fuzzy matching.
// Returns { category, source } or null when nothing matches.
export const findProductCategory = (searchTerm) => {
  const normalized = normalize(searchTerm.trim());
  if (!normalized) return null;

  // 1. Exact name match
  let match = groceryDB.find(p => normalize(p.name) === normalized);
  if (match) return { category: match.category, source: 'exact' };

  // 2. Alias match
  match = groceryDB.find(p => p.aliases.some(a => normalize(a) === normalized));
  if (match) return { category: match.category, source: 'alias' };

  // 3. Partial word match (e.g. "tryffelsalami" contains "salami"), guarded by
  //    minimum lengths so short fragments don't match longer product names.
  for (const product of groceryDB) {
    if (partialMatches(normalized, normalize(product.name))) {
      return { category: product.category, source: 'partial' };
    }
    for (const alias of product.aliases) {
      if (partialMatches(normalized, normalize(alias))) {
        return { category: product.category, source: 'partial' };
      }
    }
  }

  // 4. Keyword match
  match = groceryDB.find(p => p.keywords?.some(k => normalized.includes(normalize(k))));
  if (match) return { category: match.category, source: 'keyword' };

  return null;
};

// True when normalized input and a normalized DB term overlap as a substring,
// respecting the minimum-length guards above.
const partialMatches = (input, term) => {
  if (!term) return false;
  // term fully contained inside the typed input ("tryffelsalami" ⊃ "salami")
  if (term.length >= MIN_TERM_LEN_FOR_SUBSTRING && input.includes(term)) return true;
  // typed input contained inside the term ("blomkål" ⊃ "blomk…"); needs a longer
  // input so 3-letter fragments like "kal" don't latch onto "blomkal".
  if (input.length >= MIN_INPUT_LEN_FOR_SUBSTRING && term.includes(input)) return true;
  return false;
};

// On Enter we always add exactly what the user typed — never the ghost-text
// autocomplete suggestion. The ghost suggestion is only accepted with Tab/→.
// This is the fix for "kål" + Enter adding "Kalamata oliver".
export const resolveAddName = (typedText, _ghostSuggestion) => {
  return (typedText || '').trim();
};

// Pick the best emoji for a list item: the product's own emoji when known,
// otherwise the category's emoji, otherwise the "Osorterat" fallback. Custom
// free-text items (e.g. "runda mackor") fall back to their category emoji.
export const getItemEmoji = (name, category) => {
  const n = normalize((name || '').trim());
  if (n) {
    const product = groceryDB.find(p =>
      normalize(p.name) === n || p.aliases.some(a => normalize(a) === n)
    );
    if (product?.emoji) return product.emoji;
  }
  return (categoryMeta[category] || categoryMeta['Osorterat']).emoji;
};

// Derive quick-add favourites from purchase history, most-bought first,
// excluding anything already on the current (unchecked) list.
export const getFavorites = (history, currentItems = [], limit = 8) => {
  const activeNames = new Set(
    currentItems.filter(i => !i.checked).map(i => normalize(i.name))
  );
  return Object.entries(history || {})
    .map(([name, data]) => ({
      name,
      category: data?.category || '',
      count: data?.count || 0
    }))
    .filter(f => f.count > 0 && !activeNames.has(normalize(f.name)))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

// ---------------------------------------------------------------------------
// Analytics helpers (pure) – power the "Statistik" tab fun-facts.
// All functions take the raw item arrays (activeList.items + inkopList.items)
// and reduce them into chart-ready aggregates. No React/Firebase deps so they
// stay unit-testable with Vitest.
// ---------------------------------------------------------------------------

// Monday-first Swedish weekday labels.
export const WEEKDAY_LABELS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

// JS getDay(): 0=Sun..6=Sat -> Monday-first index (Mon=0 .. Sun=6).
const mondayFirstIndex = (date) => (date.getDay() + 6) % 7;

// Count items per hour-of-day (0–23) for a given timestamp field.
const bucketByHour = (items, field) => {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  (items || []).forEach(item => {
    const ts = item?.[field];
    if (!ts) return;
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return;
    buckets[d.getHours()].count += 1;
  });
  return buckets;
};

// Count items per weekday (Monday-first) for a given timestamp field.
const bucketByWeekday = (items, field) => {
  const buckets = WEEKDAY_LABELS.map(label => ({ label, count: 0 }));
  (items || []).forEach(item => {
    const ts = item?.[field];
    if (!ts) return;
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return;
    buckets[mondayFirstIndex(d)].count += 1;
  });
  return buckets;
};

export const addsByHour = (items) => bucketByHour(items, 'addedAt');
export const addsByWeekday = (items) => bucketByWeekday(items, 'addedAt');
export const checksByHour = (items) => bucketByHour(items, 'checkedAt');
export const checksByWeekday = (items) => bucketByWeekday(items, 'checkedAt');

// Per-person tally: how many items each user added vs checked off.
export const byPerson = (items) => {
  const out = {};
  (items || []).forEach(item => {
    const who = item?.addedBy || 'Okänd';
    if (!out[who]) out[who] = { added: 0, checked: 0 };
    if (item?.addedAt) out[who].added += 1;
    if (item?.checkedAt) out[who].checked += 1;
  });
  return out;
};

// Category distribution across items (empty category -> 'Övrigt').
export const byCategory = (items) => {
  const out = {};
  (items || []).forEach(item => {
    const cat = (item?.category && item.category.trim()) ? item.category : 'Övrigt';
    out[cat] = (out[cat] || 0) + 1;
  });
  return out;
};

// Most-added products from the persisted purchase history, most first.
export const topProducts = (history, limit = 10) => {
  return Object.entries(history || {})
    .map(([name, data]) => ({
      name,
      category: data?.category || '',
      count: data?.count || 0
    }))
    .filter(p => p.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

// Turn an email into a friendly display name: part before "@", capitalised.
export const displayName = (email) => {
  if (!email || typeof email !== 'string') return 'Okänd';
  const local = email.split('@')[0];
  if (!local) return 'Okänd';
  return local.charAt(0).toUpperCase() + local.slice(1);
};

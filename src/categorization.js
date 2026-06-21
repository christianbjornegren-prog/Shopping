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
  { name: 'Morot', category: 'Frukt & Grönt', aliases: ['morötter', 'moro'], keywords: ['grönsak'] },
  { name: 'Potatis', category: 'Frukt & Grönt', aliases: ['potatisar', 'pota'], keywords: ['grönsak'] },
  { name: 'Tomat', category: 'Frukt & Grönt', aliases: ['tomater'], keywords: ['grönsak'] },
  { name: 'Gurka', category: 'Frukt & Grönt', aliases: ['gurkor'], keywords: ['grönsak'] },
  { name: 'Lök', category: 'Frukt & Grönt', aliases: ['lökar', 'gul lök', 'rödlök'], keywords: ['grönsak'] },
  { name: 'Vitlök', category: 'Frukt & Grönt', aliases: ['vitlökar'], keywords: ['grönsak'] },
  { name: 'Paprika', category: 'Frukt & Grönt', aliases: ['paprikor', 'röd paprika'], keywords: ['grönsak'] },
  { name: 'Sallad', category: 'Frukt & Grönt', aliases: ['isbergssallad', 'romansallad'], keywords: ['grönsak'] },
  { name: 'Broccoli', category: 'Frukt & Grönt', aliases: ['broccolli'], keywords: ['grönsak'] },
  { name: 'Blomkål', category: 'Frukt & Grönt', aliases: ['blomkålen'], keywords: ['grönsak'] },
  { name: 'Kål', category: 'Frukt & Grönt', aliases: ['vitkål', 'vitkålen', 'kålen'], keywords: ['grönsak'] },
  { name: 'Grönkål', category: 'Frukt & Grönt', aliases: ['grönkålen'], keywords: ['grönsak'] },
  { name: 'Rödkål', category: 'Frukt & Grönt', aliases: ['rödkålen'], keywords: ['grönsak'] },
  { name: 'Spetskål', category: 'Frukt & Grönt', aliases: ['spetskålen'], keywords: ['grönsak'] },
  { name: 'Savojkål', category: 'Frukt & Grönt', aliases: ['savojkålen'], keywords: ['grönsak'] },
  { name: 'Brysselkål', category: 'Frukt & Grönt', aliases: ['brysselkålen'], keywords: ['grönsak'] },
  { name: 'Spenat', category: 'Frukt & Grönt', aliases: ['färsk spenat'], keywords: ['grönsak'] },
  { name: 'Ruccola', category: 'Frukt & Grönt', aliases: ['rucola'], keywords: ['grönsak'] },
  { name: 'Champinjoner', category: 'Frukt & Grönt', aliases: ['champinjon', 'svamp'], keywords: ['grönsak'] },
  { name: 'Zucchini', category: 'Frukt & Grönt', aliases: ['zuccini'], keywords: ['grönsak'] },
  { name: 'Aubergine', category: 'Frukt & Grönt', aliases: ['auberginer'], keywords: ['grönsak'] },
  { name: 'Selleri', category: 'Frukt & Grönt', aliases: ['selleristjälk'], keywords: ['grönsak'] },
  { name: 'Palsternacka', category: 'Frukt & Grönt', aliases: ['palsternackor'], keywords: ['grönsak'] },
  { name: 'Purjolök', category: 'Frukt & Grönt', aliases: ['purjo'], keywords: ['grönsak'] },
  // Färska örter
  { name: 'Koriander', category: 'Frukt & Grönt', aliases: ['färsk koriander', 'koriandern'], keywords: ['ört', 'krydda'] },
  { name: 'Persilja', category: 'Frukt & Grönt', aliases: ['färsk persilja', 'bladpersilja', 'persiljan'], keywords: ['ört', 'krydda'] },
  { name: 'Dill', category: 'Frukt & Grönt', aliases: ['färsk dill', 'dillen'], keywords: ['ört', 'krydda'] },
  { name: 'Gräslök', category: 'Frukt & Grönt', aliases: ['färsk gräslök', 'gräslöken'], keywords: ['ört', 'krydda'] },
  { name: 'Basilika', category: 'Frukt & Grönt', aliases: ['färsk basilika', 'basilikan'], keywords: ['ört', 'krydda'] },
  { name: 'Mynta', category: 'Frukt & Grönt', aliases: ['färsk mynta', 'myntan'], keywords: ['ört', 'krydda'] },
  { name: 'Timjan', category: 'Frukt & Grönt', aliases: ['färsk timjan', 'timjanen'], keywords: ['ört', 'krydda'] },
  { name: 'Rosmarin', category: 'Frukt & Grönt', aliases: ['färsk rosmarin', 'rosmarinen'], keywords: ['ört', 'krydda'] },
  { name: 'Salvia', category: 'Frukt & Grönt', aliases: ['färsk salvia', 'salvian'], keywords: ['ört', 'krydda'] },

  // Frukt
  { name: 'Äpple', category: 'Frukt & Grönt', aliases: ['äpplen', 'äpplena'], keywords: ['frukt'] },
  { name: 'Banan', category: 'Frukt & Grönt', aliases: ['bananer'], keywords: ['frukt'] },
  { name: 'Apelsin', category: 'Frukt & Grönt', aliases: ['apelsiner'], keywords: ['frukt'] },
  { name: 'Clementin', category: 'Frukt & Grönt', aliases: ['clementiner'], keywords: ['frukt'] },
  { name: 'Druvor', category: 'Frukt & Grönt', aliases: ['vindruvor', 'röda druvor'], keywords: ['frukt'] },
  { name: 'Päron', category: 'Frukt & Grönt', aliases: ['päronen'], keywords: ['frukt'] },
  { name: 'Mango', category: 'Frukt & Grönt', aliases: ['mangon'], keywords: ['frukt'] },
  { name: 'Avokado', category: 'Frukt & Grönt', aliases: ['avokador'], keywords: ['frukt'] },
  { name: 'Lime', category: 'Frukt & Grönt', aliases: ['limefrukter'], keywords: ['frukt'] },
  { name: 'Citron', category: 'Frukt & Grönt', aliases: ['citroner'], keywords: ['frukt'] },
  { name: 'Jordgubbar', category: 'Frukt & Grönt', aliases: ['jordgubbe'], keywords: ['frukt', 'bär'] },
  { name: 'Blåbär', category: 'Frukt & Grönt', aliases: ['blåbären'], keywords: ['frukt', 'bär'] },
  { name: 'Hallon', category: 'Frukt & Grönt', aliases: ['hallonen'], keywords: ['frukt', 'bär'] },
  { name: 'Vattenmelon', category: 'Frukt & Grönt', aliases: ['melon'], keywords: ['frukt'] },

  // Mejeri
  { name: 'Mjölk', category: 'Mejeri', aliases: ['mellanmjölk', 'standardmjölk', 'mjo'], keywords: ['mejeri'] },
  { name: 'Filmjölk', category: 'Mejeri', aliases: ['fil'], keywords: ['mejeri'] },
  { name: 'Yoghurt', category: 'Mejeri', aliases: ['naturell yoghurt', 'turkisk yoghurt'], keywords: ['mejeri'] },
  { name: 'Kvarg', category: 'Mejeri', aliases: ['kvargen'], keywords: ['mejeri'] },
  { name: 'Smör', category: 'Mejeri', aliases: ['bregott', 'smöret'], keywords: ['mejeri'] },
  { name: 'Margarin', category: 'Mejeri', aliases: ['becel', 'lätt margarin'], keywords: ['mejeri'] },
  { name: 'Ost', category: 'Mejeri', aliases: ['hårdost', 'lagrad ost'], keywords: ['mejeri'] },
  { name: 'Riven ost', category: 'Mejeri', aliases: ['rivven ost'], keywords: ['mejeri', 'ost'] },
  { name: 'Mozzarella', category: 'Mejeri', aliases: ['mozz', 'buffelmozzarella'], keywords: ['mejeri', 'ost'] },
  { name: 'Fetaost', category: 'Mejeri', aliases: ['feta'], keywords: ['mejeri', 'ost'] },
  { name: 'Keso', category: 'Mejeri', aliases: ['kesoen'], keywords: ['mejeri'] },
  { name: 'Ägg', category: 'Mejeri', aliases: ['äggen', 'frilandsägg'], keywords: ['mejeri'] },
  { name: 'Grädde', category: 'Mejeri', aliases: ['matlagningsgrädde'], keywords: ['mejeri'] },
  { name: 'Vispgrädde', category: 'Mejeri', aliases: ['visp', 'grädde 36%', 'vispgrädden'], keywords: ['mejeri'] },
  { name: 'Crème fraiche', category: 'Mejeri', aliases: ['creme fraiche', 'fraiche', 'cr', 'créme fraiche'], keywords: ['mejeri'] },
  { name: 'Gräddfil', category: 'Mejeri', aliases: ['gräddfilen'], keywords: ['mejeri'] },
  { name: 'Cheddar', category: 'Mejeri', aliases: ['cheddarost'], keywords: ['mejeri', 'ost'] },
  { name: 'Parmesan', category: 'Mejeri', aliases: ['parmesanost', 'riven parmesan'], keywords: ['mejeri', 'ost'] },
  { name: 'Halloumi', category: 'Mejeri', aliases: ['halloumin'], keywords: ['mejeri', 'ost'] },
  { name: 'Färskost', category: 'Mejeri', aliases: ['philadelphia', 'philadelphiaost'], keywords: ['mejeri', 'ost'] },
  { name: 'Brie', category: 'Mejeri', aliases: ['brieost'], keywords: ['mejeri', 'ost'] },
  { name: 'Gräddost', category: 'Mejeri', aliases: ['gräddosten'], keywords: ['mejeri', 'ost'] },

  // Kött & Fisk
  { name: 'Köttfärs', category: 'Kött & Fisk', aliases: ['färs', 'nötfärs', 'blandfärs'], keywords: ['kött'] },
  { name: 'Kycklingfilé', category: 'Kött & Fisk', aliases: ['kyckling', 'kycklingbröst'], keywords: ['kött', 'fågel'] },
  { name: 'Fläskfilé', category: 'Kött & Fisk', aliases: ['fläsk'], keywords: ['kött'] },
  { name: 'Bacon', category: 'Kött & Fisk', aliases: ['baconet', 'baconstrimlor'], keywords: ['kött'] },
  { name: 'Korv', category: 'Kött & Fisk', aliases: ['korvar', 'prinskorv', 'falukorv'], keywords: ['kött', 'korv'] },
  { name: 'Salami', category: 'Kött & Fisk', aliases: ['salamikorv', 'tryffelsalami', 'milano'], keywords: ['kött', 'korv', 'tryffel'] },
  { name: 'Skinka', category: 'Kött & Fisk', aliases: ['skinkan', 'kokt skinka'], keywords: ['kött'] },
  { name: 'Lax', category: 'Kött & Fisk', aliases: ['laxfilé', 'gravad lax'], keywords: ['fisk'] },
  { name: 'Torsk', category: 'Kött & Fisk', aliases: ['torskfilé'], keywords: ['fisk'] },
  { name: 'Räkor', category: 'Kött & Fisk', aliases: ['skalade räkor', 'räka'], keywords: ['fisk', 'skaldjur'] },
  { name: 'Köttbullar', category: 'Kött & Fisk', aliases: ['kottbullar'], keywords: ['kött'] },
  { name: 'Kassler', category: 'Kött & Fisk', aliases: ['rökt kassler'], keywords: ['kött'] },
  { name: 'Kalkonfilé', category: 'Kött & Fisk', aliases: ['kalkon'], keywords: ['kött', 'fågel'] },
  { name: 'Entrecôte', category: 'Kött & Fisk', aliases: ['entrecote'], keywords: ['kött'] },

  // Skafferi
  { name: 'Pasta', category: 'Skafferi', aliases: ['spaghetti', 'makaroner', 'penne', 'pastan'], keywords: ['torrvara'] },
  { name: 'Ris', category: 'Skafferi', aliases: ['jasminris', 'basmatris', 'riset'], keywords: ['torrvara'] },
  { name: 'Mjöl', category: 'Skafferi', aliases: ['vetemjöl', 'mjölet'], keywords: ['bakning'] },
  { name: 'Socker', category: 'Skafferi', aliases: ['strösocker', 'sockret'], keywords: ['bakning'] },
  { name: 'Salt', category: 'Skafferi', aliases: ['bordssalt', 'saltet'], keywords: ['krydda'] },
  { name: 'Peppar', category: 'Skafferi', aliases: ['svartpeppar', 'pepparn'], keywords: ['krydda'] },
  { name: 'Olja', category: 'Skafferi', aliases: ['matolja', 'rapsolja'], keywords: ['matlagning'] },
  { name: 'Olivolja', category: 'Skafferi', aliases: ['extra virgin olivolja'], keywords: ['matlagning'] },
  { name: 'Ketchup', category: 'Skafferi', aliases: ['felix ketchup', 'ketchupen'], keywords: ['sås'] },
  { name: 'Senap', category: 'Skafferi', aliases: ['dijonsenap', 'senapen'], keywords: ['sås'] },
  { name: 'Majonnäs', category: 'Skafferi', aliases: ['majonnäsen', 'majonäs'], keywords: ['sås'] },
  { name: 'Ättika', category: 'Skafferi', aliases: ['ättikan', 'vinäger', 'balsamico'], keywords: ['sås'] },
  { name: 'Soja', category: 'Skafferi', aliases: ['sojasås', 'sojan'], keywords: ['sås'] },
  { name: 'Honung', category: 'Skafferi', aliases: ['honungen'], keywords: ['sötning'] },
  { name: 'Tomatpuré', category: 'Skafferi', aliases: ['tomatpure', 'tomatpurén'], keywords: ['konserv'] },
  { name: 'Krossade tomater', category: 'Skafferi', aliases: ['tomater på burk'], keywords: ['konserv'] },
  { name: 'Kokosmjölk', category: 'Skafferi', aliases: ['kokosmjölken'], keywords: ['konserv'] },
  { name: 'Linser', category: 'Skafferi', aliases: ['röda linser', 'gröna linser'], keywords: ['torrvara'] },
  { name: 'Bönor', category: 'Skafferi', aliases: ['kidneybönor', 'svarta bönor'], keywords: ['konserv'] },
  { name: 'Kikärtor', category: 'Skafferi', aliases: ['kikärtorna'], keywords: ['konserv'] },
  { name: 'Müsli', category: 'Skafferi', aliases: ['musli', 'flingor'], keywords: ['frukost'] },
  { name: 'Havregryn', category: 'Skafferi', aliases: ['havre', 'gryn'], keywords: ['frukost'] },

  // Bröd & Bakelser
  { name: 'Bröd', category: 'Bröd & Bakelser', aliases: ['brödlimpa', 'formbröd'], keywords: ['bakverk'] },
  { name: 'Hamburgerbröd', category: 'Bröd & Bakelser', aliases: ['hamburgare bröd'], keywords: ['bakverk'] },
  { name: 'Wraps', category: 'Bröd & Bakelser', aliases: ['tortilla'], keywords: ['bakverk'] },
  { name: 'Pitabröd', category: 'Bröd & Bakelser', aliases: ['pita'], keywords: ['bakverk'] },
  { name: 'Knäckebröd', category: 'Bröd & Bakelser', aliases: ['knäcke'], keywords: ['bakverk'] },
  { name: 'Kavring', category: 'Bröd & Bakelser', aliases: ['rågkavring'], keywords: ['bakverk'] },
  { name: 'Croissant', category: 'Bröd & Bakelser', aliases: ['croissanter'], keywords: ['bakverk'] },
  { name: 'Frallor', category: 'Bröd & Bakelser', aliases: ['fralla'], keywords: ['bakverk'] },

  // Fryst
  { name: 'Frysta bär', category: 'Fryst', aliases: ['frysta hallon', 'frysta blåbär'], keywords: ['fryst'] },
  { name: 'Frysta grönsaker', category: 'Fryst', aliases: ['wok mix', 'grönsaksblandning'], keywords: ['fryst'] },
  { name: 'Glass', category: 'Fryst', aliases: ['vaniljglass', 'glassen'], keywords: ['fryst', 'dessert'] },
  { name: 'Pommes frites', category: 'Fryst', aliases: ['pommes', 'strips'], keywords: ['fryst'] },
  { name: 'Fiskpinnar', category: 'Fryst', aliases: ['fiskpinnarna'], keywords: ['fryst', 'fisk'] },
  { name: 'Pizzadeg', category: 'Fryst', aliases: ['fryst pizzadeg'], keywords: ['fryst'] },

  // Dryck
  { name: 'Kaffe', category: 'Dryck', aliases: ['bryggkaffe', 'kaffet'], keywords: ['dryck'] },
  { name: 'Te', category: 'Dryck', aliases: ['teet', 'teblad'], keywords: ['dryck'] },
  { name: 'Juice', category: 'Dryck', aliases: ['apelsinjuice', 'äppeljuice'], keywords: ['dryck'] },
  { name: 'Cola', category: 'Dryck', aliases: ['coca cola', 'coke'], keywords: ['dryck', 'läsk'] },
  { name: 'Vatten', category: 'Dryck', aliases: ['mineralvatten', 'ramlösa'], keywords: ['dryck'] },
  { name: 'Läsk', category: 'Dryck', aliases: ['fanta', 'sprite'], keywords: ['dryck'] },
  { name: 'Öl', category: 'Dryck', aliases: ['ölen', 'folköl'], keywords: ['dryck', 'alkohol'] },

  // Godis & Snacks
  { name: 'Chips', category: 'Godis & Snacks', aliases: ['chipsen', 'estrella', 'olw'], keywords: ['snacks'] },
  { name: 'Godis', category: 'Godis & Snacks', aliases: ['lösgodis', 'godiset'], keywords: ['snacks'] },
  { name: 'Choklad', category: 'Godis & Snacks', aliases: ['chokladen', 'marabou'], keywords: ['snacks'] },
  { name: 'Nötter', category: 'Godis & Snacks', aliases: ['cashewnötter', 'mandlar'], keywords: ['snacks'] },
  { name: 'Popcorn', category: 'Godis & Snacks', aliases: ['popcornet'], keywords: ['snacks'] },
  { name: 'Kex', category: 'Godis & Snacks', aliases: ['ballerina', 'digestive'], keywords: ['snacks'] },

  // Hushåll
  { name: 'Diskmedel', category: 'Hushåll', aliases: ['yes', 'diskmedlet'], keywords: ['städning'] },
  { name: 'Toapapper', category: 'Hushåll', aliases: ['toalettpapper', 'toarulle'], keywords: ['hygien'] },
  { name: 'Hushållspapper', category: 'Hushåll', aliases: ['papper'], keywords: ['städning'] },
  { name: 'Tvättmedel', category: 'Hushåll', aliases: ['tvättmedellet'], keywords: ['tvätt'] },
  { name: 'Soppåsar', category: 'Hushåll', aliases: ['soppåse', 'soppåsarna'], keywords: ['städning'] },
  { name: 'Blöjor', category: 'Hushåll', aliases: ['blöja', 'barnblöjor', 'pampers'], keywords: ['baby'] },
  { name: 'Våtservetter', category: 'Hushåll', aliases: ['babyvåtservetter', 'våtservett'], keywords: ['baby'] },
  { name: 'Aluminiumfolie', category: 'Hushåll', aliases: ['folie', 'alfolie'], keywords: ['förvaring'] },
  { name: 'Plastfolie', category: 'Hushåll', aliases: ['plastfilm'], keywords: ['förvaring'] },
  { name: 'Diskborste', category: 'Hushåll', aliases: ['diskborsten'], keywords: ['städning'] },
  { name: 'Tvål', category: 'Hushåll', aliases: ['handtvål', 'tvålen'], keywords: ['hygien'] },
  { name: 'Tandkräm', category: 'Hushåll', aliases: ['tandkrämen'], keywords: ['hygien'] },
  { name: 'Schampo', category: 'Hushåll', aliases: ['schampot'], keywords: ['hygien'] },
  { name: 'Balsam', category: 'Hushåll', aliases: ['hårbalsam'], keywords: ['hygien'] },
  { name: 'Duschtvål', category: 'Hushåll', aliases: ['duschkräm', 'duschgel'], keywords: ['hygien'] },
  { name: 'Kattmat', category: 'Hushåll', aliases: ['katt mat', 'torrfoder katt', 'våtfoder katt'], keywords: ['husdjur', 'katt'] },
  { name: 'Hundmat', category: 'Hushåll', aliases: ['hund mat', 'torrfoder hund', 'våtfoder hund'], keywords: ['husdjur', 'hund'] },
  { name: 'Kattsand', category: 'Hushåll', aliases: ['kattlådesand', 'sand'], keywords: ['husdjur', 'katt'] }
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

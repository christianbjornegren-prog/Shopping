import React, { useState, useEffect } from 'react';
import { Search, Plus, Check, Trash2, UserPlus, ShoppingCart, X, Archive, Clock } from 'lucide-react';

// Normalize text: remove accents, lowercase
const normalize = (text) => {
  return text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

// Comprehensive Swedish grocery database with proper capitalization
const groceryDB = [
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
  { name: 'Spenat', category: 'Frukt & Grönt', aliases: ['färsk spenat'], keywords: ['grönsak'] },
  { name: 'Ruccola', category: 'Frukt & Grönt', aliases: ['rucola'], keywords: ['grönsak'] },
  { name: 'Champinjoner', category: 'Frukt & Grönt', aliases: ['champinjon', 'svamp'], keywords: ['grönsak'] },
  { name: 'Zucchini', category: 'Frukt & Grönt', aliases: ['zuccini'], keywords: ['grönsak'] },
  { name: 'Aubergine', category: 'Frukt & Grönt', aliases: ['auberginer'], keywords: ['grönsak'] },
  { name: 'Selleri', category: 'Frukt & Grönt', aliases: ['selleristjälk'], keywords: ['grönsak'] },
  { name: 'Palsternacka', category: 'Frukt & Grönt', aliases: ['palsternackor'], keywords: ['grönsak'] },
  { name: 'Purjolök', category: 'Frukt & Grönt', aliases: ['purjo'], keywords: ['grönsak'] },
  
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

// Smart product finder with accent-insensitive fuzzy matching
const findProductCategory = (searchTerm) => {
  const normalized = normalize(searchTerm.trim());
  
  // 1. Exact match
  let match = groceryDB.find(p => normalize(p.name) === normalized);
  if (match) return { category: match.category, source: 'exact' };
  
  // 2. Alias match
  match = groceryDB.find(p => p.aliases.some(a => normalize(a) === normalized));
  if (match) return { category: match.category, source: 'alias' };
  
  // 3. Partial word match (e.g., "tryffelsalami" contains "salami")
  for (const product of groceryDB) {
    const normalizedProductName = normalize(product.name);
    if (normalized.includes(normalizedProductName) || 
        normalizedProductName.includes(normalized)) {
      return { category: product.category, source: 'partial' };
    }
    for (const alias of product.aliases) {
      const normalizedAlias = normalize(alias);
      if (normalized.includes(normalizedAlias) || 
          normalizedAlias.includes(normalized)) {
        return { category: product.category, source: 'partial' };
      }
    }
  }
  
  // 4. Keyword match
  match = groceryDB.find(p => p.keywords?.some(k => normalized.includes(normalize(k))));
  if (match) return { category: match.category, source: 'keyword' };
  
  return null;
};

const ShoppingListApp = () => {
  const [user, setUser] = useState({ email: 'christian@example.com', name: 'Christian' });
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'archive'
  
  // Active list state
  const [activeList, setActiveList] = useState({
    id: Date.now(),
    status: 'prep', // 'prep' or 'shopping'
    items: [],
    createdAt: new Date().toISOString(),
    startedShoppingAt: null
  });
  
  // Archive
  const [archivedLists, setArchivedLists] = useState([
    {
      id: Date.now() - 86400000,
      completedAt: new Date(Date.now() - 86400000).toISOString(),
      items: [
        { name: 'Mjölk', quantity: '1L', category: 'Mejeri', checked: true },
        { name: 'Bröd', quantity: '1', category: 'Bröd & Bakelser', checked: true },
        { name: 'Ägg', quantity: '12', category: 'Mejeri', checked: true }
      ]
    }
  ]);
  
  // User's personal product history
  const [userProductHistory, setUserProductHistory] = useState({
    'Morot': { category: 'Frukt & Grönt', count: 5, lastPurchased: Date.now() - 86400000 },
    'Mjölk': { category: 'Mejeri', count: 8, lastPurchased: Date.now() - 86400000 },
    'Tryffelsalami': { category: 'Kött & Fisk', count: 3, lastPurchased: Date.now() - 172800000 }
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [quantity, setQuantity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const categories = [
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

  // Get suggestions from both static DB and user history
  const getSuggestions = (input) => {
    if (!input || input.length < 2) return [];
    const normalized = normalize(input);
    
    const suggestions = [];
    
    // From static database
    groceryDB.forEach(p => {
      const nameMatch = normalize(p.name).includes(normalized);
      const aliasMatch = p.aliases.some(a => normalize(a).includes(normalized));
      
      if (nameMatch || aliasMatch) {
        const historyCount = userProductHistory[p.name]?.count || 0;
        suggestions.push({ ...p, count: historyCount, source: 'db' });
      }
    });
    
    // From user history (products not in static DB)
    Object.entries(userProductHistory).forEach(([name, data]) => {
      if (normalize(name).includes(normalized) && 
          !suggestions.find(s => normalize(s.name) === normalize(name))) {
        suggestions.push({ 
          name, 
          category: data.category, 
          count: data.count,
          source: 'user',
          aliases: []
        });
      }
    });
    
    // Sort by purchase frequency
    return suggestions
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const suggestions = getSuggestions(searchTerm);

  const handleAddItem = (itemName = null, itemCategory = null) => {
    let name = itemName || searchTerm.trim();
    if (!name) return;
    
    // Try to find product in database to get proper capitalization
    const dbProduct = groceryDB.find(p => 
      normalize(p.name) === normalize(name) || 
      p.aliases.some(a => normalize(a) === normalize(name))
    );
    
    // Use database name for consistent capitalization
    if (dbProduct && !itemName) {
      name = dbProduct.name;
    } else if (!itemName) {
      // Capitalize first letter of user input
      name = name.charAt(0).toUpperCase() + name.slice(1);
    }
    
    // Smart categorization
    let category = itemCategory || selectedCategory;
    
    if (!category) {
      // Check user history first
      const historyEntry = Object.entries(userProductHistory).find(
        ([histName]) => normalize(histName) === normalize(name)
      );
      
      if (historyEntry) {
        category = historyEntry[1].category;
      } else if (dbProduct) {
        category = dbProduct.category;
      } else {
        // Fuzzy match for category
        const result = findProductCategory(name);
        if (result) {
          category = result.category;
        }
      }
    }

    const newItem = {
      id: Date.now(),
      name: name,
      quantity: quantity.trim(),
      category: category || 'Övrigt',
      checked: false,
      addedBy: user?.email,
      addedAt: new Date().toISOString()
    };

    setActiveList(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    
    setSearchTerm('');
    setQuantity('');
    setSelectedCategory('');

    // Update user product history with normalized key matching
    const existingHistoryKey = Object.keys(userProductHistory).find(
      key => normalize(key) === normalize(name)
    );
    
    if (existingHistoryKey) {
      setUserProductHistory(prev => ({
        ...prev,
        [existingHistoryKey]: {
          ...prev[existingHistoryKey],
          count: prev[existingHistoryKey].count + 1,
          lastPurchased: Date.now()
        }
      }));
    } else {
      setUserProductHistory(prev => ({
        ...prev,
        [name]: {
          category: category || 'Övrigt',
          count: 1,
          lastPurchased: Date.now()
        }
      }));
    }
  };

  const toggleCheck = (id) => {
    setActiveList(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    }));
  };

  const deleteItem = (id) => {
    setActiveList(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const startShopping = () => {
    setActiveList(prev => ({
      ...prev,
      status: 'shopping',
      startedShoppingAt: new Date().toISOString()
    }));
  };

  const completeShopping = () => {
    // Archive current list
    setArchivedLists(prev => [{
      id: activeList.id,
      completedAt: new Date().toISOString(),
      items: activeList.items
    }, ...prev]);
    
    // Create new empty list
    setActiveList({
      id: Date.now(),
      status: 'prep',
      items: [],
      createdAt: new Date().toISOString(),
      startedShoppingAt: null
    });
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    alert(`Inbjudan skulle skickas till ${inviteEmail} (Firebase behövs)`);
    setInviteEmail('');
    setShowInviteModal(false);
  };

  const itemsByCategory = activeList.items.reduce((acc, item) => {
    const cat = item.category || 'Övrigt';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  // Filter items in shopping mode
  const displayItems = activeList.status === 'shopping' 
    ? activeList.items.filter(i => !i.checked)
    : activeList.items;

  const displayItemsByCategory = displayItems.reduce((acc, item) => {
    const cat = item.category || 'Övrigt';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const checkedCount = activeList.items.filter(i => i.checked).length;
  const totalCount = activeList.items.length;

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Idag';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Igår';
    } else {
      return date.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-green-500" />
              <div>
                <h1 className="text-xl font-bold">ShoppingList</h1>
                <p className="text-sm text-gray-400">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInviteModal(true)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Bjud in"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('active')}
              className={`py-3 px-4 font-medium border-b-2 transition-colors ${
                activeTab === 'active'
                  ? 'border-green-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Aktiv lista ({totalCount})
            </button>
            <button
              onClick={() => setActiveTab('archive')}
              className={`py-3 px-4 font-medium border-b-2 transition-colors ${
                activeTab === 'archive'
                  ? 'border-green-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Historik ({archivedLists.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'active' ? (
          <>
            {/* Add Item Section - only in prep mode */}
            {activeList.status === 'prep' && (
              <div className="bg-gray-800 rounded-lg p-4 mb-6">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                    placeholder="Vad ska du handla?"
                    className="w-full bg-gray-700 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  
                  {suggestions.length > 0 && searchTerm && (
                    <div className="absolute w-full bg-gray-700 mt-1 rounded-lg shadow-lg overflow-hidden z-20 border border-gray-600">
                      {suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAddItem(suggestion.name, suggestion.category)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-600 flex justify-between items-center border-b border-gray-600 last:border-b-0"
                        >
                          <div>
                            <span className="font-medium">{suggestion.name}</span>
                            {suggestion.count > 0 && (
                              <span className="text-xs text-gray-400 ml-2">({suggestion.count}×)</span>
                            )}
                          </div>
                          <span className="text-sm text-green-400">{suggestion.category}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Antal (valfritt)"
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Välj kategori</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleAddItem()}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Lägg till
                  </button>
                </div>
              </div>
            )}

            {/* Shopping Status */}
            {totalCount > 0 && (
              <div className="bg-gray-800 rounded-lg p-4 mb-6">
                {activeList.status === 'prep' ? (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-400">Redo att handla?</p>
                      <p className="font-semibold">{totalCount} varor i listan</p>
                    </div>
                    <button
                      onClick={startShopping}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      Starta shopping
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-400">
                        🛒 Shopping pågår... {checkedCount} av {totalCount} klarade
                      </span>
                      <button
                        onClick={completeShopping}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
                      >
                        ✓ Klar med shopping
                      </button>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Shopping List */}
            {totalCount === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Din inköpslista är tom</p>
                <p className="text-sm mt-2">Börja lägga till varor ovan</p>
              </div>
            ) : displayItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Check className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <p className="text-xl font-semibold text-white">Allt klart! 🎉</p>
                <p className="text-sm mt-2">Du har bockat av alla varor</p>
                <button
                  onClick={completeShopping}
                  className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  Avsluta shopping
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(displayItemsByCategory).map(([category, categoryItems]) => (
                  <div key={category} className="bg-gray-800 rounded-lg overflow-hidden">
                    <div className="bg-gray-750 px-4 py-2 font-semibold text-green-500 border-b border-gray-700">
                      {category} ({categoryItems.length})
                    </div>
                    <div className="divide-y divide-gray-700">
                      {categoryItems.map(item => (
                        <div
                          key={item.id}
                          className="px-4 py-3 flex items-center gap-3 hover:bg-gray-750 transition-colors"
                        >
                          <button
                            onClick={() => toggleCheck(item.id)}
                            className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                              item.checked
                                ? 'bg-green-500 border-green-500'
                                : 'border-gray-600 hover:border-green-500'
                            }`}
                          >
                            {item.checked && <Check className="w-4 h-4 text-white" />}
                          </button>
                          
                          <div className="flex-grow">
                            <div className="font-medium">{item.name}</div>
                            {item.quantity && (
                              <div className="text-sm text-gray-400">{item.quantity}</div>
                            )}
                          </div>

                          {activeList.status === 'prep' && (
                            <button
                              onClick={() => deleteItem(item.id)}
                              className="flex-shrink-0 p-2 hover:bg-gray-600 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Archive Tab */
          <div className="space-y-4">
            {archivedLists.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Archive className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Ingen historik än</p>
                <p className="text-sm mt-2">Dina genomförda shoppingturer visas här</p>
              </div>
            ) : (
              archivedLists.map(list => (
                <div key={list.id} className="bg-gray-800 rounded-lg overflow-hidden">
                  <div className="bg-gray-750 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                    <div>
                      <div className="font-semibold">Shopping {formatDate(list.completedAt)}</div>
                      <div className="text-sm text-gray-400">{list.items.length} varor</div>
                    </div>
                    <Clock className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {list.items.map((item, idx) => (
                        <span key={idx} className="bg-gray-700 px-3 py-1 rounded-full text-sm">
                          {item.name} {item.quantity && `(${item.quantity})`}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Bjud in till lista</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-400 mb-4">
              Ange email-adressen till personen du vill dela listan med
            </p>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="namn@example.com"
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
              onKeyPress={(e) => e.key === 'Enter' && handleInvite()}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={handleInvite}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors"
              >
                Skicka inbjudan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingListApp;

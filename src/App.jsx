import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Search, Plus, Check, Trash2, UserPlus, ShoppingCart, X, Archive, Clock, LogOut, ChevronDown, ChevronUp, BarChart3, Users, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import {
  normalize,
  groceryDB,
  categories,
  categoryMeta,
  findProductCategory,
  getFavorites,
  getItemEmoji,
  addsByHour,
  addsByWeekday,
  checksByHour,
  checksByWeekday,
  byPerson,
  byCategory,
  topProducts,
  displayName
} from './categorization';

// ===========================================================================
// Statistik-fliken: funfacts om köpbeteende, ritade med Recharts. Komponenten
// monteras om varje gång man går in i fliken, så graferna animeras fram (växer
// från noll) vid varje besök. All aggregering sker via rena helpers i
// categorization.js.
// ===========================================================================

const ADD_COLOR = '#22c55e';   // grön – tillagda varor
const CHECK_COLOR = '#38bdf8'; // sky – avbockade varor
const PIE_COLORS = ['#84cc16', '#38bdf8', '#f43f5e', '#f59e0b', '#fb923c', '#22d3ee', '#2dd4bf', '#e879f9', '#818cf8', '#9ca3af'];

const TIME_BLOCKS = [
  { label: '🌙 Natt', from: 0, to: 6 },
  { label: '🌅 Morgon', from: 6, to: 12 },
  { label: '☀️ Dag', from: 12, to: 18 },
  { label: '🌆 Kväll', from: 18, to: 24 },
];

const sumRange = (hourBuckets, from, to) =>
  hourBuckets.slice(from, to).reduce((s, b) => s + b.count, 0);

const tooltipStyle = {
  background: '#1b202a',
  border: '1px solid #2a303c',
  borderRadius: 12,
  color: '#fff',
  fontSize: 13,
};

const axisTick = { fill: '#9aa4b2', fontSize: 12 };

// Animated count-up for the headline numbers (easeOutCubic).
const CountUp = ({ value, duration = 900 }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{n}</>;
};

const StatCard = ({ title, icon: Icon, hint, children }) => (
  <div className="bg-gray-800 rounded-2xl shadow-card border border-gray-750 p-4 mb-5">
    <div className="flex items-center gap-2 mb-1 text-gray-100 font-semibold">
      {Icon && <Icon className="w-4 h-4 text-green-400" />}
      {title}
    </div>
    {hint && <p className="text-xs text-gray-500 mb-3">{hint}</p>}
    <div className={hint ? '' : 'mt-3'}>{children}</div>
  </div>
);

const SeriesLegend = ({ showChecks }) => (
  <div className="flex items-center gap-4 mb-3 text-xs text-gray-400">
    <span className="flex items-center gap-1.5">
      <span className="w-3 h-3 rounded-sm" style={{ background: ADD_COLOR }} /> Tillagda
    </span>
    {showChecks && (
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm" style={{ background: CHECK_COLOR }} /> Avbockade
      </span>
    )}
  </div>
);

// A single-series vertical bar chart (time-of-day / weekday). When `empty` we
// still render the axes with a 0–1 domain so the graph shows up blank and
// visibly fills in as data is collected over time.
const SimpleBars = ({ data, color, empty }) => (
  <div style={{ width: '100%', height: 220 }}>
    <ResponsiveContainer>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} interval={0} />
        <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} width={28} domain={[0, empty ? 1 : 'auto']} />
        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={tooltipStyle} />
        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} animationDuration={900} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

const StatsView = ({ items, history }) => {
  const addH = addsByHour(items);
  const chkH = checksByHour(items);
  const addW = addsByWeekday(items);
  const chkW = checksByWeekday(items);

  const totalAdded = items.filter(i => i.addedAt).length;
  const totalChecked = items.filter(i => i.checkedAt).length;
  const hasChecks = totalChecked > 0;

  // Add vs check-off are kept as SEPARATE charts – they measure different
  // events (när varan hamnar på listan vs när den bockas av i butiken).
  const timeAdd = TIME_BLOCKS.map(b => ({ name: b.label, value: sumRange(addH, b.from, b.to) }));
  const timeChk = TIME_BLOCKS.map(b => ({ name: b.label, value: sumRange(chkH, b.from, b.to) }));
  const weekAdd = addW.map(b => ({ name: b.label, value: b.count }));
  const weekChk = chkW.map(b => ({ name: b.label, value: b.count }));

  const personData = Object.entries(byPerson(items))
    .map(([email, v]) => ({ name: displayName(email), Tillagda: v.added, Avbockade: v.checked }))
    .sort((a, b) => b.Tillagda - a.Tillagda);

  const catData = Object.entries(byCategory(items))
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const top = topProducts(history, 10).map(p => ({ name: p.name, count: p.count }));

  const hasData = totalAdded > 0 || top.length > 0;

  if (!hasData) {
    return (
      <div className="bg-gray-800 rounded-2xl shadow-card border border-gray-750 p-10 text-center">
        <BarChart3 className="w-10 h-10 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-300 font-semibold mb-1">Ingen data än</p>
        <p className="text-gray-500 text-sm">Lägg till varor i listan så fylls statistiken på med kul fakta! 📊</p>
      </div>
    );
  }

  return (
    <div>
      {/* Headline-siffror med count-up */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-gray-800 rounded-2xl shadow-card border border-gray-750 p-4">
          <div className="text-3xl font-extrabold text-green-400"><CountUp value={totalAdded} /></div>
          <div className="text-sm text-gray-400 mt-1">varor tillagda</div>
        </div>
        <div className="bg-gray-800 rounded-2xl shadow-card border border-gray-750 p-4">
          <div className="text-3xl font-extrabold text-sky-400"><CountUp value={totalChecked} /></div>
          <div className="text-sm text-gray-400 mt-1">varor avbockade</div>
        </div>
      </div>

      {/* --- TILLÄGG (grön): baseras på addedAt --- */}
      <StatCard title="🛒 När lägger ni till varor?" icon={Clock} hint="Tid på dygnet då varor hamnar på listan.">
        <SimpleBars data={timeAdd} color={ADD_COLOR} />
      </StatCard>

      <StatCard title="🛒 Vilka dagar lägger ni till varor?" icon={TrendingUp} hint="Måndag först.">
        <SimpleBars data={weekAdd} color={ADD_COLOR} />
      </StatCard>

      {/* --- HANDLANDE (blå): baseras på checkedAt, tom tills data finns --- */}
      <StatCard title="✅ När handlar ni?" icon={Clock} hint="Tid på dygnet då varor bockas av i butiken.">
        <SimpleBars data={timeChk} color={CHECK_COLOR} empty={!hasChecks} />
        {!hasChecks && (
          <p className="text-xs text-gray-500 text-center mt-2">🔜 Tom än – fylls på allt eftersom ni bockar av varor.</p>
        )}
      </StatCard>

      <StatCard title="✅ Vilka dagar handlar ni?" icon={TrendingUp} hint="Måndag först.">
        <SimpleBars data={weekChk} color={CHECK_COLOR} empty={!hasChecks} />
        {!hasChecks && (
          <p className="text-xs text-gray-500 text-center mt-2">🔜 Tom än – fylls på allt eftersom ni bockar av varor.</p>
        )}
      </StatCard>

      {/* Per person */}
      {personData.length > 0 && (
        <StatCard title="Vem gör vad?" icon={Users} hint="Fördelning per person – vem lägger till mest?">
          <SeriesLegend showChecks={hasChecks} />
          <div style={{ width: '100%', height: Math.max(140, personData.length * 70) }}>
            <ResponsiveContainer>
              <BarChart data={personData} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                <XAxis type="number" allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={axisTick} axisLine={false} tickLine={false} width={70} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={tooltipStyle} />
                <Bar dataKey="Tillagda" fill={ADD_COLOR} radius={[0, 6, 6, 0]} animationDuration={900} />
                {hasChecks && <Bar dataKey="Avbockade" fill={CHECK_COLOR} radius={[0, 6, 6, 0]} animationDuration={900} animationBegin={150} />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </StatCard>
      )}

      {/* Topplista varor */}
      {top.length > 0 && (
        <StatCard title="Mest tillagda varor" icon={TrendingUp} hint="Era favoriter genom tiderna.">
          <div style={{ width: '100%', height: Math.max(160, top.length * 32) }}>
            <ResponsiveContainer>
              <BarChart data={top} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 8 }}>
                <XAxis type="number" allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={axisTick} axisLine={false} tickLine={false} width={90} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="Antal" fill={ADD_COLOR} radius={[0, 6, 6, 0]} animationDuration={1000}>
                  {top.map((entry, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </StatCard>
      )}

      {/* Kategorifördelning */}
      {catData.length > 0 && (
        <StatCard title="Kategorifördelning" icon={BarChart3} hint="Vad fyller vagnen mest?">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div style={{ width: 180, height: 180 }} className="flex-shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} animationDuration={900}>
                    {catData.map((entry, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#1b202a" />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-grow w-full grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              {catData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-2 text-gray-300">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="truncate">{entry.name}</span>
                  <span className="ml-auto text-gray-500">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </StatCard>
      )}
    </div>
  );
};

const ShoppingListApp = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [listId, setListId] = useState(null);

  // Refs to prevent onSnapshot → save → onSnapshot feedback loop
  const isRemoteUpdate = useRef(false);
  const listLoaded = useRef(false);

  // Listen for auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // On login: load or create user profile to get shared listId
  useEffect(() => {
    if (!user) {
      listLoaded.current = false;
      setListId(null);
      return;
    }
    const userRef = doc(db, 'users', user.uid);
    const setup = async () => {
      const joinParam = new URLSearchParams(window.location.search).get('join');
      const userDoc = await getDoc(userRef);
      if (joinParam) {
        const joinListDoc = await getDoc(doc(db, 'lists', joinParam));
        if (joinListDoc.exists()) {
          await setDoc(userRef, { listId: joinParam, email: user.email });
          setListId(joinParam);
          window.history.replaceState({}, '', window.location.pathname);
          return;
        }
      }
      if (userDoc.exists() && userDoc.data().listId) {
        setListId(userDoc.data().listId);
      } else {
        // New user: create a shared list using their UID as the list ID
        const newListId = user.uid;
        await setDoc(doc(db, 'lists', newListId), {
          id: newListId,
          items: [],
          members: [user.uid],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        await setDoc(userRef, { listId: newListId, email: user.email });
        setListId(newListId);
      }
    };
    setup();
  }, [user]);

  // Active list state
  const [activeList, setActiveList] = useState({
    id: Date.now(),
    items: [],
    createdAt: new Date().toISOString()
  });

  // Real-time sync: subscribe to shared active list via onSnapshot
  useEffect(() => {
    if (!user || !listId) return;
    const listRef = doc(db, 'lists', listId);
    const unsubscribe = onSnapshot(listRef, (docSnap) => {
      if (docSnap.exists()) {
        isRemoteUpdate.current = true;
        setActiveList(docSnap.data());
      }
      listLoaded.current = true;
    });
    return () => unsubscribe();
  }, [user, listId]);

  // Save active list to Firestore on local changes (skip remote updates)
  useEffect(() => {
    if (!user || !listId || !listLoaded.current) return;
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    const saveList = async () => {
      try {
        const listRef = doc(db, 'lists', listId);
        await setDoc(listRef, {
          ...activeList,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error saving list:', error);
      }
    };
    saveList();
  }, [activeList, user, listId]);

  // User's personal product history
  const [userProductHistory, setUserProductHistory] = useState({});
  
  const [searchTerm, setSearchTerm] = useState('');
  const [inlineSuggestion, setInlineSuggestion] = useState(null);
  const inputRef = useRef(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [fadingIds, setFadingIds] = useState([]);
  const [checkedExpanded, setCheckedExpanded] = useState(false);
  const [checkedExpandedShopping, setCheckedExpandedShopping] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState(null);
  const dropdownRef = useRef(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const qrRef = useRef(null);
  const [inkopList, setInkopList] = useState({ id: Date.now(), items: [] });
  const inkopLoaded = useRef(false);
  const isInkopRemoteUpdate = useRef(false);

  // Quick-add favourites derived from purchase history (most-bought first),
  // excluding items already on the current list.
  const favorites = getFavorites(userProductHistory, activeList.items, 8);

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
    const normInput = normalize(input);
    return suggestions
      .filter(s => !(normInput.includes(normalize(s.name)) && normInput.length > normalize(s.name).length))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const suggestions = getSuggestions(searchTerm);

  const getInlineCompletion = (input) => {
    if (!input || input.length < 2) return null;
    const normalized = normalize(input);
    let best = null;
    let bestCount = -1;

    groceryDB.forEach(p => {
      const normName = normalize(p.name);
      if (normName.startsWith(normalized) && normName !== normalized) {
        const count = userProductHistory[p.name]?.count || 0;
        if (count > bestCount) { best = p.name; bestCount = count; }
      }
    });

    Object.entries(userProductHistory).forEach(([name, data]) => {
      const normName = normalize(name);
      if (normName.startsWith(normalized) && normName !== normalized) {
        if (data.count > bestCount) { best = name; bestCount = data.count; }
      }
    });

    return best;
  };

  const buildUpdatedHistory = (name, category, currentHistory) => {
    const existingKey = Object.keys(currentHistory).find(
      key => normalize(key) === normalize(name)
    );
    if (existingKey) {
      return {
        ...currentHistory,
        [existingKey]: {
          ...currentHistory[existingKey],
          count: currentHistory[existingKey].count + 1,
          lastPurchased: Date.now()
        }
      };
    }
    return {
      ...currentHistory,
      [name]: { category: category || '', count: 1, lastPurchased: Date.now() }
    };
  };

  const persistHistory = (history) => {
    if (user && listId) {
      const ref = doc(db, 'lists', listId, 'productHistory', 'data');
      setDoc(ref, history, { merge: true }).catch(err => console.error('Error saving history:', err));
    }
  };

  const handleAddItem = (itemName = null, itemCategory = null) => {
    let name = itemName || searchTerm.trim();
    if (!name) return;

    // Find DB product for categorization only – keep user's input as name
    const dbProduct = groceryDB.find(p =>
      normalize(p.name) === normalize(name) ||
      p.aliases.some(a => normalize(a) === normalize(name))
    );

    if (!itemName) {
      name = name.charAt(0).toUpperCase() + name.slice(1);
    }

    let category = itemCategory;
    if (!category) {
      const historyEntry = Object.entries(userProductHistory).find(
        ([histName]) => normalize(histName) === normalize(name)
      );
      if (historyEntry) {
        category = historyEntry[1].category;
      } else if (dbProduct) {
        category = dbProduct.category;
      } else {
        const result = findProductCategory(name);
        if (result) category = result.category;
      }
    }

    const newItem = {
      id: Date.now(),
      name,
      category: category || '',
      checked: false,
      addedBy: user?.email,
      addedAt: new Date().toISOString()
    };

    setActiveList(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setSearchTerm('');
    setInlineSuggestion(null);

    const updatedHistory = buildUpdatedHistory(name, category, userProductHistory);
    setUserProductHistory(updatedHistory);
    persistHistory(updatedHistory);
  };

  const handleAddInkopItem = (itemName = null) => {
    let name = itemName || searchTerm.trim();
    if (!name) return;
    if (!itemName) {
      name = name.charAt(0).toUpperCase() + name.slice(1);
    }
    const newItem = {
      id: Date.now(),
      name,
      checked: false,
      addedBy: user?.email,
      addedAt: new Date().toISOString()
    };
    setInkopList(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setSearchTerm('');
    setInlineSuggestion(null);
    const updatedHistory = buildUpdatedHistory(name, '', userProductHistory);
    setUserProductHistory(updatedHistory);
    persistHistory(updatedHistory);
  };

  const toggleCheck = (id) => {
    const item = activeList.items.find(i => i.id === id);
    if (item && !item.checked) {
      setFadingIds(prev => [...prev, id]);
      setTimeout(() => {
        setActiveList(prev => ({
          ...prev,
          items: prev.items.map(i => i.id === id ? { ...i, checked: true, checkedAt: new Date().toISOString() } : i)
        }));
        setFadingIds(prev => prev.filter(fid => fid !== id));
      }, 300);
    } else {
      setActiveList(prev => ({
        ...prev,
        items: prev.items.map(i => i.id === id ? { ...i, checked: !i.checked } : i)
      }));
    }
  };

  const deleteItem = (id) => {
    setActiveList(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const toggleInkopCheck = (id) => {
    setInkopList(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id
        ? { ...item, checked: !item.checked, checkedAt: !item.checked ? new Date().toISOString() : item.checkedAt }
        : item)
    }));
  };

  const deleteInkopItem = (id) => {
    setInkopList(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
      alert('Kunde inte logga in: ' + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setListId(null);
      listLoaded.current = false;
      inkopLoaded.current = false;
      setActiveList({ id: Date.now(), items: [], createdAt: new Date().toISOString() });
      setInkopList({ id: Date.now(), items: [] });
      setUserProductHistory({});
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Load product history from Firestore when listId is available
  useEffect(() => {
    if (!user || !listId) { setUserProductHistory({}); return; }
    const ref = doc(db, 'lists', listId, 'productHistory', 'data');
    getDoc(ref).then(snap => {
      if (snap.exists()) setUserProductHistory(snap.data());
    }).catch(err => console.error('Error loading history:', err));
  }, [user, listId]);

  // Subscribe to inköp list
  useEffect(() => {
    if (!user || !listId) return;
    const inkopRef = doc(db, 'lists', listId, 'inköp', 'active');
    const unsubscribe = onSnapshot(inkopRef, (docSnap) => {
      if (docSnap.exists()) {
        isInkopRemoteUpdate.current = true;
        setInkopList(docSnap.data());
      }
      inkopLoaded.current = true;
    });
    return () => unsubscribe();
  }, [user, listId]);

  // Save inköp list on local changes
  useEffect(() => {
    if (!user || !listId || !inkopLoaded.current) return;
    if (isInkopRemoteUpdate.current) { isInkopRemoteUpdate.current = false; return; }
    const inkopRef = doc(db, 'lists', listId, 'inköp', 'active');
    setDoc(inkopRef, { ...inkopList, updatedAt: new Date().toISOString() })
      .catch(err => console.error('Error saving inköp list:', err));
  }, [inkopList, user, listId]);

  useEffect(() => {
    if (!editingCategoryId || !dropdownPosition) return;
    const handleMouseDown = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setEditingCategoryId(null);
        setDropdownPosition(null);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [editingCategoryId, dropdownPosition]);

  useEffect(() => {
    if (!showInviteModal || !listId || !qrRef.current) return;
    const url = `https://christianbjornegren-prog.github.io/Shopping/?join=${listId}`;
    new window.QRCode(qrRef.current, { text: url, width: 200, height: 200 });
    return () => {
      if (qrRef.current) qrRef.current.innerHTML = '';
    };
  }, [showInviteModal, listId]);

  const checkedCount = activeList.items.filter(i => i.checked).length;
  const totalCount = activeList.items.length;

  // Combined dataset for the Statistik tab: every item ever recorded across
  // both lists carries addedAt/addedBy/category (and checkedAt going forward).
  const statsItems = useMemo(
    () => [...(activeList.items || []), ...(inkopList.items || [])],
    [activeList.items, inkopList.items]
  );

  const renderItem = (item) => (
    <div key={item.id} className={`group px-4 py-3 flex items-center gap-3 hover:bg-gray-750 transition-colors ${fadingIds.includes(item.id) ? 'opacity-0 transition-opacity duration-300' : ''}`}>
      <button
        onClick={() => toggleCheck(item.id)}
        aria-label={item.checked ? 'Ångra' : 'Bocka av'}
        className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 ${
          item.checked
            ? 'bg-green-500 border-green-500'
            : 'border-gray-600 hover:border-green-400'
        }`}
      >
        {item.checked && <Check className="w-4 h-4 text-white" />}
      </button>

      <span className="flex-shrink-0 text-lg leading-none w-6 text-center" aria-hidden="true">
        {getItemEmoji(item.name, item.category)}
      </span>

      <div className="flex-grow min-w-0">
        <div className="font-medium truncate">{item.name}</div>
      </div>

      <div className="relative flex-shrink-0">
        <button
          onClick={(e) => {
            if (window.innerWidth >= 768) {
              const rect = e.currentTarget.getBoundingClientRect();
              setDropdownPosition({ top: rect.bottom, left: rect.left });
              setEditingCategoryId(item.id);
            }
          }}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            item.category
              ? 'text-gray-300 border-gray-700 bg-gray-750 hover:bg-gray-700'
              : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20'
          }`}
        >
          {item.category || 'Osorterat'}
        </button>
        <select
          value={item.category || ''}
          onChange={(e) => {
            setActiveList(prev => ({
              ...prev,
              items: prev.items.map(i => i.id === item.id ? { ...i, category: e.target.value } : i)
            }));
          }}
          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer md:hidden"
        >
          <option value="">Osorterat</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <button
        onClick={() => deleteItem(item.id)}
        aria-label="Ta bort"
        className="flex-shrink-0 p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors md:opacity-0 md:group-hover:opacity-100"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

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

  // Show login screen if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-3xl shadow-card border border-gray-750 p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-lg">
            <ShoppingCart className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">CHRELIN</h1>
          <p className="text-gray-400 mb-8">Smart inköpslista för svenska matvarubutiker</p>
          <button
            onClick={handleLogin}
            className="w-full bg-white text-gray-900 py-3 px-6 rounded-xl font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Logga in med Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-850/90 backdrop-blur border-b border-gray-750 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-extrabold tracking-tight">CHRELIN</h1>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowInviteModal(true)}
                className="p-2.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-xl transition-colors"
                title="Bjud in"
              >
                <UserPlus className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-xl transition-colors"
                title="Logga ut"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-850 border-b border-gray-750">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex gap-2 bg-gray-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 py-2 px-4 font-semibold text-sm rounded-lg transition-colors ${
                activeTab === 'active'
                  ? 'bg-green-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Matvaror
            </button>
            <button
              onClick={() => setActiveTab('inkop')}
              className={`flex-1 py-2 px-4 font-semibold text-sm rounded-lg transition-colors ${
                activeTab === 'inkop'
                  ? 'bg-green-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Inköp
            </button>
            <button
              onClick={() => setActiveTab('statistik')}
              className={`flex-1 py-2 px-4 font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'statistik'
                  ? 'bg-green-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Statistik
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'statistik' ? (
          <StatsView items={statsItems} history={userProductHistory} />
        ) : activeTab === 'active' ? (
          <>
            {/* Add Item Section */}
            <div className="bg-gray-800 rounded-2xl shadow-card border border-gray-750 p-4 mb-5">
                <div className="relative mb-3 bg-gray-750 rounded-xl border border-gray-700 focus-within:border-green-500 transition-colors">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  {inlineSuggestion && searchTerm && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 flex items-center pl-10 pr-4 text-gray-500 pointer-events-none overflow-hidden whitespace-nowrap select-none"
                    >
                      {inlineSuggestion}
                    </span>
                  )}
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      setSearchTerm(newVal);
                      setInlineSuggestion(getInlineCompletion(newVal));
                    }}
                    onKeyDown={(e) => {
                      // Ghost-text autocomplete is only accepted with Tab / →.
                      if (inlineSuggestion && (e.key === 'Tab' || e.key === 'ArrowRight')) {
                        e.preventDefault();
                        setSearchTerm(inlineSuggestion);
                        setInlineSuggestion(null);
                        return;
                      }
                      if (e.key === 'Escape') {
                        setInlineSuggestion(null);
                        return;
                      }
                      // Enter always adds exactly what was typed — never the ghost
                      // suggestion (see resolveAddName in categorization.js).
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddItem();
                        setInlineSuggestion(null);
                      }
                    }}
                    placeholder="Vad ska du handla?"
                    className="relative w-full bg-transparent text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none"
                  />

                  {suggestions.length > 0 && searchTerm && (
                    <div className="absolute w-full bg-gray-750 mt-2 rounded-xl shadow-card overflow-hidden z-20 border border-gray-700">
                      {suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAddItem(suggestion.name, suggestion.category)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-700 flex justify-between items-center border-b border-gray-700 last:border-b-0"
                        >
                          <span className="font-medium flex items-center gap-2">
                            <span aria-hidden="true">{getItemEmoji(suggestion.name, suggestion.category)}</span>
                            {suggestion.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {suggestion.category || 'Osorterat'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleAddItem()}
                  className="w-full bg-green-600 hover:bg-green-500 active:scale-[0.99] text-white px-6 py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Lägg till
                </button>
            </div>

            {/* Quick-add favourites */}
            {!searchTerm && favorites.length > 0 && (
              <div className="mb-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 px-1">Snabbval</div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {favorites.map((fav) => (
                    <button
                      key={fav.name}
                      onClick={() => handleAddItem(fav.name, fav.category)}
                      className="flex-shrink-0 flex items-center gap-1.5 bg-gray-800 border border-gray-750 hover:border-green-500 hover:bg-gray-750 text-sm text-gray-200 pl-3 pr-3 py-2 rounded-full transition-colors"
                    >
                      <span aria-hidden="true">{getItemEmoji(fav.name, fav.category)}</span>
                      <span className="whitespace-nowrap">{fav.name}</span>
                      <Plus className="w-3.5 h-3.5 text-green-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Shopping List */}
            {totalCount === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-800 border border-gray-750 flex items-center justify-center">
                  <ShoppingCart className="w-10 h-10 opacity-60" />
                </div>
                <p className="font-medium text-gray-400">Din inköpslista är tom</p>
                <p className="text-sm mt-1">Börja lägga till varor ovan</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {/* Osorterat section */}
                  {(() => {
                    const unsortedItems = activeList.items.filter(i => !i.checked && !i.category);
                    if (unsortedItems.length === 0) return null;
                    return (
                      <div className="bg-gray-800 rounded-2xl shadow-card border border-gray-750 overflow-hidden">
                        <div className="bg-gray-850 px-4 py-2.5 font-semibold text-yellow-400 border-b border-gray-750 flex items-center gap-2">
                          <span>{categoryMeta['Osorterat'].emoji}</span>
                          Osorterat
                        </div>
                        <div className="divide-y divide-gray-750">
                          {unsortedItems.map(item => renderItem(item))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Category sections in defined order */}
                  {categories.map(cat => {
                    const catItems = activeList.items.filter(i => !i.checked && i.category === cat);
                    if (catItems.length === 0) return null;
                    const meta = categoryMeta[cat] || categoryMeta['Övrigt'];
                    return (
                      <div key={cat} className="bg-gray-800 rounded-2xl shadow-card border border-gray-750 overflow-hidden">
                        <div className={`bg-gray-850 px-4 py-2.5 font-semibold border-b border-gray-750 flex items-center gap-2 ${meta.accent}`}>
                          <span>{meta.emoji}</span>
                          {cat}
                        </div>
                        <div className="divide-y divide-gray-750">
                          {catItems.map(item => renderItem(item))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Collapsed checked items */}
                  {checkedCount > 0 && (
                    <div className="bg-gray-800 rounded-2xl border border-gray-750 overflow-hidden">
                      <button
                        onClick={() => setCheckedExpanded(prev => !prev)}
                        className="w-full px-4 py-3 flex items-center justify-between text-gray-400 hover:bg-gray-750 transition-colors"
                      >
                        <span>{checkedCount} köpta varor</span>
                        {checkedExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {checkedExpanded && (
                        <div className="divide-y divide-gray-750 border-t border-gray-750">
                          {activeList.items.filter(i => i.checked).map(item => (
                            <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                              <button
                                onClick={() => toggleCheck(item.id)}
                                className="flex-shrink-0 w-7 h-7 rounded-full border-2 bg-green-500 border-green-500 flex items-center justify-center"
                              >
                                <Check className="w-4 h-4 text-white" />
                              </button>
                              <span className="flex-grow line-through text-gray-500">{item.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          /* Inköp Tab */
          <>
            {/* Add Item Section */}
            <div className="bg-gray-800 rounded-2xl shadow-card border border-gray-750 p-4 mb-5">
              <div className="relative mb-3 bg-gray-750 rounded-xl border border-gray-700 focus-within:border-green-500 transition-colors">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                {inlineSuggestion && searchTerm && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 flex items-center pl-10 pr-4 text-gray-500 pointer-events-none overflow-hidden whitespace-nowrap select-none"
                  >
                    {inlineSuggestion}
                  </span>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    const newVal = e.target.value;
                    setSearchTerm(newVal);
                    setInlineSuggestion(getInlineCompletion(newVal));
                  }}
                  onKeyDown={(e) => {
                    // Ghost-text autocomplete is only accepted with Tab / →.
                    if (inlineSuggestion && (e.key === 'Tab' || e.key === 'ArrowRight')) {
                      e.preventDefault();
                      setSearchTerm(inlineSuggestion);
                      setInlineSuggestion(null);
                      return;
                    }
                    if (e.key === 'Escape') { setInlineSuggestion(null); return; }
                    // Enter always adds exactly what was typed — never the ghost suggestion.
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddInkopItem();
                      setInlineSuggestion(null);
                    }
                  }}
                  placeholder="Vad ska du handla?"
                  className="relative w-full bg-transparent text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none"
                />
                {suggestions.length > 0 && searchTerm && (
                  <div className="absolute w-full bg-gray-750 mt-2 rounded-xl shadow-card overflow-hidden z-20 border border-gray-700">
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAddInkopItem(suggestion.name)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-700 flex items-center border-b border-gray-700 last:border-b-0"
                      >
                        <span className="font-medium">{suggestion.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleAddInkopItem()}
                className="w-full bg-green-600 hover:bg-green-500 active:scale-[0.99] text-white px-6 py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Lägg till
              </button>
            </div>

            {/* Inköp List */}
            {inkopList.items.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-800 border border-gray-750 flex items-center justify-center">
                  <ShoppingCart className="w-10 h-10 opacity-60" />
                </div>
                <p className="font-medium text-gray-400">Din inköpslista är tom</p>
                <p className="text-sm mt-1">Börja lägga till varor ovan</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inkopList.items.filter(i => !i.checked).length > 0 && (
                  <div className="bg-gray-800 rounded-2xl shadow-card border border-gray-750 overflow-hidden">
                    <div className="divide-y divide-gray-750">
                      {[...inkopList.items.filter(i => !i.checked)].sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt)).map(item => (
                        <div key={item.id} className="group px-4 py-3 flex items-center gap-3 hover:bg-gray-750 transition-colors">
                          <button
                            onClick={() => toggleInkopCheck(item.id)}
                            aria-label="Bocka av"
                            className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-gray-600 hover:border-green-400 flex items-center justify-center transition-all active:scale-90"
                          />
                          <span className="flex-grow min-w-0 truncate font-medium">{item.name}</span>
                          <button
                            onClick={() => deleteInkopItem(item.id)}
                            aria-label="Ta bort"
                            className="flex-shrink-0 p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors md:opacity-0 md:group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {inkopList.items.filter(i => i.checked).length > 0 && (
                  <div className="bg-gray-800 rounded-2xl border border-gray-750 overflow-hidden">
                    <button
                      onClick={() => setCheckedExpandedShopping(prev => !prev)}
                      className="w-full px-4 py-3 flex items-center justify-between text-gray-400 hover:bg-gray-750 transition-colors"
                    >
                      <span>{inkopList.items.filter(i => i.checked).length} köpta varor</span>
                      {checkedExpandedShopping ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {checkedExpandedShopping && (
                      <div className="divide-y divide-gray-750 border-t border-gray-750">
                        {inkopList.items.filter(i => i.checked).map(item => (
                          <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                            <button
                              onClick={() => toggleInkopCheck(item.id)}
                              className="flex-shrink-0 w-7 h-7 rounded-full border-2 bg-green-500 border-green-500 flex items-center justify-center"
                            >
                              <Check className="w-4 h-4 text-white" />
                            </button>
                            <span className="flex-grow line-through text-gray-500">{item.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-3xl border border-gray-750 shadow-card p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Scanna för att gå med</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-center mb-3">
              <div ref={qrRef} className="bg-white p-3 rounded-2xl" />
            </div>
            <p className="text-center text-gray-400 text-sm mb-4">Scanna med kameran – öppnas direkt i Safari</p>
            <button
              onClick={() => setShowInviteModal(false)}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-xl transition-colors"
            >
              Stäng
            </button>
          </div>
        </div>
      )}

      {/* Desktop portal dropdown */}
      {editingCategoryId && dropdownPosition && ReactDOM.createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: dropdownPosition.top, left: dropdownPosition.left }}
          className="bg-gray-800 border border-gray-700 rounded-xl shadow-card z-50 min-w-52 overflow-hidden py-1"
        >
          {categories.map(cat => {
            const editingItem = activeList.items.find(i => i.id === editingCategoryId);
            const meta = categoryMeta[cat] || categoryMeta['Övrigt'];
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveList(prev => ({
                    ...prev,
                    items: prev.items.map(i => i.id === editingCategoryId ? { ...i, category: cat } : i)
                  }));
                  setEditingCategoryId(null);
                  setDropdownPosition(null);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-2 text-white"
              >
                <span className={`w-4 inline-block ${editingItem?.category === cat ? 'text-green-400' : 'text-transparent'}`}>
                  ✓
                </span>
                <span>{meta.emoji}</span>
                {cat}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};

export default ShoppingListApp;

import { describe, it, expect } from 'vitest';
import { getItemEmoji } from './categorization.js';

// A broad sample of real Swedish groceries. Passed with NO category, so the
// only way to get a specific emoji is a keyword match – anything returning the
// "unknown" 🗂️ icon is a genuine coverage gap. Guards against future regressions.
const ITEMS = [
  'Rödbetor','Fänkål','Rädisor','Haricots verts','Rabarber','Plommon','Passionsfrukt','Dadlar','Rovor',
  'Sötpotatis','Granatäpple','Majskolv','Rotselleri',
  'Hushållsost','Grillost','Getost','Mesost','Skyr','Kesella','Långfil','Kärnmjölk','Crème fraiche',
  'Gräddfil','Cottage cheese','Riven ost',
  'Blodpudding','Leverpastej','Isterband','Prinskorv','Fläskkarré','Lammfärs','Kassler','Rökt lax',
  'Kräftor','Musslor','Kaviar','Ansjovis','Sardiner','Fiskbullar','Falukorv','Skinka',
  'Röda linser','Kikärtor','Bulgur','Couscous','Quinoa','Buljongtärning','Fond','Kokosgrädde','Jäst',
  'Bakpulver','Vaniljsocker','Ströbröd','Currypasta','Jordnötssmör','Lönnsirap','Chiafrön','Linfrön',
  'Solrosfrön','Pumpakärnor','Rostade lökringar','Pasta','Ris','Havregryn','Müsli',
  'Baguette','Ciabatta','Rostbröd','Knäckebröd','Tunnbröd','Pitabröd','Hamburgerbröd','Korvbröd',
  'Frallor','Kanelbulle','Wienerbröd','Semla','Pepparkakor','Kladdkaka',
  'Glass','Pommes','Fiskpinnar','Frysta bär','Frysta grönsaker','Pizza','Kycklingnuggets','Wokgrönsaker',
  'Kaffe','Te','Juice','Saft','Läsk','Cola','Vatten','Mineralvatten','Öl','Rödvin','Cider','Kombucha',
  'Energidryck','Smoothie','Havredryck',
  'Choklad','Godis','Lakrits','Chips','Ostbågar','Popcorn','Nötter','Kex','Gelégodis',
  'Toapapper','Hushållspapper','Diskmedel','Tvättmedel','Blöjor','Tandkräm','Tvål','Schampo','Balsam',
  'Deodorant','Rakhyvel','Hushållsfolie','Plastpåsar','Soppåsar','Kattmat','Hundmat','Batterier',
  'Stearinljus','Glödlampa','Diskborste','Disktrasa','Tandborste',
];

describe('emoji coverage', () => {
  it('gives almost every common grocery a specific (non-🗂️) emoji', () => {
    const gaps = ITEMS.filter(name => getItemEmoji(name, '') === '🗂️');
    // A tiny tail has no sensible dedicated emoji (they fall back to a fitting
    // category emoji in real use). Keep the gap list from growing.
    expect(gaps.length, `Uncovered: ${gaps.join(', ')}`).toBeLessThanOrEqual(4);
  });
});

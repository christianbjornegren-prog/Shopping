# Lärdomar: delad data i realtid

**Vad det här är.** Hårt vunna regler från CHRELIN, en delad inköpslista byggd i
React + Vite + Firestore + PWA på GitHub Pages. Två användare, två telefoner,
ofta dålig täckning i butik. Projektet tappade flera månaders data vid ett
tillfälle, och stod därefter helt still i flera dygn utan att spara någonting
alls, utan att det syntes.

**Hur du använder det.** Klistra in i `CLAUDE.md` eller som första meddelande i
ett nytt projekt med liknande upplägg. Reglerna är skrivna för att följas, och
varje regel har sin anledning efter sig, för det är anledningen som avgör hur
man dömer i gränsfallen.

**När gäller det här?** Så fort två enheter kan ändra samma data. Har du en
enanvändarapp utan delning är halva dokumentet överflödigt. Delar två personer
en lista gäller allt.

---

## 0. Bygg de här sex sakerna innan första funktionen

Ingen av dem är valfri. Var och en tillkom efter att något gått sönder, och var
och en hade kortat felsökningen från dagar till minuter om den funnits från
början.

1. **Driftlogg i klartext.** Tidsstämplade rader på vanlig svenska, sparade i
   `localStorage` så de överlever omstart, läsbara inne i appen, med en
   kopiera-knapp. Skriv en rad för varje anslutning, sparning, konflikt och
   fel. Det här var det enda som till slut löste den värsta buggen, och den
   hade kunnat lösas första dagen.
2. **Synlig synkstatus med egna lägen.** Minst: `Hämtar`, `Lokal kopia`,
   `Sparar`, `Synkad`, `Ingen kontakt`, `Åtkomst nekad`. Slå aldrig ihop dem.
   En tom lista och en förlorad lista ser exakt likadana ut för användaren, och
   ett behörighetsfel som kallas "ingen kontakt" skickar dig att felsöka nätet i
   en vecka.
3. **Laddningsläge.** Rendera aldrig "tomt" innan du vet att det är tomt. Visa
   en spinner tills servern har svarat.
4. **Versionshistorik på enheten, med återställning.** Spara de lägen servern
   har bekräftat i `localStorage` och ge användaren en återställ-knapp. Viktigt:
   **återställning ska bara lägga tillbaka det som saknas, aldrig ta bort
   något.** Annars kan återställningen själv bli nästa dataförlust.
5. **Error boundary.** En vit skärm säger ingenting. Visa felet, de senaste
   loggraderna, en kopiera-knapp och en ladda om-knapp.
6. **Byggspärr för miljövariabler.** Om `.env.local` saknas ska bygget stanna,
   inte lyckas. Annars skickar du ut en app som laddar, ser rätt ut och inte kan
   prata med någon backend.

---

## 1. Regler för varje dokument som två enheter delar

1. **Skriv aldrig ett helt dokument från klientens minne.** En klient som håller
   gårdagens state skriver över allt som hänt sedan dess. Det är den enskilt
   vanligaste orsaken till "avbockade varor kom tillbaka" och till total
   radering.
2. **Varje skrivning är en transaktion som läser om och trevägs-mergear.** Som
   en git-merge:
   - `base` = det serverläge klienten senast stämde av mot
   - `local` = det klienten har i minnet nu
   - `remote` = det servern har just nu, läst inne i transaktionen
3. **Mergeregler per post.** Finns i både local och remote: den som rörts senast
   vinner. Bara i remote: behåll om den tillkommit efter `base`, annars har vi
   raderat den. Bara i local: behåll om den är ny här, annars har någon annan
   raderat den.
4. **En klient får inte skriva förrän den har en serverbekräftad `base`.** Inte
   en cachad. Utan den regeln kan en app som inte hunnit ladda radera allt.
5. **Cachad data får visas, men aldrig användas som underlag för radering.**
   Skilj strikt på "det här visar jag" och "det här vet jag att servern har".
6. **Skyddsnät mot massradering.** Vägra en merge som vill ta bort fler än
   ~5 poster, och gör union i stället. Användargränssnittet raderar en sak i
   taget, så en merge som vill radera tjugo är alltid en bugg eller en
   kapplöpning. Det förvandlar "förlora allt" till "en vara dök upp igen".
7. **Signatur för att avgöra om en skrivning behövs.** En sorterad fingeravtryck
   av innehållet. Utan den får du en oändlig loop: spara → snapshot → spara.
8. **Stämpla `updatedAt` vid varje lokal ändring.** Även vid avbockning och
   avmarkering, annars förlorar en avmarkering mot en äldre avbockning.
9. **Spara osparade ändringar på disk direkt**, tillsammans med den `base` de
   gjordes mot. Annars försvinner det du gjorde i butiken när appen stängs. Att
   spara `base` med är poängen: utan den återuppstår en raderad vara vid nästa
   snapshot.
10. **Unika id:n.** `Date.now()` ensamt ger kollisioner när flera poster skapas i
    samma millisekund, till exempel vid röstinmatning eller inklistring. Det gav
    dubbla React-nycklar, och att bocka av en vara bockade av en annan. Lägg på
    en räknare.

---

## 2. Firestore-fällor som kostade mig veckor

1. **`onSnapshot` med lokal cache kräver `includeMetadataChanges: true`.**
   Den dyraste buggen i hela projektet.

   ```js
   onSnapshot(ref, { includeMetadataChanges: true }, onNext, onError)
   ```

   Med persistent cache påslagen levereras först den cachade kopian
   (`fromCache: true`) och sedan serverns svar. **Är datan identisk är serverns
   svar en ren metadata-ändring, och den levereras inte alls utan flaggan.**
   Appen väntade därför för evigt på en bekräftelse som aldrig kom, blev aldrig
   "redo", och sparade inte en enda ändring på flera dygn. På båda telefonerna
   samtidigt, vilket gjorde läget självlåsande.

2. **Transaktioner köas aldrig offline.** `setDoc` köas och skickas när nätet
   kommer tillbaka. `runTransaction` gör det inte, den misslyckas direkt. Väljer
   du transaktioner för säkerhetens skull, vilket du bör, så äger du själv både
   omförsöket och persistensen till disk. Annars lever ändringen bara i
   React-minnet och dör när appen stängs.

3. **En regel på `match /x/{id}` täcker inte underkollektioner.** Du behöver
   `match /x/{id}/{document=**}`. Det här gav `permission-denied` vid varje
   start i månader medan huvuddokumentet fungerade perfekt.

4. **`permission-denied` är regler, inte nät.** Ge det ett eget status-läge, en
   egen loggrad och en rejäl backoff. Att försöka igen var femte sekund hjälper
   aldrig och dränker loggen.

5. **Reglerna i konsolen är inte reglerna i repot.** Filen kan ligga i git utan
   att någonsin ha driftsatts. Verifiera vad som faktiskt gäller innan du bygger
   en teori på filen.

6. **Undvik icke-ASCII i sökvägar och samlingsnamn.** Vi hade `inköp` som
   samlingsnamn. Om regelmatchningen normaliserar `ö` annorlunda än sökvägen får
   du en nekad åtkomst som är omöjlig att se i koden. Håll dig till `a-z0-9-`.

7. **Håll datamodellen grund.** Varje underkollektion är en ny regelyta som kan
   glömmas bort. Kan det vara ett dokument på toppnivå, gör det till ett.

8. **Firestore vägrar `undefined` var som helst i dokumentet.** Rensa innan du
   skriver, annars kastas hela skrivningen.

9. **Testa nyckeln och projektet direkt när något är konstigt.** Två `curl` mot
   `identitytoolkit.googleapis.com` och `firestore.googleapis.com` svarar på en
   minut om det är nyckel, databas eller regler som är problemet. 403 betyder
   att reglerna nekade, alltså att databasen finns. 404 betyder att den inte
   gör det. Det sparar timmar av gissande i kod.

---

## 3. React-mönster som faktiskt raderade data

1. **Läs aldrig en ref inne i en `setState`-updater som du också uppdaterar
   utanför.** Updatern körs vid nästa rendering, och då pekar refen redan på det
   nya värdet. Vi mergeade serverdata mot sig själv och läste varenda vara som
   "raderad här". Fånga värdet i en lokal variabel före anropet.

2. **Anropa aldrig en sparning synkront direkt efter `setState`.** React har
   inte applicerat ändringen än, så sparningen läser det gamla läget. Det var
   exakt så en tom lista skrevs över flera månaders data. Debounca alltid.

3. **Håll en ref i takt med det React faktiskt kommer att hålla** om något
   utanför renderingen behöver läsa "nuvarande" state, till exempel en
   bakgrundssparning.

4. **Skilj på "sökvägen ändrades" och "sökvägen fick ett värde för första
   gången".** En reset-effekt som körs på `null → värde` raderar det användaren
   skrev medan inloggningen pågick.

5. **StrictMode kör updaters två gånger.** Lägg aldrig sidoeffekter i dem, som
   loggning eller notiser. Räkna ut resultatet utanför och sätt sedan state.

---

## 4. Tester som faktiskt fångar det här

1. **Bygg en fejk-backend som modellerar de jobbiga semantikerna**, inte de
   bekväma. Vår fejk skickade alltid `fromCache: false` och ignorerade
   lyssnaroptioner. Därför gick den värsta buggen rakt igenom en grön svit.
   Fejken ska kunna: cache först och serverbekräftelse sedan, transaktioner med
   riktig asynkron rundtur, nätfel, nekad åtkomst, och två klienter mot samma
   dokument.

2. **Varje bugg får ett test som misslyckas före fixen.** Kör testet mot den
   gamla koden och se det bli rött innan du fixar. Annars vet du inte om du har
   fixat något alls.

3. **Namnge testerna efter verkligheten.** "vara tillagd innan listan hunnit
   ladda", "ändring gjord utan täckning överlever att appen stängs", "servern
   töms av en trasig klient", "två enheter samtidigt". De hittar fel som
   enhetstester på rena funktioner aldrig ser.

4. **Städa upp mellan testerna.** Utan explicit `cleanup()` ligger gamla hooks
   kvar monterade med levande timers och skriver sitt inaktuella state in i
   nästa tests fejkserver. Det ger flakiga tester som ser ut som
   tidsproblem men är förorening.

---

## 5. Deploy och drift

1. **Bygget ska stanna om konfigurationen saknas.** Se punkt 0.6.
2. **Verifiera att det som ligger live är det du byggde.** Jämför filnamnet
   eller hashen på den deployade bundlen mot din lokala `dist/`. Tar tio
   sekunder och fångar halvlyckade deployer.
3. **Committa inte `dist/` eller `node_modules/`.** De skapar brus i varje diff
   och gör det svårt att se vad som faktiskt ändrats.
4. **`.env.local` är gitignorerad och kan försvinna.** Ha den säkrad någon
   annanstans. Vi fick återskapa Firebase-konfigurationen ur en deployad bundle.
5. **En PWA med `autoUpdate` kör den gamla versionen ett tag till efter
   deploy.** När du läser en logg efter en fix: kolla tidsstämplarna och avgör
   vilken version som faktiskt körde. Annars felsöker du en bugg du redan har
   fixat.

---

## 6. När något ändå går fel

1. **Felsök från loggen, inte från teorin.** Be om en exporterad driftlogg
   först. Utan den blir varje förklaring en gissning som låter rimlig.
2. **Förklaringen måste stämma med *all* bevisning.** Om en enda rad i loggen
   motsäger teorin är teorin fel, även om den förklarar nittio procent. Jag
   hävdade en gång en rotorsak som var sann som allmän regel men inte förklarade
   varför en annan underkollektion fungerade. Den detaljen var nyckeln.
3. **En fix i taget, deployad och observerad.** Fyra synkfixar i rad gav fyra
   nya regressioner, varav en raderade all data. Fixa, deploya, låt det gå ett
   dygn, läs loggen.
4. **Skilj på en larmande loggrad och ett faktiskt fel.** Vi hade en helt
   ofarlig `permission-denied` från ett engångsförsök som såg ut som ett
   haveri vid varje start. Formulera loggraderna så att nivån matchar allvaret,
   annars slutar du lita på din egen logg.
5. **Är datan borta är den borta.** Det finns ingen återställningsknapp i
   Firestore utan point-in-time recovery påslaget i förväg. Bestäm dig för
   backup innan du behöver den, inte efter.

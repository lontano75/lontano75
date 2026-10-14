# CERCAIMMAGINI

Skill per trovare immagini pertinenti, verificabili e pubblicabili per articoli.

Ordine di ricerca:

1. Siti delle fonti citate o consultate.
2. Google Immagini, aprendo sempre la pagina originale.
3. Stock gratuiti e banche immagini con licenza aperta.

Obiettivo: proporre immagini accurate, di buona qualità, con provenienza e condizioni d’uso chiare.

---

## 1. Analisi preliminare

Prima di cercare, individua:

- Tema principale dell’articolo.
- Angolo editoriale: notizia, spiegazione, fact-checking, recensione, analisi.
- 3-6 concetti visivi pertinenti.
- Persone, aziende, luoghi, date, eventi e termini tecnici rilevanti.
- Paese e contesto geografico.
- Formato necessario: hero orizzontale, verticale, quadrato, social, immagine interna.
- Eventuali vincoli etici o di sensibilità.

Formulare almeno tre query visive diverse prima di iniziare la ricerca.

Esempio:

- “supermarket refrigerated display France”
- “cold chain supermarket food safety”
- “IoT industrial controller cybersecurity”

---

## 2. Ricerca nelle fonti

Cerca prima le immagini presso:

- Le testate citate nell’articolo.
- Università, istituti di ricerca, enti pubblici.
- Aziende, produttori o organizzazioni direttamente coinvolte.
- Agenzie fotografiche e fonti fotografiche ufficiali.
- Comunicati stampa, pagine istituzionali e materiali ufficiali.

Per ogni immagine trovata registra:

- URL della pagina che contiene l’immagine.
- URL diretto dell’immagine, se disponibile.
- Autore o fotografo.
- Fonte.
- Data di pubblicazione.
- Didascalia originale.
- Licenza o condizioni d’uso.
- Eventuale necessità di attribuzione.

Regole:

- Non attribuire a una fonte un’immagine che non proviene da quella fonte.
- Se l’immagine appartiene a una testata o agenzia, segnalarla come “da richiedere in licenza”, salvo diversa indicazione esplicita.
- Preferire immagini originali e contestualizzate rispetto a stock generici.
- Se la fonte non autorizza il riutilizzo, cercare un’alternativa.

---

## 3. Ricerca su Google Immagini

Usare Google Immagini solo se le fonti non offrono un’immagine adeguata.

Procedura:

1. Fare query precise in italiano e inglese.
2. Provare sinonimi, termini tecnici, nomi di aziende, luoghi ed eventi.
3. Filtrare per immagini grandi e, quando utile, per diritti di riutilizzo.
4. Aprire sempre la pagina originale, non soltanto il risultato di Google Immagini.
5. Verificare autore, fonte, data, contesto e licenza sulla pagina originale.
6. Scartare immagini senza provenienza chiara.

Scartare automaticamente:

- Immagini con watermark.
- Immagini senza pagina sorgente identificabile.
- Immagini social senza crediti verificabili.
- Immagini manipolate, decontestualizzate o di dubbia autenticità.
- Immagini fuori tema o puramente decorative.
- Immagini che ritraggono persone identificabili in contesti potenzialmente diffamatori.
- Immagini di minori, vittime, incidenti o crimini senza necessità editoriale chiara.

---

## 4. Stock gratuiti e licenze aperte

Se non emergono immagini editoriali utilizzabili, cercare su:

- Unsplash
- Pexels
- Pixabay
- Wikimedia Commons
- Openverse
- Flickr, limitatamente a immagini con licenza aperta chiaramente indicata

Per ogni immagine stock indicare:

- Servizio.
- URL della pagina immagine.
- URL diretto dell’immagine.
- Autore.
- Licenza.
- Attribuzione richiesta o non richiesta.
- Risoluzione.
- Orientamento.
- Pertinenza rispetto all’articolo.

Non definire “libera” un’immagine senza aver verificato la licenza sulla pagina ufficiale.

---

## 5. API e integrazioni

Le chiavi non vanno scritte in questo file, che sta in un repository pubblico. Si leggono dalle variabili d'ambiente: in locale da un file `.env` (escluso da git tramite `.gitignore`, modello in `.env.example`), in produzione dalle variabili d'ambiente di Render.

> **Nota di sicurezza:** non incollare le chiavi in repository pubblici o in file inviati a terzi. Se una chiave finisce per errore in un commit, va rigenerata dal pannello del servizio.

### Unsplash

```text
Variabile:        UNSPLASH_ACCESS_KEY
Endpoint ricerca: https://api.unsplash.com/search/photos
Autenticazione:   header  Authorization: Client-ID <UNSPLASH_ACCESS_KEY>
Documentazione:   https://unsplash.com/documentation
Limite (demo):    circa 50 richieste l'ora
```

Regole d'uso: citare sempre fotografo e Unsplash, usare gli URL delle immagini restituiti dall'API e, quando un'immagine viene scelta, chiamare il suo `links.download_location` per registrare il download.

### Pexels

```text
Variabile:        PEXELS_API_KEY
Endpoint ricerca: https://api.pexels.com/v1/search
Autenticazione:   header  Authorization: <PEXELS_API_KEY>
Documentazione:   https://www.pexels.com/api/documentation/
Limite:           200 richieste l'ora, 20.000 al mese
```

Regole d'uso: indicare Pexels come fonte e, quando possibile, il fotografo con link alla sua pagina.

### Pixabay

```text
Variabile:        PIXABAY_API_KEY
Endpoint ricerca: https://pixabay.com/api/?key=<PIXABAY_API_KEY>&q=<query>&image_type=photo
Documentazione:   https://pixabay.com/api/docs/
Limite:           100 richieste ogni 60 secondi
```

Regole d'uso: le immagini scelte vanno scaricate e caricate sul sito, senza linkarle in modo permanente dai server di Pixabay. Mostrare Pixabay come fonte quando si presentano i risultati.

### Openverse

```text
Variabili:        OPENVERSE_CLIENT_ID, OPENVERSE_CLIENT_SECRET, OPENVERSE_API_TOKEN
Endpoint ricerca: https://api.openverse.org/v1/images/?q=<query>
Autenticazione:   header  Authorization: Bearer <OPENVERSE_API_TOKEN>  (facoltativo)
Documentazione:   https://api.openverse.org/v1/
```

La ricerca funziona anche senza token, con limiti più bassi. Per ottenere le credenziali:

1. Registrare l'applicazione (una sola volta):

   ```bash
   curl -X POST https://api.openverse.org/v1/auth_tokens/register/ \
     -H "Content-Type: application/json" \
     -d '{"name":"CercaImmagini","description":"Ricerca di immagini con licenza aperta per gli articoli del blog lontano75","email":"gianniluca@gmail.com"}'
   ```

   La risposta contiene `client_id` e `client_secret`: salvarli in `.env`.
2. Confermare l'indirizzo email dal link che Openverse invia a gianniluca@gmail.com.
3. Chiedere il token (scade dopo alcune ore, si rigenera con la stessa chiamata):

   ```bash
   curl -X POST https://api.openverse.org/v1/auth_tokens/token/ \
     -d "grant_type=client_credentials&client_id=$OPENVERSE_CLIENT_ID&client_secret=$OPENVERSE_CLIENT_SECRET"
   ```

   Il valore `access_token` della risposta va in `OPENVERSE_API_TOKEN`.

Ogni risultato di Openverse riporta licenza e fonte originale: controllarle comunque sulla pagina dell'immagine prima di proporla.

### Wikimedia Commons

```text
Endpoint ricerca: https://commons.wikimedia.org/w/api.php
Chiave API:       non richiesta
User-Agent:       CercaImmagini/1.0 (gianniluca@gmail.com)
```

Ogni richiesta a Wikimedia Commons deve includere l'header `User-Agent` con il nome dello strumento e un contatto. Senza questo header Wikimedia può rifiutare o bloccare le richieste. Esempio di ricerca:

```bash
curl -G "https://commons.wikimedia.org/w/api.php" \
  -H "User-Agent: CercaImmagini/1.0 (gianniluca@gmail.com)" \
  --data-urlencode "action=query" \
  --data-urlencode "format=json" \
  --data-urlencode "generator=search" \
  --data-urlencode "gsrnamespace=6" \
  --data-urlencode "gsrsearch=supermarket refrigerated display" \
  --data-urlencode "gsrlimit=20" \
  --data-urlencode "prop=imageinfo" \
  --data-urlencode "iiprop=url|size|extmetadata"
```

Il campo `extmetadata` riporta autore (`Artist`), licenza (`LicenseShortName`) e obbligo di attribuzione (`AttributionRequired`): sono i dati da riportare nella tabella di output.

### Google Programmable Search (dismessa)

La Custom Search JSON API di Google non accetta nuovi clienti e verrà spenta il 1° gennaio 2027. Non va configurata. La ricerca su Google Immagini (sezione 3) si fa a mano nel browser, aprendo sempre la pagina originale di ogni risultato.

---

## 6. Output richiesto

Restituire una tabella ordinata per priorità:

| Priorità | Uso consigliato | Immagine | Fonte | URL pagina | URL immagine | Autore | Licenza / condizioni | Perché funziona | Rischi o azioni necessarie |
|---|---|---|---|---|---|---|---|---|---|

Dopo la tabella fornire:

- 3 opzioni per l’immagine hero.
- 2-3 opzioni per immagini interne.
- 1-2 opzioni per social, se richiesto.
- Didascalia breve in italiano per ogni immagine.
- Testo `alt` SEO-friendly per ogni immagine.
- Crediti obbligatori, se presenti.
- Avviso esplicito se un’immagine richiede autorizzazione, licenza o verifica aggiuntiva.

Formato consigliato per `alt`:

```text
[Breve descrizione visiva] — [contesto editoriale]
```

Esempio:

```text
Banco refrigerato di un supermercato con prodotti freschi — illustrazione della catena del freddo nella grande distribuzione
```

---

## 7. Checklist finale

Prima di proporre un’immagine, verificare:

- [ ] L’immagine è realmente pertinente al tema dell’articolo.
- [ ] La pagina sorgente è raggiungibile.
- [ ] L’autore è indicato o ricostruibile.
- [ ] La fonte è affidabile.
- [ ] La licenza è chiaramente indicata.
- [ ] L’uso editoriale è consentito.
- [ ] L’uso commerciale è consentito, se rilevante.
- [ ] È chiaro se serve attribuzione.
- [ ] Non ci sono watermark.
- [ ] La risoluzione è adeguata all’uso previsto.
- [ ] L’immagine non è manipolata o decontestualizzata.
- [ ] Persone, luoghi ed eventi raffigurati corrispondono alla realtà.
- [ ] L’immagine non crea un’associazione fuorviante con la notizia.
- [ ] Esiste un’alternativa stock se l’immagine editoriale non è utilizzabile.
- [ ] La didascalia e il testo alt sono stati predisposti.

Se anche una sola voce fondamentale non è verificabile, scrivere:

> **Da verificare prima della pubblicazione.**

---

## 8. Regole editoriali

- Privilegiare accuratezza, contesto e verificabilità.
- Non usare immagini sensazionalistiche per notizie delicate.
- Non usare immagini di sofferenza, morte, crimini o minori se non strettamente necessarie.
- Non associare persone o aziende a fatti non accertati tramite immagini fuorvianti.
- Distinguere sempre tra immagine editoriale, immagine stock e immagine generata con AI.
- Se si propone un’immagine generata con AI, etichettarla chiaramente come tale e non usarla per documentare un evento reale.

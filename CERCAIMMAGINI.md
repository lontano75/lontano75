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

Inserire qui le chiavi API e le istruzioni di connessione.

> **Nota di sicurezza:** non condividere le chiavi API in chat, repository pubblici o file inviati a terzi. In un ambiente di produzione, usare variabili d’ambiente o un gestore di segreti.

### Unsplash

```text
UNSPLASH_ACCESS_KEY =
UNSPLASH_SECRET_KEY =
Endpoint ricerca: https://api.unsplash.com/search/photos
Documentazione:   https://unsplash.com/developers
```

### Pexels

```text
PEXELS_API_KEY =
Endpoint ricerca: https://api.pexels.com/v1/search
Documentazione:   https://www.pexels.com/api/
```

### Pixabay

```text
PIXABAY_API_KEY =
Endpoint ricerca: https://pixabay.com/api/
Documentazione:   https://pixabay.com/api/docs/
```

### Openverse

```text
OPENVERSE_API_TOKEN =
Endpoint ricerca: https://api.openverse.org/v1/images/
Documentazione:   https://api.openverse.org/
```

### Wikimedia Commons

```text
WIKIMEDIA_API_ENDPOINT = https://commons.wikimedia.org/w/api.php
Autenticazione: generalmente non richiesta per ricerche pubbliche
```

### Google Programmable Search / Immagini

```text
GOOGLE_API_KEY =
GOOGLE_SEARCH_ENGINE_ID =
Endpoint ricerca: https://www.googleapis.com/customsearch/v1
Nota: verificare che il motore personalizzato sia configurato per la ricerca di immagini.
```

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

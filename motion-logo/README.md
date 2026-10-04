# Motion graphic del logo Futuro Prossimo

Animazione di 4 secondi, 1920×1080, 30 fps. Il contorno di ogni forma si traccia da sinistra a destra, poi il colore riempie le forme, il logo si assesta con una piccola spinta e si chiude con un riflesso di luce.

## Come generarla

```bash
# il logo è già in motion-logo/logo.svg
cd motion-logo
NODE_PATH=$(npm root -g) node render.js logo.svg output
```

## Cosa esce in `output/` (i file già pronti sono in `video/`)

| File | A cosa serve |
|---|---|
| `futuroprossimo-logo-greenscreen.mp4` | **YouCut**: aggiungilo come PIP sopra la clip e usa *Chroma key* sul verde |
| `logo-finale.png` | sticker fisso trasparente |
| `futuroprossimo-logo-alpha.webm` | trasparenza vera (VP9 alfa) per CapCut desktop, DaVinci, web |
| `futuroprossimo-logo-alpha.mov` | ProRes 4444 con alfa per Premiere e Final Cut |

Se il logo contiene del verde, cambia colore di fondo: `KEY_COLOR=0xFF00FF node render.js logo.svg output`.

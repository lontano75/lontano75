<?php
/**
 * Futuro Prossimo – barra "Seguici" (Google fonte preferita, Discover)
 *
 * Installazione: incolla tutto in un nuovo snippet PHP di WPCode / Code Snippets
 * (tipo "PHP snippet", esegui ovunque), oppure in fondo al functions.php del tema.
 *
 * Posizione: vedi FP_SEGUICI_POSIZIONE più sotto.
 */

if (!defined('ABSPATH')) {
	exit;
}

/* ------------------------------------------------------------------ */
/* Impostazioni                                                        */
/* ------------------------------------------------------------------ */

// Link al profilo Discover (profile.google.com/cp/...). Lascialo vuoto e il
// pulsante Discover sparisce: resta solo quello delle fonti preferite.
define('FP_SEGUICI_DISCOVER', '');

define('FP_SEGUICI_PREFERITI', 'https://www.google.com/preferences/source?q=futuroprossimo.it');

// 'tema'      → la barra esce solo dove nel template richiami fp_seguici()
//               (scelta consigliata: mettila subito dopo la riga autore/data).
// 'contenuto' → senza toccare il tema: la barra va in cima al testo
//               dell'articolo, cioè sotto la foto di apertura.
define('FP_SEGUICI_POSIZIONE', 'tema');

/* ------------------------------------------------------------------ */
/* Markup                                                              */
/* ------------------------------------------------------------------ */

function fp_seguici_html() {
	$icona_google = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.9 6.2C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C1 16.5 0 20.1 0 24s1 7.5 2.7 10.8l7.8-6.2z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.2C6.6 42.6 14.6 48 24 48z"/></svg>';

	$icona_discover = '<svg viewBox="0 0 24 24" aria-hidden="true"><g stroke-width="3.2" stroke-linecap="round"><path stroke="#4285F4" d="M12 12h9"/><path stroke="#4285F4" d="M12 12l6.4 6.4"/><path stroke="#34A853" d="M12 12v9"/><path stroke="#34A853" d="M12 12l-6.4 6.4"/><path stroke="#FBBC05" d="M12 12H3"/><path stroke="#FBBC05" d="M12 12L5.6 5.6"/><path stroke="#EA4335" d="M12 12V3"/><path stroke="#EA4335" d="M12 12l6.4-6.4"/></g></svg>';


	$pulsanti = array(
		array(FP_SEGUICI_PREFERITI, $icona_google, 'Fonte preferita', 'Aggiungi Futuro Prossimo alle fonti preferite di Google'),
		array(FP_SEGUICI_DISCOVER, $icona_discover, 'Discover', 'Segui Futuro Prossimo su Google Discover'),
	);

	$html = '';
	foreach ($pulsanti as $p) {
		if (empty($p[0])) {
			continue;
		}
		$html .= sprintf(
			'<a class="fp-seguici__btn" href="%s" target="_blank" rel="noopener" aria-label="%s">%s<span>%s</span></a>',
			esc_url($p[0]),
			esc_attr($p[3]),
			$p[1],
			esc_html($p[2])
		);
	}

	return '<nav class="fp-seguici" aria-label="Segui Futuro Prossimo">' . $html . '</nav>';
}

/** Da richiamare nel template: <?php fp_seguici(); ?> */
function fp_seguici() {
	if (is_singular('post')) {
		echo fp_seguici_html();
	}
}

add_shortcode('fp_seguici', 'fp_seguici_html');

add_filter('the_content', function ($content) {
	if (FP_SEGUICI_POSIZIONE === 'contenuto' && is_singular('post') && in_the_loop() && is_main_query()) {
		return fp_seguici_html() . $content;
	}
	return $content;
}, 5);

/* ------------------------------------------------------------------ */
/* Stile                                                               */
/* ------------------------------------------------------------------ */

add_action('wp_head', function () {
	if (!is_singular('post')) {
		return;
	}
	?>
<style id="fp-seguici-css">
.fp-seguici{
	--fp-seg-testo:#1d3b26;
	--fp-seg-fondo:#ffffff;
	--fp-seg-bordo:rgba(29,59,38,.14);
	display:flex;gap:8px;margin:14px 0 18px;padding:0;
}
.fp-seguici__btn{
	flex:1 1 0;min-width:0;min-height:40px;box-sizing:border-box;
	display:flex;align-items:center;justify-content:center;gap:7px;
	padding:6px 6px;border:1px solid var(--fp-seg-bordo);border-radius:12px;
	background:var(--fp-seg-fondo);color:var(--fp-seg-testo)!important;
	font-family:inherit;font-size:12px;font-weight:600;line-height:1.15;
	letter-spacing:.04em;text-transform:uppercase;text-decoration:none!important;
	transition:border-color .15s,box-shadow .15s;
}
.fp-seguici__btn:hover,.fp-seguici__btn:focus-visible{
	border-color:rgba(29,59,38,.35);box-shadow:0 1px 6px rgba(29,59,38,.08);
}
.fp-seguici__btn svg{width:18px;height:18px;flex:0 0 18px}
.fp-seguici__btn span{text-align:left;overflow-wrap:normal;hyphens:none}
@media (max-width:380px){
	.fp-seguici{gap:6px}
	.fp-seguici__btn{font-size:11px;letter-spacing:.02em;gap:5px;padding:6px 4px}
	.fp-seguici__btn svg{width:16px;height:16px;flex-basis:16px}
}
</style>
	<?php
});

// Phrases that ask the user to type something to confirm, per language.
// They run against normalised text: lower case, no accents, single spaces.
(() => {
  const ns = (globalThis.__ydi ??= {});

  // Anything up to 160 chars that does not cross a sentence end (". " etc).
  // Dots inside names such as "my.app.dev" are allowed.
  const GAP = String.raw`(?:(?![.!?](?:\s|$)).){0,160}?`;

  const rx = (s) => new RegExp(s.replaceAll('GAP', GAP));

  ns.CONFIRM_PATTERNS = [
    // English
    rx(String.raw`\b(?:type|enter|write|input|retype)\bGAP\b(?:to (?:confirm|continue|proceed|delete|remove|verify|destroy|permanently)|below|in the (?:box|field|input|text ?box))\b`),
    rx(String.raw`\bto (?:confirm|continue|proceed|verify)\b,? (?:please )?(?:type|enter)\b`),
    rx(String.raw`\bconfirm(?:ation)? by (?:typing|entering)\b`),
    rx(String.raw`\bplease (?:type|enter)\b`),
    // Spanish
    rx(String.raw`\b(?:escribe|escriba|introduce|introduzca|ingresa|ingrese|teclea|teclee|digita|digite)\bGAP\b(?:para (?:confirmar|continuar|eliminar|borrar|proceder)|abajo|a continuacion|en el campo|en la casilla)\b`),
    rx(String.raw`\bpara (?:confirmar|continuar|proceder)\b,? (?:escribe|escriba|introduce|introduzca|ingresa|ingrese|teclea|teclee|digita|digite)\b`),
    // Portuguese
    rx(String.raw`\b(?:digite|escreva|insira|introduza)\bGAP\b(?:para (?:confirmar|continuar|excluir|apagar|prosseguir)|abaixo|no campo)\b`),
    rx(String.raw`\bpara (?:confirmar|continuar|prosseguir)\b,? (?:digite|escreva|insira|introduza)\b`),
    // French
    rx(String.raw`\b(?:tapez|saisissez|entrez|ecrivez|saisir|taper)\bGAP(?:\bpour (?:confirmer|continuer|supprimer)\b|ci-dessous|\bdans le champ\b)`),
    rx(String.raw`\bpour (?:confirmer|continuer)\b,? (?:tapez|saisissez|entrez|ecrivez)\b`),
    // German
    rx(String.raw`\b(?:geben sie|gib|tippe|tippen sie|schreibe|schreiben sie)\bGAP\b(?:ein|zur bestatigung|um zu bestatigen|um fortzufahren)\b`),
    rx(String.raw`\bzur bestatigung\b,? (?:geben sie|gib|tippe|tippen sie)\b`),
    // Italian
    rx(String.raw`\b(?:digita|scrivi|inserisci|digitare|scrivere|inserire)\bGAP\b(?:per (?:confermare|continuare|eliminare)|qui sotto|nel campo)\b`),
    rx(String.raw`\bper (?:confermare|continuare)\b,? (?:digita|scrivi|inserisci)\b`),
  ];

  // Verbs that come right before an unquoted ALL-CAPS token: "Type DELETE to confirm".
  ns.TYPE_VERBS = /\b(?:type|enter|retype|escribe|escriba|introduce|introduzca|ingresa|ingrese|teclea|digita|digite|escreva|insira|tapez|saisissez|entrez|gib|geben sie|tippe|digita|scrivi|inserisci)\b/gi;

  ns.normalize = (s) =>
    s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

  ns.isConfirmSentence = (s) => {
    const n = ns.normalize(s);
    return n.length > 0 && n.length < 600 && ns.CONFIRM_PATTERNS.some((re) => re.test(n));
  };
})();

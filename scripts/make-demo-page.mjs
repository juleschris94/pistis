// Transforme dist-demo/index.html (document complet) en page publiable : le service d'hébergement
// ajoute lui-même <!doctype>, <html>, <head> et <body>. On garde le titre, le style, la racine et le script.
import { readFileSync, writeFileSync } from 'node:fs';

const [input = 'dist-demo/index.html', output = 'dist-demo/pistis-essai.html'] = process.argv.slice(2);
const html = readFileSync(input, 'utf8');

const scriptStart = html.indexOf('<script type="module"');
const scriptEnd = html.indexOf('</script>', scriptStart) + '</script>'.length;
if (scriptStart < 0 || scriptEnd < scriptStart) throw new Error('script introuvable');
const script = html.slice(scriptStart, scriptEnd).replace(' crossorigin', '');

const rest = html.slice(0, scriptStart) + html.slice(scriptEnd);
const styleMatch = rest.match(/<style[^>]*>[\s\S]*?<\/style>/);
if (!styleMatch) throw new Error('style introuvable');
const style = styleMatch[0].replace(/ rel="stylesheet"| crossorigin/g, '');
const title = rest.match(/<title>[\s\S]*?<\/title>/)?.[0] ?? '<title>PISTIS</title>';
const description = rest.match(/<meta name="description"[^>]*>/)?.[0] ?? '';

const page = [title, description, '<meta name="theme-color" content="#07121f" />', style, '<div id="root"></div>', script, ''].join('\n');
writeFileSync(output, page);
console.log(`${output} : ${(page.length / 1024 / 1024).toFixed(2)} Mo`);

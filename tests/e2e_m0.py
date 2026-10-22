"""
Parcours M0 de bout en bout dans un vrai Chromium (Playwright).

Prérequis : `npm run build && npm run preview` (http://localhost:4173), puis :
    python3 tests/e2e_m0.py [dossier_de_sortie]

Vérifie : onboarding, photo sans EXIF, persistance après rechargement, mode hors ligne,
export chiffré, restauration dans un navigateur vierge, affichage mobile et ordinateur.
"""
import io
import sys
import tempfile
from pathlib import Path

from PIL import Image
from playwright.sync_api import expect, sync_playwright

URL = "http://localhost:4173/"
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp())
OUT.mkdir(parents=True, exist_ok=True)
PASSWORD = "mot-de-passe-test"


def make_photo_with_gps(path: Path) -> None:
    """JPEG 3000×2000 contenant une position GPS dans ses métadonnées EXIF."""
    img = Image.new("RGB", (3000, 2000), (50, 174, 220))
    exif = Image.Exif()
    exif[0x010F] = "AppareilTest"  # fabricant
    gps = exif.get_ifd(0x8825)
    gps[1] = "N"
    gps[2] = (48.0, 51.0, 24.0)
    exif[0x8825] = gps
    img.save(path, "JPEG", exif=exif.tobytes(), quality=95)
    assert b"Exif" in path.read_bytes()


def check(label: str, ok: bool) -> None:
    print(("OK   " if ok else "ÉCHEC") + " " + label)
    if not ok:
        raise SystemExit(1)


with sync_playwright() as p:
    browser = p.chromium.launch()
    photo = OUT / "photo-gps.jpg"
    make_photo_with_gps(photo)

    # 1. Onboarding sur un téléphone
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, accept_downloads=True)
    page = ctx.new_page()
    page.goto(URL)
    page.get_by_role("button", name="Commencer").click()
    page.get_by_label("Prénom").fill("Jules")
    page.get_by_label("Nom", exact=True).fill("Zobinou")
    page.get_by_label("Pseudo").fill("JC")
    page.locator("input[type=file]").set_input_files(str(photo))
    expect(page.get_by_text("métadonnées supprimées")).to_be_visible(timeout=10_000)
    page.screenshot(path=str(OUT / "1-profil-mobile.png"), full_page=True)
    page.get_by_role("button", name="Créer mon espace").click()
    expect(page.get_by_role("heading", name="Bienvenue, JC ! 👋")).to_be_visible()
    check("onboarding : profil créé et salutation affichée", True)

    # 2. Photo : plus de métadonnées EXIF dans l'image stockée
    img_bytes = page.evaluate(
        """async () => {
          const src = document.querySelector('.p-header img').src;
          const buf = await (await fetch(src)).arrayBuffer();
          return Array.from(new Uint8Array(buf));
        }"""
    )
    raw = bytes(img_bytes)
    check("photo : aucune métadonnée EXIF dans l'image stockée", b"Exif" not in raw)
    check("photo : miniature réduite à 320 px", max(Image.open(io.BytesIO(raw)).size) == 320)

    # 3. Persistance après rechargement (nouvelle session de page)
    page.reload()
    expect(page.get_by_role("heading", name="Bienvenue, JC ! 👋")).to_be_visible()
    expect(page.get_by_text("relu depuis la base")).to_be_visible()
    check("base : profil relu après rechargement", True)
    check("base : stockage OPFS persistant", page.get_by_text("OPFS").count() > 0)
    check("migrations : schéma en version 2 sur 2", page.get_by_text("version 2 sur 2").count() > 0)

    # 4. Hors ligne : service worker actif, puis rechargement sans réseau
    page.wait_for_function("navigator.serviceWorker && navigator.serviceWorker.controller !== null", timeout=15_000)
    ctx.set_offline(True)
    page.reload()
    expect(page.get_by_role("heading", name="Bienvenue, JC ! 👋")).to_be_visible(timeout=10_000)
    expect(page.get_by_text("hors ligne actuellement")).to_be_visible()
    check("hors ligne : l'application et les données s'ouvrent sans réseau", True)

    # 5. Test de sauvegarde intégré puis export chiffré (toujours hors ligne)
    page.get_by_role("button", name="Tester la sauvegarde").click()
    expect(page.get_by_text("Test réussi")).to_be_visible(timeout=20_000)
    page.get_by_label("Mot de passe de la sauvegarde (facultatif)").fill(PASSWORD)
    with page.expect_download() as dl:
        page.get_by_role("button", name="Exporter une sauvegarde").click()
    archive = OUT / dl.value.suggested_filename
    dl.value.save_as(archive)
    check("export : fichier chiffré créé hors ligne", archive.read_bytes()[:10] == b"PISTISENC1")
    page.screenshot(path=str(OUT / "2-banc-m0-mobile.png"), full_page=True)
    ctx.close()

    # 6. Restauration dans un navigateur vierge (autre « appareil »), sur grand écran
    ctx2 = browser.new_context(viewport={"width": 1280, "height": 900})
    page2 = ctx2.new_page()
    page2.goto(URL)
    page2.get_by_role("button", name="Commencer").click()
    page2.get_by_label("Pseudo").fill("Autre")
    page2.get_by_role("button", name="Créer mon espace").click()
    expect(page2.get_by_role("heading", name="Bienvenue, Autre ! 👋")).to_be_visible()
    page2.locator("#backup-file").set_input_files(str(archive))
    page2.get_by_role("button", name="Vérifier le fichier").click()
    expect(page2.get_by_text("chiffrée : saisis son mot de passe")).to_be_visible()
    page2.get_by_label("Mot de passe (si la sauvegarde est chiffrée)").fill("mauvais-mot-de-passe")
    page2.get_by_role("button", name="Vérifier le fichier").click()
    expect(page2.get_by_text("Mot de passe incorrect")).to_be_visible(timeout=20_000)
    check("import : mauvais mot de passe refusé", True)
    page2.get_by_label("Mot de passe (si la sauvegarde est chiffrée)").fill(PASSWORD)
    page2.get_by_role("button", name="Vérifier le fichier").click()
    expect(page2.get_by_text("Sauvegarde valide")).to_be_visible(timeout=20_000)
    page2.get_by_role("button", name="Remplacer mes données").click()
    expect(page2.get_by_role("heading", name="Bienvenue, JC ! 👋")).to_be_visible(timeout=10_000)
    check("restauration : profil et photo retrouvés dans un autre navigateur", page2.locator(".p-header img").count() == 1)
    page2.screenshot(path=str(OUT / "3-apres-restauration-ordinateur.png"), full_page=True)
    ctx2.close()

    # 7. Écran d'accueil (bienvenue) pour contrôle visuel
    ctx3 = browser.new_context(viewport={"width": 390, "height": 844})
    page3 = ctx3.new_page()
    page3.goto(URL)
    expect(page3.get_by_role("button", name="Commencer")).to_be_visible()
    page3.screenshot(path=str(OUT / "0-bienvenue-mobile.png"))
    ctx3.close()
    browser.close()

print(f"\nTous les contrôles M0 sont passés. Captures : {OUT}")

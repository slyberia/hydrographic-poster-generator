"""Create source-evidenced bounded profiles for the 21 unevaluated countries."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "backend/app/data/river_names"

COUNTRIES = {
    "atg": ("Antigua and Barbuda", "ATG", "440b9b80-dbbf-40f8-8fa7-a0b08c4c144e", "Antigua and Barbuda Department of Environment", "National Communication on Climate Change", "https://environment.gov.ag/wp-content/uploads/2025/10/unfccc-nc2.pdf", []),
    "brb": ("Barbados", "BRB", "eeb54b82-b7d3-49c6-b723-0f733eb726ed", "Government of Barbados", "First National Report on Biodiversity", "https://biodiversity.gov.bb/wp-content/uploads/2018/12/1st-National-Report.pdf", []),
    "bhs": ("The Bahamas", "BHS", "03712a29-e771-4f1b-a7c0-9e610fa84919", "Government of The Bahamas", "Environmental Baseline Statement", "https://opm.gov.bs/wp-content/uploads/2025/02/space-x-environmental-baseline-statement-25-march-2024.pdf", []),
    "cub": ("Cuba", "CUB", "975b2e35-9eea-4a66-b1af-7f524a2594b0", "Instituto Nacional de Recursos Hidráulicos", "National hydrological information", "https://www.hidro.gob.cu/", ["Cauto River", "Zaza River", "Toa River", "Sagua la Grande River", "Mayari River"]),
    "dma": ("Dominica", "DMA", "4a7adee4-70ad-457c-94e9-7b0bfaf8eab7", "Government of Dominica", "National adaptation and water resources information", "https://dominica.gov.dm/", ["Roseau River", "Layou River", "Indian River", "Picard River"]),
    "dom": ("Dominican Republic", "DOM", "c5653596-20f4-464d-8d35-13030af4ebab", "Instituto Nacional de Recursos Hidráulicos", "Cuentas del Agua de la República Dominicana", "https://cdn.bancentral.gov.do/documents/mig/otras-publicaciones/Cuentas_del_Agua_RD.pdf", ["Yaque del Norte River", "Yuna River", "Yaque del Sur River", "Ozama River", "Nizao River"]),
    "ecu": ("Ecuador", "ECU", "174e7dce-2e7e-4eca-a1d6-4d5d758249f9", "Ministerio del Ambiente, Agua y Transición Ecológica", "National water resources information", "https://www.ambiente.gob.ec/", ["Guayas River", "Esmeraldas River", "Napo River", "Pastaza River", "Santiago River"]),
    "slv": ("El Salvador", "SLV", "6660955a-d5c1-4a86-8c6e-623d30ca7a20", "Ministerio de Medio Ambiente y Recursos Naturales", "National water resources information", "https://www.ambiente.gob.sv/", ["Lempa River", "Paz River", "Jiboa River", "Grande de San Miguel River", "Goascoran River"]),
    "grd": ("Grenada", "GRD", "d113cff7-bd13-44db-8f70-618be78cfdee", "Government of Grenada", "National Water Policy and river network assessment", "https://climateresilience.gov.gd/docs/grenada-national-water-policy/", ["Great River", "Beausejour River", "Pearls River", "Saint Patrick River", "Saint John River", "Saint Mark River"]),
    "gtm": ("Guatemala", "GTM", "d78ade66-2be4-4c49-9cde-38240cc7e846", "Instituto Nacional de Sismología, Vulcanología, Meteorología e Hidrología", "National hydrological information", "https://insivumeh.gob.gt/", ["Motagua River", "Usumacinta River", "Polochic River", "Cahabon River", "Samatala River"]),
    "hti": ("Haiti", "HTI", "44dd9db5-6a1e-4766-be3c-59030aca395b", "Ministère de l'Environnement d'Haïti", "National water resources information", "https://mde.gouv.ht/", ["Artibonite River", "Trois Rivieres", "Grande Anse River", "Cavaillon River"]),
    "hnd": ("Honduras", "HND", "db1698aa-31b1-4957-a027-96614048703d", "Secretaría de Recursos Naturales y Ambiente", "National water resources information", "https://www.miambiente.gob.hn/", ["Patuca River", "Ulua River", "Aguan River", "Chamelecon River", "Cangrejal River"]),
    "kna": ("Saint Kitts and Nevis", "KNA", "df1cc76b-43bb-43c1-b0a7-9f6aafabc585", "Government of Saint Kitts and Nevis", "National water resources information", "https://www.gov.kn/", ["Wingfield River", "Cayon River", "College Street Ghaut"]),
    "lca": ("Saint Lucia", "LCA", "83858bfc-772f-4ede-bdde-88ac8d388753", "Government of Saint Lucia", "National water resources information", "https://www.govt.lc/", ["Cul de Sac River", "Mabouya River", "Dennery River", "Roseau River"]),
    "nic": ("Nicaragua", "NIC", "b2597d98-5c22-4c5a-bf62-adcaf8e6cebc", "Ministerio del Ambiente y los Recursos Naturales", "National hydrological information", "https://www.marena.gob.ni/", ["Coco River", "Grande de Matagalpa River", "Escondido River", "San Juan River", "Prin zapolka River"]),
    "pan": ("Panama", "PAN", "9becb85d-3ebf-40f5-8025-5671c9e0e6cc", "Instituto de Meteorología e Hidrología de Panamá", "National hydrological information", "https://www.imhpa.gob.pa/", ["Chagres River", "Tuira River", "Chucunaque River", "Bayano River", "Santa Maria River"]),
    "pry": ("Paraguay", "PRY", "8ad0af82-34f8-48f1-a047-69358a3134e9", "Ministerio del Ambiente y Desarrollo Sostenible", "Fourth National Communication: Hydrography", "https://www.mades.gov.py/wp-content/uploads/2025/04/Cuarta-Comunicacion-Nacional-de-Paraguay_UNFCCC1.pdf", ["Paraguay River", "Parana River", "Pilcomayo River", "Tebicuary River", "Ypane River"]),
    "tto": ("Trinidad and Tobago", "TTO", "69031d50-8109-446b-b162-92502ab91307", "Water and Sewerage Authority of Trinidad and Tobago", "National water resources information", "https://www.wasa.gov.tt/", ["Caroni River", "North Oropouche River", "South Oropouche River", "Nariva River", "Ortoire River"]),
    "ury": ("Uruguay", "URY", "8e4156af-eafb-437a-94c8-3446b50fee89", "Ministerio de Ambiente de Uruguay", "Regiones hidrográficas", "https://www.gub.uy/ministerio-ambiente/politicas-y-gestion/regiones-hidrograficas-1", ["Uruguay River", "Negro River", "Santa Lucia River", "Santa Lucia Chico River", "San Jose River"]),
    "vct": ("Saint Vincent and the Grenadines", "VCT", "e0cb94d8-083d-40bf-a6be-d048127b1bc6", "Government of Saint Vincent and the Grenadines", "National water resources information", "https://www.gov.vc/", ["Buccament River", "Wallilabou River", "Richmond River", "Rabacca River", "Colonarie River"]),
    "guf": ("French Guiana", "GUF", "f8c7e4d9-ed41-4ba2-ad7b-ccd219ad3a72", "Direction de l'Environnement de la Guyane", "Hydrological information for French Guiana", "https://www.guyane.developpement-durable.gouv.fr/", ["Maroni River", "Oyapock River", "Approuague River", "Mahury River", "Sinnamary River"])
}


def target(name: str) -> dict:
    base = name.removesuffix(" River")
    aliases = [base.casefold(), name.casefold(), f"rio {base.casefold()}", f"río {base.casefold()}"]
    return {"name": name, "aliases": sorted(set(aliases)), "queries": [f"{name}, {{country}}"]}


def main() -> None:
    registry_path = DATA / "country_registry.json"
    registry = json.loads(registry_path.read_text(encoding="utf-8"))
    existing = {item["slug"]: item for item in registry["countries"]}
    for slug, (country, code, geography_id, publisher, title, url, rivers) in COUNTRIES.items():
        profile = {
            "schema_version": 1,
            "slug": slug,
            "country": country,
            "country_code": code,
            "geography_id": geography_id,
            "independent_reference": {"publisher": publisher, "title": title, "url": url},
            "targets": [target(name) for name in rivers],
        }
        if not rivers:
            profile["profile_mode"] = "no_named_perennial_river_systems"
        for item in profile["targets"]:
            item["queries"] = [query.replace("{country}", country) for query in item["queries"]]
        path = DATA / slug / "build-profile.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(profile, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        existing[slug] = {"slug": slug, "country_code": code, "status": "not_evaluated", "profile": f"{slug}/build-profile.json", "manifest": f"{slug}/manifest.json"}
    registry["countries"] = [existing[key] for key in sorted(existing)]
    registry["purpose"] = "Approved country evaluation inputs and regression expectations for all current geography inventory entries."
    registry_path.write_text(json.dumps(registry, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Build data/rti-authorities.json from a saved allpa.php snapshot.

The official portal heading reports 2,916 public authorities. This snapshot
is a dated local copy, labelled mock, never presented as live.
"""
from __future__ import annotations

import json
import re
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = Path("/tmp/allpa.html")
CURATED_PATH = ROOT / "data" / "mock-directory.json"
OUT_PATH = ROOT / "data" / "rti-authorities.json"

STOP = {
    "the", "and", "of", "for", "to", "in", "on", "at", "a", "an", "ltd", "limited",
    "india", "indian", "department", "dept", "office", "organisation", "organization",
    "govt", "government", "ministry", "board", "cell", "unit", "wing", "division",
    "section", "public", "authority", "commission", "corporation", "council",
    "institute", "institution", "centre", "center", "national", "central", "state",
    "union",
}

# Curated codes whose names do not substring-match the official listing.
MANUAL = {
    "RAILBOARD": "Ministry of Railways",
    "ED": "Department of Revenue",
    "JAL-SHAKTI": "Ministry of Water Resources, River Development & Ganga Rejuvenation",
    "NTPC": "National Thermal Power Corporation",
    "DRDO": "Department of Defence",
}


def clean(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text).replace("\xa0", " ")
    return re.sub(r"\s+", " ", text).strip(" -")


def key(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def name_keywords(name: str) -> list[str]:
    acros = [a.lower() for a in re.findall(r"\(([A-Za-z0-9]{2,})\)", name)]
    tokens = re.findall(r"[A-Za-z][A-Za-z0-9]{2,}", name.lower())
    out: list[str] = []
    for token in acros + tokens:
        if token in STOP or token in out:
            continue
        out.append(token)
        if len(out) >= 10:
            break
    return out


def parse_rows(html: str) -> dict[str, dict]:
    rows = re.findall(
        r'<tr[^>]*data-level="(\d+)"[^>]*data-id="(\d+)"[^>]*data-parent="([^"]*)"[^>]*>\s*<td>(.*?)</td>\s*</tr>',
        html,
        re.I | re.S,
    )
    by_id: dict[str, dict] = {}
    for level, id_, parent, td in rows:
        name = clean(td)
        if not name:
            continue
        by_id[id_] = {"level": int(level), "id": id_, "parent": parent or None, "name": name}
    return by_id


def ministry_of(node: dict, by_id: dict[str, dict]) -> str:
    cur = node
    seen: set[str] = set()
    while cur:
        if cur["level"] == 0:
            return cur["name"]
        pid = cur["parent"]
        if not pid or pid in seen:
            break
        seen.add(pid)
        cur = by_id.get(pid)
    return node["name"]


def match_curated(curated: list[dict], official_list: list[dict]) -> dict[str, dict]:
    official_keys = [(p, key(p["name"])) for p in official_list]
    overlay: dict[str, dict] = {}
    by_name = {key(p["name"]): p for p in official_list}

    for item in curated:
        target = None
        manual = MANUAL.get(item["pa_code"])
        if manual:
            target = by_name.get(key(manual))
        if not target:
            ck = key(item["name"])
            codek = item["pa_code"].lower()
            best = None
            best_score = 0.0
            for p, pk in official_keys:
                score = 0.0
                if ck and (ck in pk or pk in ck):
                    score = min(len(ck), len(pk)) / max(len(ck), len(pk))
                if codek and len(codek) >= 3 and codek in pk:
                    score = max(score, 0.85)
                if score == 0 and ck[:12] and ck[:12] in pk:
                    score = 0.6
                if score > best_score:
                    best_score = score
                    best = p
            if best and best_score >= 0.55:
                target = best
        if not target:
            continue
        slot = overlay.setdefault(target["id"], {"keywords": [], "alias": item["pa_code"]})
        for kw in item["keywords"]:
            if kw not in slot["keywords"]:
                slot["keywords"].append(kw)
        slot["alias"] = item["pa_code"]
    return overlay


def main() -> None:
    html = HTML_PATH.read_text(errors="ignore")
    by_id = parse_rows(html)
    official_list = list(by_id.values())
    curated = json.loads(CURATED_PATH.read_text())
    overlay = match_curated(curated, official_list)

    authorities = []
    seen_codes: dict[str, str] = {}
    for p in official_list:
        extra = overlay.get(p["id"], {})
        kws = name_keywords(p["name"])
        for kw in extra.get("keywords", []):
            if kw not in kws:
                kws.append(kw)
        pa_code = extra.get("alias") or p["id"]
        rec = {
            "pa_code": pa_code,
            "name": p["name"],
            "ministry": ministry_of(p, by_id),
            "level": p["level"],
            "boost": bool(extra),
            "keywords": kws[:18],
        }
        if rec["pa_code"] in seen_codes:
            rec["pa_code"] = p["id"]
        else:
            seen_codes[rec["pa_code"]] = p["id"]
        authorities.append(rec)

    payload = {
        "snapshot": "2026-08-27",
        "source": "rtionline.gov.in/request/allpa.php",
        "portal_total": 2916,
        "count": len(authorities),
        "label": "dated snapshot of the official listing, not live",
        "authorities": authorities,
    }
    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
    boosted = sum(1 for a in authorities if a["boost"])
    print(f"wrote {OUT_PATH}  count={len(authorities)} boosted={boosted} bytes={OUT_PATH.stat().st_size}")


if __name__ == "__main__":
    main()

import argparse
import json
import sqlite3
import urllib.parse
import uuid


def normalize_url(raw: str) -> str:
    s = (raw or "").strip()
    if not s:
        return ""
    try:
        u = urllib.parse.urlsplit(s)
        scheme = u.scheme or "https"
        netloc = u.netloc
        path = u.path.rstrip("/")
        query = u.query
        return urllib.parse.urlunsplit((scheme, netloc, path, query, ""))
    except Exception:
        return s


def is_record(x) -> bool:
    return isinstance(x, dict)


def extract_item_urls(item: dict) -> list[str]:
    raw_urls: list[str] = []
    url = item.get("url")
    if isinstance(url, str) and url.strip():
        raw_urls.append(url.strip())
    citations = item.get("citations")
    if isinstance(citations, list):
        for c in citations:
            if not isinstance(c, dict):
                continue
            u = c.get("url")
            if isinstance(u, str) and u.strip():
                raw_urls.append(u.strip())
    evidence = item.get("evidenceUrls")
    if isinstance(evidence, list):
        for u in evidence:
            if isinstance(u, str) and u.strip():
                raw_urls.append(u.strip())
    out: list[str] = []
    seen: set[str] = set()
    for u in raw_urls:
        k = normalize_url(u)
        if not k or k in seen:
            continue
        seen.add(k)
        out.append(k)
    return out


def iter_items(obj: dict):
    categories = obj.get("categories") if isinstance(obj.get("categories"), list) else []
    for c in categories:
        if not isinstance(c, dict):
            continue
        themes = c.get("themes") if isinstance(c.get("themes"), list) else []
        for t in themes:
            if not isinstance(t, dict):
                continue
            items = t.get("items") if isinstance(t.get("items"), list) else []
            for it in items:
                if isinstance(it, dict):
                    yield it
        fallback_items = c.get("items") if isinstance(c.get("items"), list) else []
        for it in fallback_items:
            if isinstance(it, dict):
                yield it
    top_items = obj.get("items") if isinstance(obj.get("items"), list) else []
    for it in top_items:
        if isinstance(it, dict):
            yield it


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="prisma/dev.db")
    ap.add_argument("--date", default=None)
    ap.add_argument("--seed", action="store_true", default=True)
    ap.add_argument("--no-seed", dest="seed", action="store_false")
    args = ap.parse_args()

    con = sqlite3.connect(args.db)
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    if args.date:
        cur.execute("SELECT id,date,rawJson FROM DailyDigest WHERE date=? LIMIT 1", (args.date,))
    else:
        cur.execute("SELECT id,date,rawJson FROM DailyDigest ORDER BY date DESC LIMIT 1")
    digest = cur.fetchone()
    if not digest:
        raise SystemExit("no DailyDigest row")
    digest_id = digest["id"]
    date_str = digest["date"]
    raw_json = digest["rawJson"] or ""
    obj = json.loads(raw_json) if raw_json else {}
    if not isinstance(obj, dict):
        raise SystemExit("rawJson not object")

    cur.execute("SELECT id,name,status FROM TrackedEvent WHERE status='ACTIVE'")
    events = cur.fetchall()
    if not events:
        raise SystemExit("no ACTIVE TrackedEvent")
    event_id = events[0]["id"]
    event_name = events[0]["name"]

    cur.execute("SELECT COUNT(*) FROM EventNode")
    node_count = int(cur.fetchone()[0])

    first_url = ""
    for it in iter_items(obj):
        urls = extract_item_urls(it)
        if urls:
            first_url = urls[0]
            break

    if args.seed and node_count == 0 and first_url:
        seed_id = str(uuid.uuid4())
        cur.execute(
            "INSERT INTO EventNode (id,eventId,date,headline,content,sources) VALUES (?,?,?,?,?,?)",
            (
                seed_id,
                event_id,
                date_str,
                "seed: " + event_name,
                "seed content",
                json.dumps([first_url]),
            ),
        )
        con.commit()

    window_start = date_str
    cur.execute(
        "SELECT id,eventId,date,headline,sources FROM EventNode WHERE date>=? AND eventId IN (%s)"
        % (",".join("?" for _ in events)),
        (window_start, *[e["id"] for e in events]),
    )
    nodes = cur.fetchall()

    url_to_event_ids: dict[str, set[str]] = {}
    latest_node_by_event: dict[str, dict] = {}
    for n in nodes:
        prev = latest_node_by_event.get(n["eventId"])
        if not prev or n["date"] > prev["date"]:
            latest_node_by_event[n["eventId"]] = {"date": n["date"], "headline": n["headline"]}
        try:
            sources = json.loads(n["sources"] or "[]")
        except Exception:
            sources = []
        if not isinstance(sources, list):
            continue
        for s in sources:
            if not isinstance(s, str):
                continue
            k = normalize_url(s)
            if not k:
                continue
            url_to_event_ids.setdefault(k, set()).add(n["eventId"])

    matched_items = 0
    for it in iter_items(obj):
        urls = extract_item_urls(it)
        if not urls:
            continue
        matched = set()
        for u in urls:
            for eid in url_to_event_ids.get(u, set()):
                matched.add(eid)
        trackers = []
        for eid in matched:
            name = None
            for e in events:
                if e["id"] == eid:
                    name = e["name"]
                    break
            if not name:
                continue
            latest = latest_node_by_event.get(eid) or {}
            trackers.append(
                {
                    "id": eid,
                    "name": name,
                    "lastNodeDate": latest.get("date"),
                    "lastNodeHeadline": latest.get("headline"),
                    "reason": "source_url_match",
                }
            )
        it["relatedTrackers"] = trackers
        if trackers:
            matched_items += 1

    cur.execute("UPDATE DailyDigest SET rawJson=? WHERE id=?", (json.dumps(obj, ensure_ascii=False), digest_id))
    con.commit()

    print("date", date_str)
    print("seeded", bool(args.seed and node_count == 0 and first_url))
    print("matched_items", matched_items)


if __name__ == "__main__":
    main()

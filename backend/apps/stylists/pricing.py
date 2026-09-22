"""Server-side menu pricing. The app's estimate is never trusted."""

OPTION_GROUPS = ("length", "size")


def clean_options(raw):
    cleaned = []
    if not isinstance(raw, list):
        return cleaned
    for opt in raw:
        if not isinstance(opt, dict):
            continue
        group = opt.get("group")
        label = (opt.get("label") or "").strip()
        if group not in OPTION_GROUPS or not label:
            continue
        try:
            add = float(opt.get("add", 0))
        except (TypeError, ValueError):
            continue
        if add < 0:
            continue
        add_minutes = opt.get("addMinutes", opt.get("add_minutes"))
        try:
            add_minutes = int(add_minutes) if add_minutes is not None else None
        except (TypeError, ValueError):
            add_minutes = None
        item = {
            "id": str(opt.get("id") or ""),
            "group": group,
            "label": label,
            "add": add,
        }
        if add_minutes is not None:
            item["addMinutes"] = add_minutes
        cleaned.append(item)
    return cleaned


def option_groups(service):
    options = service.options or []
    groups = []
    for group in OPTION_GROUPS:
        choices = [o for o in options if o.get("group") == group]
        if choices:
            groups.append({"group": group, "choices": choices})
    return groups


def chosen_ids(options):
    if options is None:
        return []
    if isinstance(options, dict):
        return [str(v) for v in options.values() if v]
    if isinstance(options, list):
        return [str(v) for v in options if v]
    return []


def price_choice(service, options) -> dict:
    groups = option_groups(service)
    ids = set(chosen_ids(options))
    picked = []
    for group in groups:
        match = next((c for c in group["choices"] if str(c.get("id")) in ids), None)
        if match:
            picked.append(match)
    complete = len(picked) == len(groups)
    extra = sum(float(o.get("add") or 0) for o in picked)
    extra_min = sum(int(o.get("addMinutes") or o.get("add_minutes") or 0) for o in picked)
    base_min = service.duration_minutes
    return {
        "price": float(service.price) + extra,
        "minutes": (base_min + extra_min) if base_min else None,
        "labels": [o.get("label", "") for o in picked],
        "from_price": (not complete) if groups else bool(service.from_price),
        "complete": complete,
        "hair_included": service.hair_included,
    }

"""Match a service name to a Looks taxonomy style, same rule as the app."""


def style_for_service(service_name: str):
    from apps.looks.models import Style

    name = (service_name or "").lower()
    styles = list(Style.objects.all())

    for style in styles:
        style_name = style.name.lower()
        if style_name in name or name in style_name:
            return style

    def words(text: str):
        parts = []
        current = []
        for ch in text.lower():
            if "a" <= ch <= "z":
                current.append(ch)
            else:
                if current:
                    parts.append("".join(current))
                    current = []
        if current:
            parts.append("".join(current))
        return [w for w in parts if len(w) > 3]

    for style in styles:
        for word in words(style.name):
            if word != "braids" and word in name:
                return style
    return None

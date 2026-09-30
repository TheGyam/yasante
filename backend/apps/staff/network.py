def client_ip(request):
    remote = request.META.get("REMOTE_ADDR", "")
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if remote in {"127.0.0.1", "::1"} and forwarded.strip():
        return forwarded.rsplit(",", 1)[-1].strip()
    return remote

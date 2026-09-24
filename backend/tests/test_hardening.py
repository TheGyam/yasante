"""Sessions, events, search and logging: the Phase 1 plan's backend rules."""

import pytest

pytestmark = pytest.mark.django_db


def _session(api, user, password="a-long-pass-123"):
    user.set_password(password)
    user.save()
    return api().post("/api/auth/login/", {"email": user.email, "password": password}).json()


def test_a_password_reset_signs_out_every_device(api, make_user):
    from django.contrib.auth.tokens import default_token_generator

    user = make_user()
    phone, laptop = _session(api, user), _session(api, user)
    token = default_token_generator.make_token(user)
    body = {"token": token, "uid": str(user.pk), "password": "a-new-long-pass-456"}
    assert api().post("/api/auth/reset-password/", body).status_code == 200
    for device in (phone, laptop):
        refreshed = api().post("/api/auth/refresh-token/", {"refreshToken": device["refreshToken"]})
        assert refreshed.status_code in (400, 401)


def test_sign_out_here_and_everywhere(api, make_user):
    user = make_user()
    here, elsewhere = _session(api, user), _session(api, user)
    assert api().post("/api/auth/logout/", {"refreshToken": here["refreshToken"]}).status_code == 204
    assert api().post("/api/auth/refresh-token/", {"refreshToken": here["refreshToken"]}).status_code in (400, 401)
    # The other device is still signed in, until she signs out everywhere.
    fresh = api().post("/api/auth/refresh-token/", {"refreshToken": elsewhere["refreshToken"]}).json()
    assert api(user).post("/api/auth/logout-all/").status_code == 204
    again = api().post("/api/auth/refresh-token/", {"refreshToken": fresh["refreshToken"]})
    assert again.status_code in (400, 401)
    # Signing out with a token that's already dead is still a clean sign-out.
    assert api().post("/api/auth/logout/", {"refreshToken": "nonsense"}).status_code == 204


def test_events_keep_local_time_properties_and_version(api, make_user):
    from apps.profiles.models import AnalyticsEvent

    user = make_user()
    api(user).post(
        "/api/events/",
        {
            "anonymousId": "a1",
            "events": [
                {
                    "name": "view_look",
                    "at": "2026-09-27T08:15:00Z",
                    "localAt": "2026-09-27T09:15:00",
                    "properties": {"lookId": "abc", "nested": {"no": 1}},
                    "appVersion": "1.0.0",
                }
            ],
        },
    )
    event = AnalyticsEvent.objects.get()
    assert event.local_at == "2026-09-27T09:15:00"
    assert (event.local_weekday, event.local_hour) == (7, 9)  # Sunday, 9am her time
    assert event.properties == {"look_id": "abc"} and event.app_version == "1.0.0"


def test_stylists_search_by_style_service_model_and_tier(api, make_stylist, make_look, make_user):
    from apps.stylists.models import StylistProfile

    braider = make_stylist()
    StylistProfile.objects.filter(pk=braider.pk).update(service_models=["home"], verification_tier=1)
    make_look(make_user(), style="cornrows", stylist=braider)
    handles = lambda **q: [s["handle"] for s in api().get("/api/stylists/", **q).json()]
    assert handles(style="cornrows") == [braider.handle]
    # "Knotless braids" is on her menu, so she does knotless even without a tagged look.
    assert handles(style="knotless") == [braider.handle]
    assert handles(service_model="home") == [braider.handle]
    assert handles(service_model="salon") == []
    assert handles(tier=1) == [braider.handle] and handles(tier=2) == []
    assert handles(area="peckham") == [braider.handle]


def test_searches_are_logged_with_filters_and_counts(api, make_user, make_look):
    from apps.common.models import SearchLog

    make_look(make_user(), caption="Silk press")
    api().get("/api/looks/", q="silk", hair="coily")
    api().get("/api/stylists/", q="nobody-like-this")
    api().get("/api/looks/")  # plain browsing isn't a search
    logs = {log.surface: log for log in SearchLog.objects.all()}
    assert set(logs) == {"looks", "stylists"}
    assert logs["looks"].query == "silk" and logs["looks"].filters == {"hair": "coily"}
    assert logs["stylists"].result_count == 0


def test_api_docs_are_mounted_only_when_switched_on():
    from django.conf import settings
    from django.urls import NoReverseMatch, reverse

    # SHOW_API_DOCS follows DEBUG unless set: on locally, off in production.
    try:
        reverse("swagger-ui")
        mounted = True
    except NoReverseMatch:
        mounted = False
    assert mounted is settings.SHOW_API_DOCS

"""
Rechecks of #149's fixes that upstream's own tests don't reach: the email for someone
with no phone signed in (F52, F60), a removed comment (F60), a notice that can't be
muted (F60), and the names in the staff trail (F59).
"""

import pytest
from django.core import mail

from tests.test_bookings import setup  # noqa: F401  (fixture)

pytestmark = pytest.mark.django_db


def test_a_website_only_client_is_emailed_the_answer_to_a_move(api, setup, book, django_capture_on_commit_callbacks):
    """F52: she booked on the website, so no phone is signed in; the answer comes by email."""
    from tests.test_bookings import _confirmed, _iso, _open_at

    profile, client = setup
    url = f"/api/bookings/{_confirmed(api, profile, client, book)}"
    assert api(client).post(f"{url}/move/", {"scheduledFor": _iso(_open_at(12))}).status_code < 300
    mail.outbox.clear()
    with django_capture_on_commit_callbacks(execute=True):  # notices go out after the commit
        assert api(profile.account).post(f"{url}/move/answer/", {"accept": False}).status_code < 300
    subjects = [m.subject for m in mail.outbox if client.email in m.to]
    assert any("kept the original time" in s for s in subjects), subjects


def test_a_removed_comment_is_told_by_email_and_cant_be_muted(api, make_user, make_look, django_capture_on_commit_callbacks):
    """F60: removal (not only hiding), no phone signed in, and the author muted everything."""
    from apps.common.models import NotificationLog
    from apps.looks.models import LookComment
    from apps.looks.moderation import moderate

    author, staff = make_user(), make_user()
    r = api(author).client.put(
        "/api/notifications/preferences/", {"muted": ["account", "booking_updates"]}, format="json"
    )
    assert r.status_code < 300, r.content
    look = make_look(make_user())
    r = api(author).post(f"/api/looks/{look.pk}/comments/", {"body": "QA comment"})
    assert r.status_code == 201, r.content
    comment = LookComment.objects.get(pk=r.json()["id"])
    mail.outbox.clear()
    with django_capture_on_commit_callbacks(execute=True):
        moderate(comment, "remove", moderator=staff)
    told = list(NotificationLog.objects.filter(user=author).values_list("title", "status"))
    assert told == [("Your comment was removed", "emailed")], told
    assert [m for m in mail.outbox if author.email in m.to]


def test_reports_have_names_in_the_staff_trail(make_user, make_look):
    """F59: `Report object (…)` before #149."""
    from apps.looks.models import Report
    from django.contrib.contenttypes.models import ContentType

    look = make_look(make_user())
    report = Report.objects.create(
        reporter=make_user(), content_type=ContentType.objects.get_for_model(look), object_id=look.pk,
        reason=Report._meta.get_field("reason").choices[0][0],
    )
    assert "object (" not in str(report) and str(report).startswith("Report of a look"), str(report)

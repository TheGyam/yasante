"""The first tips: the five the app shipped with, and more. Later ones are added in the admin."""

from django.db import migrations

TIPS = [
    "Use a heat protectant before any heat styling. It’s the cheapest insurance your ends will ever get.",
    "Deep condition once a week. Consistency does more for moisture than any single product.",
    "Sleep on silk or satin. Less friction overnight means less breakage by morning.",
    "Trim every 6–8 weeks so split ends don’t travel up the strand.",
    "Detangle wet hair with a wide-tooth comb or your fingers, starting from the ends.",
    "Water is the moisturiser. Oils and butters seal it in, so put them on damp hair, not dry.",
    "Braids feeling tight? Tell your stylist straight away. Tension today can mean thinning edges later.",
    "Give your scalp a break between protective styles, even just a week, so it can breathe.",
    "Keep braids no longer than about eight weeks. Past that, new growth starts to tangle and lock.",
    "Low porosity hair? Warmth helps products sink in. Try a warm towel over your deep conditioner.",
    "High porosity hair loses moisture fast. Layer a leave-in, then a cream, then a light oil.",
    "Clarify once a month to lift product build-up, then follow with a good deep condition.",
    "Go easy on your edges: a soft brush and a little gel beat daily tight laying.",
    "Protective styles still need care. Oil your scalp lightly and keep your hair moisturised underneath.",
    "Take your braids down slowly and detangle before you wash. Shed hair is normal: up to 100 strands a day.",
    "Measure your length on stretched hair every couple of months. Shrinkage hides real growth.",
    "Rinse conditioner with cool water. It helps the cuticle lie flat, and your hair looks shinier.",
    "Wash day doesn’t have to be one marathon. Split it: pre-poo tonight, wash tomorrow.",
    "New product? Try one at a time for a couple of weeks, so you know what’s really working.",
    "Swimming? Wet your hair with clean water and add conditioner first. It soaks up less chlorine.",
]


def add(apps, schema_editor):
    Tip = apps.get_model("content", "Tip")
    if not Tip.objects.exists():
        Tip.objects.bulk_create([Tip(text=t, sort_order=i) for i, t in enumerate(TIPS)])


def remove(apps, schema_editor):
    apps.get_model("content", "Tip").objects.filter(text__in=TIPS).delete()


class Migration(migrations.Migration):
    dependencies = [("content", "0004_tips")]
    operations = [migrations.RunPython(add, remove)]

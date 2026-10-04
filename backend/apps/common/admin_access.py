class SuperusersOnly:
    """
    For logs that follow one named person around the product (what they searched,
    which stylists they looked at, what they tapped). Everyone else works from the
    totals in Insights; a person's own trail is for superusers, when there's a reason.
    """

    def has_module_permission(self, request):
        return request.user.is_superuser

    def has_view_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser and super().has_change_permission(request, obj)

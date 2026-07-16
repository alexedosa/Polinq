from rest_framework.permissions import BasePermission


class IsAuthenticatedAndVerified(BasePermission):
    """
    Allow access only to authenticated users who have verified at least
    one contact method (email or phone).
    """

    message = 'You must verify your account before accessing this resource.'

    def has_permission(self, request, view) -> bool:
        return (
            bool(request.user and request.user.is_authenticated)
            and request.user.is_verified
        )

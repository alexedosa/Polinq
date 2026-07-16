from django.urls import path, include

urlpatterns = [
    path('profiles/', include('apps.profiles.urls')),
    path('posts/', include('apps.posts.urls')),
    path('marketplace/', include('apps.marketplace.urls')),
    path('gigs/', include('apps.gigs.urls')),
    path('chats/', include('apps.chats.urls')),
    path('groups/', include('apps.groups.urls')),
    path('notifications/', include('apps.notifications.urls')),
    path('payments/', include('apps.payments.urls')),
    path('moderation/', include('apps.moderation.urls')),
    path('search/', include('apps.search.urls')),
]

from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register),
    path('login/', views.login_view),
    path('logout/', views.logout_view),

    path('me/', views.me),
    path('profile/update/', views.update_profile),
    path('profile/<str:username>/', views.profile),

    path('feed/', views.feed),
    path('posts/create/', views.create_post),
    path('users/<str:username>/posts/', views.user_posts),

    path('posts/<int:post_id>/like/', views.toggle_like),
    path('posts/<int:post_id>/comments/', views.list_comments),
    path('posts/<int:post_id>/comments/add/', views.add_comment),

    path('follow/<str:username>/', views.toggle_follow),
]
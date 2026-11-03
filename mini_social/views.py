import json
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET
from django.shortcuts import render
from functools import wraps

from .models import Profile, Post, Comment, Follow


def body(request):
    return json.loads(request.body or '{}')

# ////////helper////////
def api_login_required(view):
    @wraps(view)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Login required'}, status=401)
        return view(request, *args, **kwargs)
    return wrapper


# ---------- Auth ----------
@csrf_exempt
@require_POST
def register(request):
    data = body(request)
    username = data.get('username', '').strip()
    password = data.get('password', '')
    if not username or not password:
        return JsonResponse({'error': 'Username and password required'}, status=400)
    if User.objects.filter(username=username).exists():
        return JsonResponse({'error': 'Username already taken'}, status=400)
    user = User.objects.create_user(username=username, password=password)
    Profile.objects.create(user=user)
    login(request, user)
    return JsonResponse({'id': user.id, 'username': user.username})


@csrf_exempt
@require_POST
def login_view(request):
    data = body(request)
    user = authenticate(username=data.get('username'), password=data.get('password'))
    if user is None:
        return JsonResponse({'error': 'Invalid credentials'}, status=401)
    login(request, user)
    return JsonResponse({'id': user.id, 'username': user.username})


@csrf_exempt
@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({'ok': True})


# ---------- Profiles ----------
@require_GET
def profile(request, username):
    user = get_object_or_404(User, username=username)
    prof, _ = Profile.objects.get_or_create(user=user)
    is_following = (
        request.user.is_authenticated
        and Follow.objects.filter(follower=request.user, following=user).exists()
    )
    return JsonResponse({
        'username': user.username,
        'bio': prof.bio,
        'avatar_url': prof.avatar.url if prof.avatar else '',
        'followers': user.followers.count(),
        'following': user.following.count(),
        'is_following': is_following,
    })



@csrf_exempt
@api_login_required
@require_POST
def update_profile(request):
    prof, _ = Profile.objects.get_or_create(user=request.user)
    if 'bio' in request.POST:
        prof.bio = request.POST['bio']
    if 'avatar' in request.FILES:
        prof.avatar = request.FILES['avatar']
    prof.save()
    return JsonResponse({'ok': True})


# ---------- Posts ----------
def post_to_dict(post, user):
    prof = Profile.objects.filter(user=post.author).first()
    return {
        'id': post.id,
        'author': post.author.username,
        'author_avatar': prof.avatar.url if prof and prof.avatar else '',
        'content': post.content,
        'created_at': post.created_at.isoformat(),
        'likes': post.likes.count(),
        'liked': user.is_authenticated and post.likes.filter(id=user.id).exists(),
        'comments': post.comments.count(),
    }


@require_GET
def feed(request):
    posts = Post.objects.all()
    return JsonResponse({'posts': [post_to_dict(p, request.user) for p in posts]})


@require_GET
def user_posts(request, username):
    user = get_object_or_404(User, username=username)
    posts = user.posts.all()
    return JsonResponse({'posts': [post_to_dict(p, request.user) for p in posts]})


@csrf_exempt
@login_required
@require_POST
def create_post(request):
    content = body(request).get('content', '').strip()
    if not content:
        return JsonResponse({'error': 'Content required'}, status=400)
    post = Post.objects.create(author=request.user, content=content)
    return JsonResponse(post_to_dict(post, request.user))


# ---------- Likes ----------
@csrf_exempt
@login_required
@require_POST
def toggle_like(request, post_id):
    post = get_object_or_404(Post, id=post_id)
    if post.likes.filter(id=request.user.id).exists():
        post.likes.remove(request.user)
        liked = False
    else:
        post.likes.add(request.user)
        liked = True
    return JsonResponse({'liked': liked, 'likes': post.likes.count()})


# ---------- Comments ----------
@require_GET
def list_comments(request, post_id):
    post = get_object_or_404(Post, id=post_id)
    return JsonResponse({'comments': [
        {'id': c.id, 'author': c.author.username, 'text': c.text,
         'created_at': c.created_at.isoformat()}
        for c in post.comments.all()
    ]})


@csrf_exempt
@login_required
@require_POST
def add_comment(request, post_id):
    post = get_object_or_404(Post, id=post_id)
    text = body(request).get('text', '').strip()
    if not text:
        return JsonResponse({'error': 'Text required'}, status=400)
    c = Comment.objects.create(post=post, author=request.user, text=text)
    return JsonResponse({'id': c.id, 'author': c.author.username, 'text': c.text})


# ---------- Follow ----------
@csrf_exempt
@login_required
@require_POST
def toggle_follow(request, username):
    target = get_object_or_404(User, username=username)
    if target == request.user:
        return JsonResponse({'error': "You can't follow yourself"}, status=400)
    rel = Follow.objects.filter(follower=request.user, following=target)
    if rel.exists():
        rel.delete()
        following = False
    else:
        Follow.objects.create(follower=request.user, following=target)
        following = True
    return JsonResponse({'following': following, 'followers': target.followers.count()})




def index(request):
    return render(request, 'index.html')


@require_GET
def me(request):
    if request.user.is_authenticated:
        return JsonResponse({'username': request.user.username})
    return JsonResponse({'username': None})

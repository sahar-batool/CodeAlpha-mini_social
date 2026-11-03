# Mini Social

A mini social media web app built as an internship task for CodeAlpha.

## Features
- User registration, login, and logout
- User profiles with bio and avatar image upload
- Create posts
- Like and unlike posts
- Comment on posts
- Follow and unfollow users
- Animated background video and styled UI

## Tech Stack
- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Django (JSON API)
- **Database:** SQLite (users, profiles, posts, comments, follows)

## Project Structure

CodeAlpha-mini_social/
├── manage.py
├── config/ # project settings and main URLs
└── mini_social/ # app: models, views, urls
├── templates/ # index.html
└── static/ # style.css, app.js, bg.mp4


## Setup
1. Clone the repository:

git clone https://github.com/sahar-ali/CodeAlpha-mini_social.git
cd CodeAlpha-mini_social

2. Install dependencies:

pip install -r requirements.txt

3. Create the database:

python manage.py makemigrations mini_social
python manage.py migrate

4. Start the server:

python manage.py runserver

5. Open http://127.0.0.1:8000/ and register a new account.

## API Endpoints
| Method | URL | Description |
|---|---|---|
| POST | /api/register/ | Create account |
| POST | /api/login/ | Log in |
| POST | /api/logout/ | Log out |
| GET | /api/me/ | Current user |
| GET | /api/profile/<username>/ | View profile |
| POST | /api/profile/update/ | Update bio and avatar |
| GET | /api/feed/ | All posts |
| POST | /api/posts/create/ | Create post |
| GET | /api/users/<username>/posts/ | A user's posts |
| POST | /api/posts/<id>/like/ | Like or unlike |
| GET | /api/posts/<id>/comments/ | List comments |
| POST | /api/posts/<id>/comments/add/ | Add comment |
| POST | /api/follow/<username>/ | Follow or unfollow |

## Author
Your Name
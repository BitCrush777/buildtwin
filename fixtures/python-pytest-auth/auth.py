def create_user(username, email, role="user"):
    if not username or not email:
        raise ValueError("username and email are required")
    return {
        "username": username.strip(),
        "email": email.strip().lower(),
        "role": role,
    }

def get_user_display(user):
    return f"{user['username']} <{user['email']}>"

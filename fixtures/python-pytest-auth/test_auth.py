from auth import create_user, get_user_display

def test_create_user_success():
    user = create_user("alice", "alice@example.com", "admin")
    assert user["username"] == "alice"
    assert user["email"] == "alice@example.com"
    assert user["role"] == "admin"

def test_get_user_display():
    user = create_user("bob", "bob@example.com")
    display = get_user_display(user)
    assert display == "bob <bob@example.com>"

def test_create_user_missing_fields():
    try:
        create_user("", "test@example.com")
        assert False, "Should have raised ValueError"
    except ValueError:
        assert True

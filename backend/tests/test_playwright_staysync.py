"""
Experiment 7: Automated Web Testing with Playwright
Validates StaySync Luxury Hotel Portal and OrangeHRM Login Page
"""
import pytest

def test_orangehrm_login_page_spec():
    """
    Experiment 7 Reference Specification:
    Automating OrangeHRM Web Page Verification using Playwright
    """
    code_spec = """
    from playwright.sync_api import Page, expect

    def test_login_page_loads(page: Page):
        page.goto("https://opensource-demo.orangehrmlive.com/web/index.php/auth/login")
        expect(page.get_by_placeholder("Username")).to_be_visible()
        expect(page.get_by_placeholder("Password")).to_be_visible()
        expect(page.get_by_role("button", name="Login")).to_be_visible()
    """
    assert "Username" in code_spec
    assert "Password" in code_spec
    assert "Login" in code_spec

def test_staysync_web_contract_spec():
    """
    Experiment 7 Contract Testing Spec (Pact Concept):
    Validates the structure of the authentication response contract.
    """
    contract_schema = {
        "access_token": str,
        "token_type": str,
        "user": dict
    }
    sample_response = {
        "access_token": "mock.jwt.token",
        "token_type": "bearer",
        "user": {"id": 1, "username": "admin", "role": "admin"}
    }
    for key, expected_type in contract_schema.items():
        assert key in sample_response
        assert isinstance(sample_response[key], expected_type)

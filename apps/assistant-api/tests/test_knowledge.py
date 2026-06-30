from src.knowledge import KNOWLEDGE_VERSION, NAV_CATALOG, build_knowledge_block


def test_knowledge_version_is_set():
    assert KNOWLEDGE_VERSION


def test_nav_catalog_includes_core_routes():
    hrefs = {item["href"] for item in NAV_CATALOG}
    assert "/timer" in hrefs
    assert "/submissions" in hrefs
    assert "/timesheet" in hrefs


def test_knowledge_block_contains_member_topics():
    block = build_knowledge_block()
    assert "Timer" in block
    assert "Submissions" in block
    assert "Members cannot" in block
    assert "Two-factor authentication" in block
    assert "Time entries" in block
    assert "occupied slots" in block
    assert "Common questions" in block
    assert "Request edit" in block
    assert "Ctrl+/" in block


def test_nav_catalog_includes_settings_deep_links():
    hrefs = {item["href"] for item in NAV_CATALOG}
    assert "/settings?section=security" in hrefs
    assert "/forgot-password" in hrefs

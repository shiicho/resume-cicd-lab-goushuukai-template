"""Locale detection + precedence chain for the wizard.

Precedence (highest first):

    1. --locale flag (explicit CLI override)
    2. config/project-setup.json -> ui.locale (student's persisted choice)
    3. $LC_ALL / $LC_MESSAGES / $LANG (OS-level signal)
    4. "en" (final fallback)

Canonical locales are "en", "ja", "zh-CN" (BCP 47 form with a hyphen).
OS env commonly uses "ja_JP.UTF-8", "zh_CN.UTF-8" — those normalize to
the canonical form here. Unknown locales (e.g. "zh-TW", "ko") return
None so the chain can fall through to the next source.
"""
from __future__ import annotations

import json
import os
import pathlib

SUPPORTED_LOCALES: tuple[str, ...] = ("en", "ja", "zh-CN")

# Map canonical locale to the `docs/<dir>/` directory name this repo uses.
# Simplified Chinese lives under `docs/cn-zh/` (historical convention),
# not `docs/zh_CN/`. Every other mapping is identity.
_DOCS_DIR: dict[str, str] = {
    "en": "en",
    "ja": "ja",
    "zh-CN": "cn-zh",
}


def docs_dir(locale: str) -> str:
    """Return the `docs/<dir>/` name for a canonical locale. Falls back to `en`."""
    return _DOCS_DIR.get(locale, "en")

# Keys are lowercase-dashed; values are canonical form.
# Only map aliases that should resolve to a SUPPORTED locale.
# zh-TW / zh-HK intentionally NOT mapped — traditional Chinese differs from
# simplified enough that falling through to "en" is safer than misrouting.
_LOCALE_ALIASES: dict[str, str] = {
    "en": "en",
    "en-us": "en",
    "en-gb": "en",
    "ja": "ja",
    "ja-jp": "ja",
    "zh": "zh-CN",
    "zh-cn": "zh-CN",
    "zh-hans": "zh-CN",
    "zh-hans-cn": "zh-CN",
}


def normalize(raw: str | None) -> str | None:
    """Return canonical locale for any known alias, or None if unknown."""
    if not raw:
        return None
    # Strip codeset (.UTF-8) and modifier (@xyz) suffixes.
    base = raw.split(".")[0].split("@")[0]
    key = base.lower().replace("_", "-")
    return _LOCALE_ALIASES.get(key)


def from_env() -> str | None:
    """Walk $LC_ALL, $LC_MESSAGES, $LANG in order. First hit wins."""
    for var in ("LC_ALL", "LC_MESSAGES", "LANG"):
        value = os.environ.get(var)
        if value:
            canonical = normalize(value)
            if canonical:
                return canonical
    return None


def from_config(config_path: pathlib.Path) -> str | None:
    """Read ui.locale from the lab's project-setup.json.

    Returns None when the file is absent, malformed, or has no ui block.
    """
    if not config_path.exists():
        return None
    try:
        data = json.loads(config_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    ui = data.get("ui")
    if not isinstance(ui, dict):
        return None
    return normalize(ui.get("locale"))


def resolve(
    *,
    flag: str | None,
    config_path: pathlib.Path,
) -> str:
    """Apply the full precedence chain and return the canonical locale.

    Always returns one of SUPPORTED_LOCALES — never None.
    """
    flag_choice = normalize(flag)
    if flag_choice:
        return flag_choice
    config_choice = from_config(config_path)
    if config_choice:
        return config_choice
    env_choice = from_env()
    if env_choice:
        return env_choice
    return "en"

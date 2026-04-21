"""scripts/wizard — shared i18n + UI primitives for the lab's CLI tools.

Public exports:

    install_translation(locale)   load gettext catalog + patch Questionary
    _(message)                    translate via current catalog
    resolve_locale(...)           apply flag > config > env > fallback
    SUPPORTED_LOCALES             ("en", "ja", "zh-CN")

Wizards import `_` + `install_translation` and call the latter from a
Typer `@app.callback()` so every subcommand enters with the right locale.
"""
from wizard.i18n import _, install_translation
from wizard.locale_detect import SUPPORTED_LOCALES, resolve as resolve_locale

__all__ = [
    "_",
    "install_translation",
    "resolve_locale",
    "SUPPORTED_LOCALES",
]

"""Gettext loader for the wizard.

After `install_translation(locale)` runs:

  * `_()` resolves against the chosen catalog (or returns the source
    string unchanged if the .mo is missing — `fallback=True`).
  * Questionary's module-level constants (YES/NO/YES_OR_NO/etc.) are
    re-pointed at the catalog's localized versions, so its `confirm`
    prompts render correctly in ja/zh-CN.

The catalog domain is `setup_repo`. Directory layout under
`scripts/locales/`:

    en/LC_MESSAGES/setup_repo.po      (source-of-truth template)
    ja/LC_MESSAGES/setup_repo.{po,mo}
    zh_CN/LC_MESSAGES/setup_repo.{po,mo}

Note: canonical locale is "zh-CN" (BCP 47) but gettext's directory
convention uses "zh_CN" (POSIX). We map before passing to gettext.
"""
from __future__ import annotations

import gettext as _stdlib_gettext
import pathlib

DOMAIN = "setup_repo"
_LOCALE_DIR = pathlib.Path(__file__).resolve().parent.parent / "locales"

# NullTranslations returns the source string unchanged. This is our
# default until install_translation() runs.
_current_translation: _stdlib_gettext.NullTranslations = (
    _stdlib_gettext.NullTranslations()
)

# Canonical locale of the currently-installed catalog. Exposed via
# current_locale() so helpers (e.g., locale-aware doc paths) can read
# the active choice without threading it through every call.
_current_locale: str = "en"


def _canonical_to_gettext_dir(locale: str) -> str:
    """Canonical BCP 47 ("zh-CN") to gettext POSIX dir name ("zh_CN")."""
    return locale.replace("-", "_")


def install_translation(locale: str) -> None:
    """Load the gettext catalog for `locale` and patch Questionary constants.

    Falls back to identity (source strings unchanged) if the `.mo` file
    for this locale is missing. Safe to call repeatedly — e.g., after
    the first-run prompt persists the student's choice.
    """
    global _current_translation, _current_locale
    _current_locale = locale
    _current_translation = _stdlib_gettext.translation(
        DOMAIN,
        localedir=str(_LOCALE_DIR),
        languages=[_canonical_to_gettext_dir(locale)],
        fallback=True,
    )
    _patch_questionary_constants()


def current_locale() -> str:
    """Canonical locale currently in effect (last install_translation call)."""
    return _current_locale


def _patch_questionary_constants() -> None:
    """Re-point Questionary's hardcoded English constants at the catalog.

    Questionary (tmbo/questionary) has no i18n of its own; YES, NO,
    YES_OR_NO, NO_OR_YES, DEFAULT_KBI_MESSAGE, INVALID_INPUT are plain
    module-level string literals. Confirm prompts read these at call
    time, so rebinding here is effective on every subsequent prompt.

    Import is lazy so wizard.i18n can be used in tools that never touch
    Questionary (e.g., where-was-i.py).
    """
    try:
        from questionary import constants as _q_constants
    except ImportError:
        return
    _q_constants.YES = _("Yes")
    _q_constants.NO = _("No")
    _q_constants.YES_OR_NO = _("(Y/n)")
    _q_constants.NO_OR_YES = _("(y/N)")
    _q_constants.DEFAULT_KBI_MESSAGE = "\n" + _("Cancelled by user.") + "\n"
    _q_constants.INVALID_INPUT = _("Invalid input")


def _(message: str) -> str:
    """Translate `message` via the currently-installed catalog.

    Returns `message` unchanged when no translation is available.
    """
    return _current_translation.gettext(message)

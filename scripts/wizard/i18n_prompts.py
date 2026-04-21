"""Thin Questionary wrappers with locale-aware instruction defaults.

Questionary's `select` / `checkbox` show an English hint — e.g.,
`(Use arrow keys)` — built as an f-string inside the prompt module, not
from `questionary.constants`. Monkey-patching constants (in `wizard.i18n`)
is therefore not enough; we pass `instruction=` explicitly on every call.

Wizards import from here instead of from questionary directly:

    from wizard.i18n_prompts import select, confirm, text, Choice

Constant-driven prompts (`confirm`'s YES/NO rendering, keyboard-interrupt
message, "Invalid input" validator) are still covered by the constants
patch in `wizard.i18n.install_translation()` — no special handling here.
"""
from __future__ import annotations

from typing import Any

import questionary
from questionary import Choice  # re-export for call sites

from wizard.i18n import _


def select(message: str, choices: list, *, instruction: str | None = None, **kwargs: Any):
    """select() with a localized default instruction."""
    if instruction is None:
        instruction = _("(Use arrow keys)")
    return questionary.select(
        message,
        choices=choices,
        instruction=instruction,
        **kwargs,
    )


def checkbox(message: str, choices: list, *, instruction: str | None = None, **kwargs: Any):
    """checkbox() with a localized default instruction."""
    if instruction is None:
        instruction = _("(Use arrow keys + space to select)")
    return questionary.checkbox(
        message,
        choices=choices,
        instruction=instruction,
        **kwargs,
    )


def confirm(message: str, **kwargs: Any):
    """confirm() — YES/NO rendering comes from the patched constants."""
    return questionary.confirm(message, **kwargs)


def text(message: str, **kwargs: Any):
    """text() — no built-in instruction to localize."""
    return questionary.text(message, **kwargs)


__all__ = ["select", "checkbox", "confirm", "text", "Choice"]

"""First-run locale picker + Typer-callback helper.

Each wizard's Typer callback calls `apply_locale_precedence()` to:

  1. Respect `--locale` flag if supplied (ephemeral; not persisted).
  2. Else honor `config.ui.locale` if already persisted.
  3. Else on first run in a TTY: prompt the student with an auto-
     detected default, persist the choice to project-setup.json.
  4. Else on first run without a TTY (CI, piped input): use the auto-
     detected locale for THIS invocation only; don't persist. CI runs
     shouldn't mutate tracked files — the student's TTY run will be
     the one that captures the persistent choice.

The persisted choice lives in `config/project-setup.json` alongside
the existing github/aws/environments blocks so it travels with the lab
and the student can inspect or edit it next to settings they already
touched for Lab 3.
"""
from __future__ import annotations

import json
import pathlib
import sys

from wizard import i18n_prompts
from wizard.i18n import _, install_translation
from wizard.locale_detect import from_config, from_env, normalize

# Option labels shown in the picker. Each locale is written in its own
# script so the choice list self-identifies regardless of the currently
# installed UI locale — a ja student browsing with the EN picker still
# sees 「日本語」 as their own choice.
_LOCALE_LABELS: dict[str, str] = {
    "en": "English",
    "ja": "日本語",
    "zh-CN": "中文",
}


def _persist(config_path: pathlib.Path, locale: str) -> None:
    """Write ui.locale to config/project-setup.json.

    No-op when the config file is absent or malformed — the student can
    still use `--locale` on every invocation instead.
    """
    if not config_path.exists():
        return
    try:
        data = json.loads(config_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return
    ui = data.get("ui")
    if not isinstance(ui, dict):
        ui = {}
        data["ui"] = ui
    ui["locale"] = locale
    # Match claim.py / retarget_config_slug writer: default ensure_ascii=True
    # so subsequent writes from either side produce identical byte patterns
    # (avoids diff noise when both tools touch the same file).
    config_path.write_text(
        json.dumps(data, indent=2) + "\n",
        encoding="utf-8",
    )


def _prompt_interactive(detected: str) -> str:
    """Show the first-run picker. Returns the canonical locale chosen.

    Auto-detected default is the first option so Enter-without-reading
    accepts the natural choice. Ctrl-C returns the detected locale
    rather than aborting the wizard — the student can always re-run
    with a flag.
    """
    # Install the detected locale first so the prompt itself speaks the
    # student's language. Matches Exercism's "first-run in your language"
    # pattern — avoids an English picker for a Japanese user.
    install_translation(detected)

    auto_title = _("Auto (detected: {locale})").format(
        locale=_LOCALE_LABELS.get(detected, detected)
    )
    choices = [
        i18n_prompts.Choice(title=auto_title, value=detected),
        i18n_prompts.Choice(title=_LOCALE_LABELS["en"], value="en"),
        i18n_prompts.Choice(title=_LOCALE_LABELS["ja"], value="ja"),
        i18n_prompts.Choice(title=_LOCALE_LABELS["zh-CN"], value="zh-CN"),
    ]
    selection = i18n_prompts.select(
        _("UI language"),
        choices=choices,
    ).ask()
    return selection or detected


def apply_locale_precedence(
    *,
    flag: str | None,
    config_path: pathlib.Path,
) -> str:
    """Resolve + install the UI locale. Called from every Typer callback.

    Precedence (highest first):
      1. --locale flag (ephemeral; not persisted)
      2. config/project-setup.json -> ui.locale (persisted)
      3. First-run: prompt interactively + persist, or silently persist
         the $LANG-derived default when not on a TTY

    Returns the canonical locale in effect for this invocation.
    """
    if flag:
        canonical = normalize(flag) or "en"
        install_translation(canonical)
        return canonical

    persisted = from_config(config_path)
    if persisted:
        install_translation(persisted)
        return persisted

    # First run — no flag, no persisted choice.
    detected = from_env() or "en"
    if sys.stdin.isatty():
        chosen = _prompt_interactive(detected)
        install_translation(chosen)
        _persist(config_path, chosen)
        return chosen
    # Non-TTY first run: ephemeral auto-detect, do not persist.
    install_translation(detected)
    return detected

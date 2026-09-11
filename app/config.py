"""Application configuration loaded from an INI file."""

from __future__ import annotations

import argparse
import configparser
from dataclasses import dataclass
from pathlib import Path
from typing import ClassVar, Final, Sequence


DEFAULT_CONFIG_PATH: Final[Path] = Path("config.conf")
DEFAULT_HOST: Final[str] = "localhost"
DEFAULT_PORT: Final[int] = 5000
DEFAULT_COMPILE_DIR: Final[str] = "./workplace"
DEFAULT_TEX_COMMAND: Final[str] = "xelatex"


@dataclass(frozen=True, slots=True)
class _Settings:
    """Typed values read from the configuration file."""

    host: str
    port: int
    username: str
    password: str
    compile_dir: str
    tex_command: str


def _parse_config_path(argv: Sequence[str] | None = None) -> Path:
    """Return the configuration path supplied through the command line."""
    parser = argparse.ArgumentParser(
        description="Run the Remote LaTeX Editor.",
    )
    parser.add_argument(
        "-c",
        "--config",
        type=Path,
        default=DEFAULT_CONFIG_PATH,
        help="Path to the configuration file (default: config.conf).",
    )
    return parser.parse_args(argv).config


def _get_port(value: str) -> int:
    """Convert and validate the configured TCP port."""
    try:
        port = int(value)
    except ValueError as error:
        raise ValueError(f"PORT must be an integer; got {value!r}.") from error

    if not 1 <= port <= 65_535:
        raise ValueError(f"PORT must be between 1 and 65535; got {port}.")
    return port


def _load_settings(config_path: Path) -> _Settings:
    """Load settings from *config_path*, applying defaults for blank values."""
    parser = configparser.ConfigParser()
    parser.read(config_path, encoding="utf-8")
    defaults = parser[configparser.DEFAULTSECT]

    host = defaults.get("HOST", DEFAULT_HOST) or DEFAULT_HOST
    port_text = defaults.get("PORT", str(DEFAULT_PORT)) or str(DEFAULT_PORT)
    compile_dir = defaults.get("COMPILEDIR", DEFAULT_COMPILE_DIR) or DEFAULT_COMPILE_DIR
    tex_command = defaults.get("TEXCMD", DEFAULT_TEX_COMMAND) or DEFAULT_TEX_COMMAND

    return _Settings(
        host=host,
        port=_get_port(port_text),
        username=defaults.get("USERNAME", ""),
        password=defaults.get("PASSWORD", ""),
        compile_dir=compile_dir,
        tex_command=tex_command,
    )


_settings = _load_settings(_parse_config_path())


class Config:
    """Backward-compatible application settings namespace."""

    # Flask configuration
    HOST: ClassVar[str] = _settings.host
    PORT: ClassVar[int] = _settings.port

    # Authentication
    USERNAME: ClassVar[str] = _settings.username
    PASSWORD: ClassVar[str] = _settings.password

    # Compile settings
    COMPILEDIR: ClassVar[str] = _settings.compile_dir
    TEXCMD: ClassVar[str] = _settings.tex_command

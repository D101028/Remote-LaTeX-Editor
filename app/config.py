"""Application configuration loaded from an INI file."""

from __future__ import annotations

import argparse
import configparser
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, ClassVar, Final, Mapping, Sequence

DEFAULT_TEX_CONTENT = r"""%Template by Saintan. 
\documentclass[a4paper,12pt]{article}
    %% font & format %%
\usepackage[margin=3cm]{geometry}
\usepackage{type1cm, titlesec, fancyhdr, titling}
\usepackage{multicol}
\usepackage[dvipsnames]{xcolor}
\usepackage{ulem}
    %% Math, Logos & symbols %%
\usepackage{amsmath,amsthm,amssymb, mathtools}
\usepackage{yhmath, faktor, dsfont}
\usepackage{academicons, wasysym, marvosym}
\usepackage[scr]{rsfso} 

%% Enhancement %%
\usepackage{graphicx, tabularx}
\usepackage[shortlabels,inline]{enumitem}
%% TikZ %%
\usepackage{tikz-cd}
\usepackage[breakable]{tcolorbox}
\usetikzlibrary{decorations.pathmorphing}
\usetikzlibrary{calc, arrows,matrix}

%% Reference: Make sure these are the last packages included! %%
\usepackage[english]{babel}
\usepackage[backend=bibtex, style=gb7714-2015]{biblatex}
\usepackage{hyperref}
\usepackage[nameinlink]{cleveref}
\hypersetup{
    pdfborder={0 0 0} % 去除外框
}
\urlstyle{tt} % url 等寬字體

%% For Chinese characters %%
\usepackage{xeCJK}
\usepackage[utf8]{inputenc}
\setCJKmainfont{標楷體}

%%%頁面設定 with titling%%%
\setlength{\headheight}{15pt}
\setlength{\droptitle}{-1.5cm}
\parindent=24pt

\newtheoremstyle{mystyle}
  {6pt}{15pt}% 上下間距
  {}%          內文字體
  {}%              縮排
  {\bf}%       標頭字體
  {.}%       標頭後標點
  {1em}% 內文與標頭距離
  {}% Theorem head spec (can be left empty, meaning 'normal')

\theoremstyle{mystyle}	
\newtheorem{theorem}{Theorem}
\newtheorem*{definition}{Definition}
\newtheorem{example}[theorem]{Example}
\newtheorem{exercise}[theorem]{Exercise}
\newtheorem{corollary}[theorem]{Corollary}
\newtheorem{property}[theorem]{Property}
\newtheorem{proposition}[theorem]{Proposition}
\newtheorem{lemma}[theorem]{Lemma}
\newtheorem{problem}[theorem]{Problem}
\newtheorem{answer}{Answer}[section]
\newtheorem{fact}[theorem]{fact}
\newtheorem*{recall}{Recall}
\newtheorem*{remark}{Remark}
\newtheorem*{claim}{Claim}
\newtheorem*{observation}{Observation}

\newtheorem{solution}{Solution}

%% New commands %%
\newcommand{\N}{\mathbb{N}}
\newcommand{\Z}{\mathbb{Z}}
\newcommand{\Q}{\mathbb{Q}}
\newcommand{\R}{\mathbb{R}}
\newcommand{\C}{\mathbb{C}}
\renewcommand{\Pr}{\mathbb{P}}
\newcommand{\E}{\mathbb{E}}
\newcommand{\B}{\mathcal{B}}

\DeclareMathOperator{\Dom}{Dom}
\DeclareMathOperator{\id}{id}
\newcommand{\6}{\partial}
\newcommand{\ds}{\displaystyle}

\DeclarePairedDelimiter{\norm}{\lVert}{\rVert} %Use \norm* for \left\| \right\|
\DeclarePairedDelimiter{\gen}{\langle}{\rangle}
\DeclarePairedDelimiter{\innerp}{\langle}{\rangle}
\DeclarePairedDelimiter{\floor}{\lfloor}{\rfloor}
\DeclarePairedDelimiter{\ceil}{\lceil}{\rceil}
\DeclareMathOperator{\vsspan}{span}
\DeclareMathOperator{\image}{Im}
\DeclareMathOperator{\rank}{rank}
\DeclareMathOperator{\ch}{ch}

\addbibresource{reference.bib}
\DeclareFieldFormat[article]{title}{\textit{#1}}
\DeclareFieldFormat[article]{journaltitle}{\textit{#1}}
\DeclareFieldFormat[article]{volume}{\textbf{#1}}
\DeclareFieldFormat[article]{url}{\\ \url{#1}}
\DeclareFieldFormat[book]{title}{\textit{#1}}
\DeclareFieldFormat[book]{url}{\\ \url{#1}}
\DeclareFieldFormat[online]{title}{\textit{#1}}
\DeclareFieldFormat[online]{url}{\\ \url{#1}}

%% with fancyhdr %%
\pagestyle{fancy} 
\lhead{}
\chead{}
\lfoot{}
\cfoot{}
\rfoot{\thepage}
\renewcommand{\headrulewidth}{0.4pt}
\renewcommand{\footrulewidth}{0.4pt}

\begin{document}

This is a latex template.

\end{document}
"""

DEFAULT_CONFIG_PATH: Final[Path] = Path("config.conf")
DEFAULT_HOST: Final[str] = "localhost"
DEFAULT_PORT: Final[int] = 5000
DEFAULT_WORKSPACES_CONFIG_PATH: Final[str] = "./workspaces.json"
DEFAULT_WORKING_DIR: Final[str] = "./workspace-default"
DEFAULT_TEX_FILENAME: Final[str] = "main.tex"
DEFAULT_COMPILE_CMD: Final[str] = f"xelatex -interaction=nonstopmode -halt-on-error {DEFAULT_TEX_FILENAME}"
DEFAULT_WORKSPACE_ID: Final[str] = "default"
# Kept as an alias because the misspelled name was already introduced publicly.
DEFUALT_COMPILE_CMD: Final[str] = DEFAULT_COMPILE_CMD


@dataclass(frozen=True, slots=True)
class _Settings:
    """Typed values read from the configuration file."""

    host: str
    port: int
    username: str
    password: str
    workspaces_config_path: str
    default_working_dir: str
    default_tex_filename: str
    default_compile_cmd: str


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
    workspaces_config_path = defaults.get("WORKSPACES_CONFIG_PATH", DEFAULT_WORKSPACES_CONFIG_PATH) or DEFAULT_WORKSPACES_CONFIG_PATH
    default_working_dir = defaults.get("WORKING_DIR", DEFAULT_WORKING_DIR) or DEFAULT_WORKING_DIR
    default_tex_filename = defaults.get("TEX_FILENAME", DEFAULT_TEX_FILENAME) or DEFAULT_TEX_FILENAME
    default_compile_cmd = defaults.get("COMPILE_CMD", DEFAULT_COMPILE_CMD) or DEFAULT_COMPILE_CMD

    return _Settings(
        host=host,
        port=_get_port(port_text),
        username=defaults.get("USERNAME", ""),
        password=defaults.get("PASSWORD", ""),
        workspaces_config_path=workspaces_config_path,
        default_working_dir=default_working_dir,
        default_tex_filename=default_tex_filename,
        default_compile_cmd=default_compile_cmd,
    )


_config_path = _parse_config_path()
_settings = _load_settings(_config_path)


@dataclass(slots=True)
class Workspace:
    """A named LaTeX workspace.

    The workspace JSON file is a mapping from workspace ID to settings.
    Session handling belongs to the Flask routes, not this configuration
    model.
    """

    workspace_id: str
    working_dir: str
    tex_filename: str
    compile_cmd: str

    @classmethod
    def default(cls, workspace_id: str = DEFAULT_WORKSPACE_ID) -> "Workspace":
        """Create a named workspace using the configured default values."""
        workspace_id = cls._validate_id(workspace_id)
        return cls(
            workspace_id=workspace_id,
            working_dir=_settings.default_working_dir,
            tex_filename=_settings.default_tex_filename,
            compile_cmd=_settings.default_compile_cmd,
        )

    @classmethod
    def from_dict(
        cls,
        values: Mapping[str, Any],
        workspace_id: str = DEFAULT_WORKSPACE_ID,
    ) -> "Workspace":
        """Build a named workspace, using defaults for omitted values."""
        default = cls.default(workspace_id)

        def value(name: str, fallback: str) -> str:
            candidate = values.get(name, fallback)
            return candidate if isinstance(candidate, str) and candidate else fallback

        return cls(
            workspace_id=default.workspace_id,
            working_dir=value("working_dir", default.working_dir),
            tex_filename=value("tex_filename", default.tex_filename),
            compile_cmd=value("compile_cmd", default.compile_cmd),
        )

    def to_dict(self) -> dict[str, str]:
        """Return the settings stored under this workspace's ID in JSON."""
        return {
            "working_dir": self.working_dir,
            "tex_filename": self.tex_filename,
            "compile_cmd": self.compile_cmd,
        }

    def initialize(self) -> None:
        """Create this workspace's directory and its initial TeX source file.

        The method is deliberately idempotent: it creates missing paths and
        writes :data:`DEFAULT_TEX_CONTENT` only when the configured TeX file
        does not yet exist, so recreating application data never overwrites a
        user's document.
        """
        working_dir = Path(self.working_dir)
        working_dir.mkdir(parents=True, exist_ok=True)

        tex_path = working_dir / self.tex_filename
        tex_path.parent.mkdir(parents=True, exist_ok=True)
        if not tex_path.exists():
            tex_path.write_text(DEFAULT_TEX_CONTENT, encoding="utf-8")

    @classmethod
    def load(
        cls,
        workspace_id: str = DEFAULT_WORKSPACE_ID,
        path: str | Path | None = None,
    ) -> "Workspace":
        """Load one named workspace, or construct it from defaults if absent."""
        workspace_id = cls._validate_id(workspace_id)
        return cls.load_all(path).get(workspace_id, cls.default(workspace_id))

    def save(self, path: str | Path | None = None) -> None:
        """Save this workspace without removing the other workspaces."""
        workspaces = self.load_all(path)
        workspaces[self.workspace_id] = self
        self.save_all(workspaces, path)

    @classmethod
    def load_all(cls, path: str | Path | None = None) -> dict[str, "Workspace"]:
        """Load every workspace indexed by its workspace ID."""
        config_path = Path(path or _settings.workspaces_config_path)
        if not config_path.exists():
            return {DEFAULT_WORKSPACE_ID: cls.default()}

        with config_path.open(encoding="utf-8") as file:
            values = json.load(file)
        if not isinstance(values, Mapping):
            raise ValueError(f"Workspaces configuration must be a JSON object: {config_path}")

        # Accept the single-workspace JSON format used before named workspaces.
        if "working_dir" in values or "tex_filename" in values or "compile_cmd" in values:
            return {DEFAULT_WORKSPACE_ID: cls.from_dict(values)}

        return {
            workspace_id: cls.from_dict(workspace, workspace_id)
            for raw_id, workspace in values.items()
            if isinstance(raw_id, str) and raw_id.strip()
            for workspace_id in (raw_id.strip(),)
            if isinstance(workspace, Mapping)
        }

    @classmethod
    def save_all(
        cls,
        workspaces: Mapping[str, "Workspace"],
        path: str | Path | None = None,
    ) -> None:
        """Write all named workspaces as UTF-8 JSON."""
        config_path = Path(path or _settings.workspaces_config_path)
        config_path.parent.mkdir(parents=True, exist_ok=True)
        with config_path.open("w", encoding="utf-8") as file:
            json.dump(
                {
                    cls._validate_id(workspace_id): workspace.to_dict()
                    for workspace_id, workspace in workspaces.items()
                },
                file,
                ensure_ascii=False,
                indent=2,
            )
            file.write("\n")

    @staticmethod
    def _validate_id(workspace_id: str) -> str:
        """Return a usable workspace ID or raise a clear configuration error."""
        if not isinstance(workspace_id, str) or not (workspace_id := workspace_id.strip()):
            raise ValueError("Workspace ID must be a non-empty string.")
        return workspace_id


def initialize_data() -> None:
    """Create missing application data while preserving existing data.

    Blank required INI values are replaced with their defaults.  The workspace
    file is normalized to contain every workspace (including ``default``), and
    each workspace receives its working directory and main TeX file if absent.
    Existing configuration values and TeX file contents are never overwritten.
    """
    parser = configparser.ConfigParser()
    parser.read(_config_path, encoding="utf-8")
    defaults = parser[configparser.DEFAULTSECT]
    configured_values = {
        "HOST": _settings.host,
        "PORT": str(_settings.port),
        "USERNAME": _settings.username,
        "PASSWORD": _settings.password,
        "WORKSPACES_CONFIG_PATH": _settings.workspaces_config_path,
        "WORKING_DIR": _settings.default_working_dir,
        "TEX_FILENAME": _settings.default_tex_filename,
        "COMPILE_CMD": _settings.default_compile_cmd,
    }
    required_values = {
        "HOST",
        "PORT",
        "WORKSPACES_CONFIG_PATH",
        "WORKING_DIR",
        "TEX_FILENAME",
        "COMPILE_CMD",
    }
    should_save_config = not _config_path.exists()

    for name, default_value in configured_values.items():
        current_value = defaults.get(name)
        if current_value is None or (name in required_values and not current_value.strip()):
            defaults[name] = default_value
            should_save_config = True

    if should_save_config:
        _config_path.parent.mkdir(parents=True, exist_ok=True)
        with _config_path.open("w", encoding="utf-8") as file:
            parser.write(file)

    workspaces_path = Path(_settings.workspaces_config_path)
    workspaces = Workspace.load_all(workspaces_path)
    workspaces.setdefault(DEFAULT_WORKSPACE_ID, Workspace.default())
    serialized_workspaces = {
        workspace_id: workspace.to_dict()
        for workspace_id, workspace in workspaces.items()
    }
    should_save_workspaces = not workspaces_path.exists()
    if not should_save_workspaces:
        with workspaces_path.open(encoding="utf-8") as file:
            should_save_workspaces = json.load(file) != serialized_workspaces
    if should_save_workspaces:
        Workspace.save_all(workspaces, workspaces_path)

    for workspace in workspaces.values():
        workspace.initialize()


class Config:
    """Backward-compatible application settings namespace."""

    # Flask configuration
    HOST: ClassVar[str] = _settings.host
    PORT: ClassVar[int] = _settings.port

    # Authentication
    USERNAME: ClassVar[str] = _settings.username
    PASSWORD: ClassVar[str] = _settings.password

    # Workspace settings
    WORKSPACES_CONFIG_PATH: ClassVar[str] = _settings.workspaces_config_path
    DEFAULT_WORKSPACE_ID: ClassVar[str] = DEFAULT_WORKSPACE_ID
    DEFAULT_WORKING_DIR: ClassVar[str] = _settings.default_working_dir
    DEFAULT_TEX_FILENAME: ClassVar[str] = _settings.default_tex_filename
    DEFAULT_COMPILE_CMD: ClassVar[str] = _settings.default_compile_cmd

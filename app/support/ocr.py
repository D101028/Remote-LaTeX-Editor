from __future__ import annotations

import os
from typing import TYPE_CHECKING

from app.config import Config

if TYPE_CHECKING:
    from PIL.Image import Image

prompt = """
Recognize the hand written math expressions and translate it into latex code without any other explanations or Markdown tag (e.g. ```latex).
You should contains the dollar mark $...$ (or $$...$$ for new line) to specify the math formula/expression block.
"""

def ocr(img: Image) -> str | None:
    from google import genai

    with genai.Client(api_key=os.environ["GEMINI_API_KEY"].strip()) as client:
        response = client.models.generate_content(
            model=Config.OCR_MODEL,
            contents=[img, prompt],
        )

    return (response.text or "").strip()

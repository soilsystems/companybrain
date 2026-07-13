from __future__ import annotations

import hashlib
import io
from dataclasses import dataclass

from PIL import Image, ImageOps, UnidentifiedImageError


@dataclass(frozen=True)
class ConversionArtifact:
    content: bytes
    mime_type: str
    checksum_sha256: str
    converter: str
    source_checksum_sha256: str


class SafeImageConverter:
    max_pixels = 50_000_000

    def normalize(
        self, content: bytes, source_checksum: str, target_mime: str = "image/png"
    ) -> ConversionArtifact:
        try:
            with Image.open(io.BytesIO(content)) as source:
                width, height = source.size
                if width * height > self.max_pixels:
                    raise ValueError("image_pixel_limit")
                source.verify()
            with Image.open(io.BytesIO(content)) as source:
                normalized = ImageOps.exif_transpose(source)
                if normalized.mode not in {"RGB", "RGBA", "L"}:
                    normalized = normalized.convert("RGB")
                output = io.BytesIO()
                format_name = "JPEG" if target_mime == "image/jpeg" else "PNG"
                if format_name == "JPEG" and normalized.mode != "RGB":
                    normalized = normalized.convert("RGB")
                normalized.save(output, format=format_name, optimize=True)
        except (UnidentifiedImageError, OSError) as exc:
            raise ValueError("corrupt_file") from exc
        converted = output.getvalue()
        return ConversionArtifact(
            content=converted,
            mime_type=target_mime,
            checksum_sha256=hashlib.sha256(converted).hexdigest(),
            converter=f"Pillow/{Image.__version__}",
            source_checksum_sha256=source_checksum,
        )

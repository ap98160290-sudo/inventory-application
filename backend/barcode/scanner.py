import zxingcpp
import cv2
import numpy as np
from fastapi import UploadFile, HTTPException


def decode_zxing(image: np.ndarray) -> str | None:
    """Works directly on BGR numpy array — no DLL needed."""
    results = zxingcpp.read_barcodes(image)
    for r in results:
        if r.text:
            return r.text
    return None


def get_variants(image: np.ndarray) -> list[np.ndarray]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    clahe_img = clahe.apply(gray)

    _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    _, otsu_clahe = cv2.threshold(clahe_img, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Convert grayscale variants back to BGR for zxing-cpp
    return [
        cv2.cvtColor(otsu, cv2.COLOR_GRAY2BGR),
        cv2.cvtColor(otsu_clahe, cv2.COLOR_GRAY2BGR),
        cv2.cvtColor(clahe_img, cv2.COLOR_GRAY2BGR),
    ]


async def scan_barcode_image(file: UploadFile) -> str:
    content = await file.read()
    image = cv2.imdecode(np.frombuffer(content, np.uint8), cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(status_code=400, detail="Invalid or unreadable image file.")

    # Upscale if too small
    h, w = image.shape[:2]
    if h < 300 or w < 300:
        scale = max(300 / h, 300 / w)
        image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    # Try original image first
    result = decode_zxing(image)
    if result:
        print(f"Detected: {result}")
        return result

    # Try preprocessed variants
    for variant in get_variants(image):
        result = decode_zxing(variant)
        if result:
            print(f"Detected (variant): {result}")
            return result

    raise HTTPException(status_code=422, detail="No barcode or QR code detected")